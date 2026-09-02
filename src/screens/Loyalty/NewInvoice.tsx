import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import AppText from '../../components/AppText/AppText';
import { colors } from '../../utils/Colors';
import { InvoiceAttachment, InvoiceDealer, InvoiceDetail, InvoiceRetailer, InvoiceScheme, invoiceApi } from '../../api/invoiceApi';
import {
  AttachmentTooLargeError,
  InvoiceAsset,
  MAX_INVOICE_ATTACHMENTS,
  chooseAttachmentSource,
  compressInvoiceAsset,
  isPdfAsset,
  isPickerCancel,
  pickInvoiceAssets,
} from '../../utils/invoiceAttachments';
import { apiErrorMessage } from '../../utils/misc';
import { invoiceFormStyles as styles } from './styles';
import DatePickerModal from './DatePickerModal';

type Picker = 'retailer' | 'dealer' | 'scheme' | null;

const toApiDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const shownDate = (date: Date) =>
  date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

/**
 * Raising an invoice for one of this user's own retailers.
 *
 * The retailer comes first because everything else follows from it: which dealer the
 * invoice belongs to, and which schemes it can be claimed under. Most retailers sit
 * under a single dealer and then the form simply says who it is; only a retailer with
 * both a domestic and an agri dealer has to be asked.
 */
const NewInvoice = ({ navigation, route }: any) => {
  // Arrives from the detail popup when an invoice is being corrected. Only a pending or
  // held invoice ever gets here - the API says so too, not just the screen.
  const editing: InvoiceDetail | undefined = route?.params?.invoice;
  const [retailers, setRetailers] = useState<InvoiceRetailer[]>([]);
  const [retailer, setRetailer] = useState<InvoiceRetailer | null>(
    editing
      ? {
          id: editing.retailerId,
          ownerName: editing.retailerName,
          shopName: editing.shopName,
          mobile: editing.mobile,
          city: editing.city,
          address: null,
        }
      : null,
  );
  const [retailersLoading, setRetailersLoading] = useState(false);
  const [retailersPage, setRetailersPage] = useState(1);
  const [retailersHasMore, setRetailersHasMore] = useState(false);
  const [retailersLoadingMore, setRetailersLoadingMore] = useState(false);

  const [dealers, setDealers] = useState<InvoiceDealer[]>([]);
  const [dealer, setDealer] = useState<InvoiceDealer | null>(null);
  const [dealersLoading, setDealersLoading] = useState(false);

  const [schemes, setSchemes] = useState<InvoiceScheme[]>([]);
  const [scheme, setScheme] = useState<InvoiceScheme | null>(null);

  const [invoiceNumber, setInvoiceNumber] = useState(editing?.invoiceNumber || '');
  const [invoiceDate, setInvoiceDate] = useState(() => {
    const parsed = editing?.invoiceDate ? new Date(editing.invoiceDate) : null;
    return parsed && !Number.isNaN(parsed.getTime()) ? parsed : new Date();
  });
  const [showDate, setShowDate] = useState(false);
  const [amount, setAmount] = useState(editing ? String(editing.amount) : '');
  // Files staged on this screen, plus the ones already saved on an invoice being edited.
  const [assets, setAssets] = useState<InvoiceAsset[]>([]);
  const [saved, setSaved] = useState<InvoiceAttachment[]>(editing?.attachments ?? []);
  const [removedIds, setRemovedIds] = useState<number[]>([]);
  const [processing, setProcessing] = useState(false);

  const [picker, setPicker] = useState<Picker>(null);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [overlayHeight, setOverlayHeight] = useState(0);

  /* A sheet pinned to the bottom of a Modal ends up behind the keyboard - you type a name
     and cannot see what came back. The keyboard's height is tracked here so the sheet can
     sit on top of it. */
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = Keyboard.addListener(showEvent, event => setKeyboardHeight(event.endCoordinates?.height || 0));
    const onHide = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, []);

  /* iOS never resizes a modal for the keyboard, so the sheet has to be lifted by its full
     height. Android may or may not, depending on whether the modal's window honours the
     activity's adjustResize - so rather than guessing per platform, the overlay measures
     itself: if it has already shrunk, the keyboard has been accounted for and lifting the
     sheet again would push it into the middle of the screen. */
  const windowHeight = Dimensions.get('window').height;
  const overlayAlreadyShrunk = overlayHeight > 0 && overlayHeight < windowHeight - 80;
  const sheetLift = keyboardHeight > 0 && !overlayAlreadyShrunk ? keyboardHeight : 0;

  /** Retailers come a page at a time and the typing is answered by the server, so the
   *  picker opens instantly however many retailers this user can reach. */
  const loadRetailers = useCallback(async (term: string, page: number) => {
    if (page === 1) setRetailersLoading(true);
    else setRetailersLoadingMore(true);
    try {
      const result = await invoiceApi.retailers(term, page);
      setRetailers(old => (page === 1 ? result.items : [...old, ...result.items]));
      setRetailersHasMore(result.hasMore);
      setRetailersPage(page);
    } catch (error) {
      Toast.show({ type: 'error', position: 'top', text1: apiErrorMessage(error, 'Unable to load your retailers') });
      if (page === 1) setRetailers([]);
    } finally {
      setRetailersLoading(false);
      setRetailersLoadingMore(false);
    }
  }, []);

  // Only while the picker is open, and never on every keystroke.
  useEffect(() => {
    if (picker !== 'retailer') return;
    const timer = setTimeout(() => loadRetailers(search, 1), 300);
    return () => clearTimeout(timer);
  }, [picker, search, loadRetailers]);

  // A retailer decides its dealers. One of them and there is nothing to ask.
  useEffect(() => {
    setDealers([]);
    setDealer(null);
    if (!retailer) return;
    setDealersLoading(true);
    invoiceApi
      .dealers(retailer.id)
      .then(rows => {
        setDealers(rows);
        // One dealer needs no asking; on an edit, keep the one the invoice already carries.
        const existing = editing ? rows.find(row => row.id === editing.dealerId) : undefined;
        if (existing) setDealer(existing);
        else if (rows.length === 1) setDealer(rows[0]);
      })
      .catch(error => Toast.show({ type: 'error', position: 'top', text1: apiErrorMessage(error, 'Unable to load dealers') }))
      .finally(() => setDealersLoading(false));
  }, [retailer]);

  useEffect(() => {
    setScheme(null);
    setSchemes([]);
    if (!retailer) return;
    invoiceApi
      .schemes(retailer.id, toApiDate(invoiceDate))
      .then(rows => {
        setSchemes(rows);
        if (editing?.schemeId) setScheme(rows.find(row => row.id === editing.schemeId) || null);
      })
      .catch(error => Toast.show({ type: 'error', position: 'top', text1: apiErrorMessage(error, 'Unable to load schemes') }));
  }, [retailer, invoiceDate]);

  const attachmentCount = saved.length + assets.length;

  const addAttachments = useCallback(
    async (source: 'camera' | 'gallery' | 'file') => {
      const room = MAX_INVOICE_ATTACHMENTS - (saved.length + assets.length);
      if (room <= 0) {
        Toast.show({ type: 'error', position: 'top', text1: `At most ${MAX_INVOICE_ATTACHMENTS} attachments` });
        return;
      }

      setProcessing(true);
      try {
        const picked = await pickInvoiceAssets(source, room);
        for (const file of picked) {
          try {
            // Anything over the limit is shrunk here, so a big photo never leaves the
            // phone; only a file that stays too big afterwards is refused.
            const ready = await compressInvoiceAsset(file);
            setAssets(old => [...old, ready]);
          } catch (error: any) {
            Toast.show({
              type: 'error',
              position: 'top',
              text1: error instanceof AttachmentTooLargeError ? error.message : 'Could not process that file',
            });
          }
        }
      } catch (error: any) {
        if (!isPickerCancel(error)) {
          Toast.show({ type: 'error', position: 'top', text1: error?.message || 'Could not open the picker' });
        }
      } finally {
        setProcessing(false);
      }
    },
    [assets.length, saved.length],
  );

  const chooseAttachment = () => chooseAttachmentSource(addAttachments);

  const removeStaged = (index: number) => setAssets(old => old.filter((_, position) => position !== index));

  const removeSaved = (file: InvoiceAttachment) => {
    setSaved(old => old.filter(item => item !== file));
    // Id 0 is the legacy single-attachment column - there is no row for the API to drop.
    if (file.id > 0) setRemovedIds(old => [...old, file.id]);
  };

  const submit = async () => {
    if (!retailer) return Toast.show({ type: 'error', position: 'top', text1: 'Please select a retailer' });
    if (dealers.length > 1 && !dealer)
      return Toast.show({ type: 'error', position: 'top', text1: 'This retailer has more than one dealer - select one' });
    if (!invoiceNumber.trim()) return Toast.show({ type: 'error', position: 'top', text1: 'Invoice number is required' });
    if (!scheme) return Toast.show({ type: 'error', position: 'top', text1: 'Please select a scheme' });
    if (!(Number(amount) > 0)) return Toast.show({ type: 'error', position: 'top', text1: 'Amount must be greater than 0' });
    if (processing) return Toast.show({ type: 'error', position: 'top', text1: 'Attachments are still being processed' });
    if (attachmentCount === 0) return Toast.show({ type: 'error', position: 'top', text1: 'Invoice attachment is required' });

    setSaving(true);
    try {
      const payload = {
        retailerId: retailer.id,
        dealerId: dealer?.id || null,
        schemeId: scheme.id,
        invoiceNumber: invoiceNumber.trim(),
        invoiceDate: toApiDate(invoiceDate),
        amount: Number(amount),
      };

      if (editing) {
        await invoiceApi.update(editing.id, { ...payload, attachments: assets, removedAttachmentIds: removedIds });
        Toast.show({ type: 'success', position: 'top', text1: 'Invoice updated - it goes back for review' });
      } else {
        await invoiceApi.create({ ...payload, attachments: assets });
        Toast.show({ type: 'success', position: 'top', text1: 'Invoice created successfully' });
      }
      navigation.goBack();
    } catch (error) {
      // Whatever the API objected to - a duplicate number for that dealer, an ineligible
      // scheme - is what the person filling the form needs to read, not a generic line.
      Toast.show({
        type: 'error',
        position: 'top',
        text1: apiErrorMessage(error, editing ? 'Could not update the invoice' : 'Could not create the invoice'),
      });
    } finally {
      setSaving(false);
    }
  };

  const options: any[] = picker === 'retailer' ? retailers : picker === 'dealer' ? dealers : schemes;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <AppText size={12} family="InterSemiBold" color="black" opacity={0.5} style={styles.label}>RETAILER *</AppText>
          <Pressable style={styles.field} onPress={() => { setPicker('retailer'); setSearch(''); }}>
            <AppText size={13.5} family="InterMedium" color="black" opacity={retailer ? 0.9 : 0.35} numLines={1}>
              {retailer ? `${retailer.ownerName} · ${retailer.shopName}` : 'Select retailer'}
            </AppText>
            <AppText size={13} color="black" opacity={0.4}>⌄</AppText>
          </Pressable>

          {retailer ? (
            <View style={{ marginTop: 16 }}>
              <AppText size={12} family="InterSemiBold" color="black" opacity={0.5} style={styles.label}>
                {dealers.length > 1 ? 'DEALER *' : 'DEALER'}
              </AppText>

              {dealersLoading ? (
                <View style={[styles.field, { justifyContent: 'flex-start' }]}>
                  <ActivityIndicator size="small" color={colors.blue} />
                </View>
              ) : dealers.length > 1 ? (
                <Pressable style={styles.field} onPress={() => setPicker('dealer')}>
                  <AppText size={13.5} family="InterMedium" color="black" opacity={dealer ? 0.9 : 0.35} numLines={1}>
                    {dealer ? dealer.firmName : 'This retailer has more than one dealer - select one'}
                  </AppText>
                  <AppText size={13} color="black" opacity={0.4}>⌄</AppText>
                </Pressable>
              ) : dealer ? (
                <View style={styles.dealerFixed}>
                  <View style={styles.dealerBadge}>
                    <AppText size={14} family="InterSemiBold" customColor={colors.blue}>
                      {(dealer.firmName || 'D').charAt(0).toUpperCase()}
                    </AppText>
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText size={13.5} family="InterSemiBold" color="black" numLines={1}>{dealer.firmName}</AppText>
                    {dealer.name && dealer.name !== dealer.firmName ? (
                      <AppText size={11} color="black" opacity={0.5} numLines={1}>{dealer.name}</AppText>
                    ) : null}
                    {dealer.code ? <AppText size={11} color="black" opacity={0.5}>Code: {dealer.code}</AppText> : null}
                  </View>
                </View>
              ) : (
                <View style={styles.field}>
                  <AppText size={12.5} color="black" opacity={0.4}>No dealer is mapped to this retailer</AppText>
                </View>
              )}
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <AppText size={12} family="InterSemiBold" color="black" opacity={0.5} style={styles.label}>INVOICE NUMBER *</AppText>
          <View style={styles.field}>
            <TextInput
              value={invoiceNumber}
              onChangeText={setInvoiceNumber}
              placeholder="Enter invoice number"
              placeholderTextColor="#9AA5B1"
              style={styles.input}
            />
          </View>

          <View style={[styles.row, { marginTop: 16 }]}>
            <View style={styles.half}>
              <AppText size={12} family="InterSemiBold" color="black" opacity={0.5} style={styles.label}>INVOICE DATE *</AppText>
              <Pressable style={styles.field} onPress={() => setShowDate(true)}>
                <AppText size={13.5} family="InterMedium" color="black" opacity={0.9}>{shownDate(invoiceDate)}</AppText>
              </Pressable>
            </View>
            <View style={styles.half}>
              <AppText size={12} family="InterSemiBold" color="black" opacity={0.5} style={styles.label}>PRE-GST AMOUNT *</AppText>
              <View style={styles.field}>
                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  placeholder="₹ 0"
                  placeholderTextColor="#9AA5B1"
                  style={styles.input}
                />
              </View>
            </View>
          </View>
          <AppText size={10.5} color="black" opacity={0.45} style={{ marginTop: 6 }}>
            Enter the pre-GST invoice amount only. Do not include GST.
          </AppText>

          <AppText size={12} family="InterSemiBold" color="black" opacity={0.5} style={[styles.label, { marginTop: 16 }]}>SCHEME *</AppText>
          <Pressable style={styles.field} onPress={() => retailer && schemes.length > 0 && setPicker('scheme')}>
            <AppText size={13.5} family="InterMedium" color="black" opacity={scheme ? 0.9 : 0.35} numLines={1}>
              {!retailer ? 'First select a retailer' : scheme ? scheme.name : schemes.length ? 'Select eligible scheme' : 'No eligible scheme for this date'}
            </AppText>
            <AppText size={13} color="black" opacity={0.4}>⌄</AppText>
          </Pressable>
        </View>

        <View style={styles.card}>
          <AppText size={12} family="InterSemiBold" color="black" opacity={0.5} style={styles.label}>
            {editing ? 'INVOICE ATTACHMENTS' : 'INVOICE ATTACHMENTS *'}
          </AppText>

          {attachmentCount > 0 ? (
            <View style={styles.attachmentGrid}>
              {saved.map(file => (
                <View key={`saved-${file.id}-${file.url}`} style={styles.attachmentTile}>
                  {isPdfAsset({ type: file.mimeType, name: file.fileName || file.url }) ? (
                    <View style={styles.attachmentDoc}>
                      <AppText size={22}>📄</AppText>
                      <AppText size={10} color="black" opacity={0.55}>PDF</AppText>
                    </View>
                  ) : (
                    <Image source={{ uri: file.url }} style={styles.attachmentImage} resizeMode="cover" />
                  )}
                  <Pressable style={styles.attachmentRemove} onPress={() => removeSaved(file)} hitSlop={8}>
                    <AppText size={12} color="white" family="InterSemiBold">×</AppText>
                  </Pressable>
                </View>
              ))}

              {assets.map((file, index) => (
                <View key={`new-${file.uri}-${index}`} style={styles.attachmentTile}>
                  {isPdfAsset(file) ? (
                    <View style={styles.attachmentDoc}>
                      <AppText size={22}>📄</AppText>
                      <AppText size={10} color="black" opacity={0.55}>PDF</AppText>
                    </View>
                  ) : (
                    <Image source={{ uri: file.uri }} style={styles.attachmentImage} resizeMode="cover" />
                  )}
                  <Pressable style={styles.attachmentRemove} onPress={() => removeStaged(index)} hitSlop={8}>
                    <AppText size={12} color="white" family="InterSemiBold">×</AppText>
                  </Pressable>
                </View>
              ))}

              {attachmentCount < MAX_INVOICE_ATTACHMENTS ? (
                <Pressable style={styles.attachmentAdd} onPress={chooseAttachment} disabled={processing}>
                  <AppText size={22} customColor={colors.blue}>+</AppText>
                  <AppText size={10} family="InterSemiBold" customColor={colors.blue}>Add</AppText>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <Pressable style={styles.upload} onPress={chooseAttachment} disabled={processing}>
              <AppText size={26}>📎</AppText>
              <AppText size={13} family="InterSemiBold" customColor={colors.blue}>Add invoice attachment</AppText>
              <AppText size={11} color="black" opacity={0.45}>Camera, gallery or a PDF from Files</AppText>
            </Pressable>
          )}

          <AppText size={11} color="black" opacity={0.45} style={{ marginTop: 8 }}>
            {processing
              ? 'Processing attachment...'
              : `${attachmentCount} of ${MAX_INVOICE_ATTACHMENTS} added. Images are compressed to 5 MB, PDFs must be 10 MB or less.`}
          </AppText>
        </View>
      </ScrollView>

      <View style={styles.submitBar}>
        <Pressable style={[styles.submit, saving && { opacity: 0.6 }]} onPress={submit} disabled={saving}>
          <AppText size={14.5} family="InterSemiBold" color="white">
            {saving ? 'Saving...' : editing ? 'Update Invoice' : 'Submit Invoice'}
          </AppText>
        </Pressable>
      </View>

      <DatePickerModal
        visible={showDate}
        value={invoiceDate}
        onSelect={setInvoiceDate}
        onClose={() => setShowDate(false)}
      />

      <Modal visible={picker !== null} transparent animationType="slide" onRequestClose={() => setPicker(null)}>
        <View style={styles.overlay} onLayout={event => setOverlayHeight(event.nativeEvent.layout.height)}>
          <Pressable
            style={styles.backdrop}
            onPress={() => {
              Keyboard.dismiss();
              setPicker(null);
            }}
          />
          <View style={[styles.sheet, sheetLift > 0 && [{ marginBottom: sheetLift }, styles.sheetWithKeyboard]]}>
            <AppText size={16} family="InterSemiBold" color="black" style={{ marginBottom: 12 }}>
              {picker === 'retailer' ? 'Select retailer' : picker === 'dealer' ? 'Select dealer' : 'Select scheme'}
            </AppText>

            {picker === 'retailer' ? (
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search name, shop or mobile"
                placeholderTextColor="#9AA5B1"
                style={styles.search}
              />
            ) : null}

            {picker === 'retailer' && retailersLoading ? (
              <View style={{ paddingVertical: 30 }}>
                <ActivityIndicator color={colors.blue} />
              </View>
            ) : (
              <FlatList
                data={options}
                keyExtractor={option => String(option.id)}
                style={styles.sheetScroll}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
                initialNumToRender={12}
                windowSize={7}
                removeClippedSubviews
                onEndReachedThreshold={0.4}
                onEndReached={() => {
                  if (picker !== 'retailer' || !retailersHasMore || retailersLoadingMore) return;
                  loadRetailers(search, retailersPage + 1);
                }}
                ListFooterComponent={
                  picker === 'retailer' && retailersLoadingMore ? (
                    <ActivityIndicator color={colors.blue} style={{ marginVertical: 12 }} />
                  ) : null
                }
                ListEmptyComponent={
                  <AppText size={12.5} color="black" opacity={0.45} style={{ paddingVertical: 20 }} align="center">
                    {picker === 'retailer' && search ? 'No retailer matches that search' : 'Nothing to choose from'}
                  </AppText>
                }
                renderItem={({ item: option }: any) => (
                  <Pressable
                    style={styles.option}
                    onPress={() => {
                      Keyboard.dismiss();
                      if (picker === 'retailer') setRetailer(option);
                      else if (picker === 'dealer') setDealer(option);
                      else setScheme(option);
                      setPicker(null);
                      setSearch('');
                    }}>
                    <AppText size={13.5} family="InterMedium" color="black" numLines={1}>
                      {picker === 'retailer' ? option.shopName || option.ownerName : picker === 'dealer' ? option.firmName : option.name}
                    </AppText>
                    <AppText size={11} color="black" opacity={0.5} numLines={1}>
                      {picker === 'retailer'
                        ? [option.ownerName, option.mobile, option.city].filter(Boolean).join(' · ')
                        : picker === 'dealer'
                          ? [option.name, option.code].filter(Boolean).join(' · ')
                          : option.code || ''}
                    </AppText>
                  </Pressable>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

export default NewInvoice;
