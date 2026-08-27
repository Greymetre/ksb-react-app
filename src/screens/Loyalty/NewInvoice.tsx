import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import Toast from 'react-native-toast-message';
import AppText from '../../components/AppText/AppText';
import { colors } from '../../utils/Colors';
import { InvoiceDealer, InvoiceDetail, InvoiceRetailer, InvoiceScheme, invoiceApi } from '../../api/invoiceApi';
import { invoiceFormStyles as styles } from './styles';
import DatePickerModal from './DatePickerModal';

type Picker = 'retailer' | 'dealer' | 'scheme' | null;
type Asset = { uri: string; name: string; type: string };

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

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
  const [asset, setAsset] = useState<Asset | null>(null);

  const [picker, setPicker] = useState<Picker>(null);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

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
    } catch {
      Toast.show({ type: 'error', position: 'top', text1: 'Unable to load your retailers' });
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
      .catch(() => Toast.show({ type: 'error', position: 'top', text1: 'Unable to load dealers' }))
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
      .catch(() => Toast.show({ type: 'error', position: 'top', text1: 'Unable to load schemes' }));
  }, [retailer, invoiceDate]);

  const pickAttachment = useCallback((source: 'camera' | 'gallery') => {
    const options: any = { mediaType: 'photo', quality: 0.8, includeBase64: false };
    const handler = (response: any) => {
      if (response?.didCancel) return;
      if (response?.errorCode) {
        Toast.show({ type: 'error', position: 'top', text1: response.errorMessage || 'Could not open the camera' });
        return;
      }
      const file = (response?.assets || [])[0];
      if (!file) return;
      if ((file.fileSize || 0) > MAX_ATTACHMENT_BYTES) {
        Toast.show({ type: 'error', position: 'top', text1: 'The photo must be under 5 MB' });
        return;
      }
      setAsset({
        uri: file.uri,
        name: file.fileName || `invoice-${Date.now()}.jpg`,
        type: file.type || 'image/jpeg',
      });
    };

    if (source === 'camera') launchCamera({ ...options, saveToPhotos: false }, handler);
    else launchImageLibrary({ ...options, selectionLimit: 1 }, handler);
  }, []);

  const chooseAttachment = () =>
    Alert.alert('Invoice attachment', 'Choose a source', [
      { text: 'Camera', onPress: () => pickAttachment('camera') },
      { text: 'Gallery', onPress: () => pickAttachment('gallery') },
      { text: 'Cancel', style: 'cancel' },
    ]);

  const submit = async () => {
    if (!retailer) return Toast.show({ type: 'error', position: 'top', text1: 'Please select a retailer' });
    if (dealers.length > 1 && !dealer)
      return Toast.show({ type: 'error', position: 'top', text1: 'This retailer has more than one dealer - select one' });
    if (!invoiceNumber.trim()) return Toast.show({ type: 'error', position: 'top', text1: 'Invoice number is required' });
    if (!scheme) return Toast.show({ type: 'error', position: 'top', text1: 'Please select a scheme' });
    if (!(Number(amount) > 0)) return Toast.show({ type: 'error', position: 'top', text1: 'Amount must be greater than 0' });
    // On an edit the invoice already has a photo; a new one is only needed if it is being replaced.
    if (!asset && !editing) return Toast.show({ type: 'error', position: 'top', text1: 'Invoice attachment is required' });

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
        await invoiceApi.update(editing.id, { ...payload, attachment: asset });
        Toast.show({ type: 'success', position: 'top', text1: 'Invoice updated - it goes back for review' });
      } else {
        await invoiceApi.create({ ...payload, attachment: asset! });
        Toast.show({ type: 'success', position: 'top', text1: 'Invoice created successfully' });
      }
      navigation.goBack();
    } catch (error: any) {
      const message = error?.response?.data?.message;
      Toast.show({
        type: 'error',
        position: 'top',
        text1: typeof message === 'string' ? message : editing ? 'Could not update the invoice' : 'Could not create the invoice',
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
              <AppText size={12} family="InterSemiBold" color="black" opacity={0.5} style={styles.label}>AMOUNT (₹) *</AppText>
              <View style={styles.field}>
                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor="#9AA5B1"
                  style={styles.input}
                />
              </View>
            </View>
          </View>
          <AppText size={10.5} color="black" opacity={0.45} style={{ marginTop: 6 }}>
            Enter the pre-GST invoice amount only.
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
            {editing ? 'INVOICE PHOTO' : 'INVOICE PHOTO *'}
          </AppText>
          {asset ? (
            <View>
              <View style={styles.preview}>
                <Image source={{ uri: asset.uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              </View>
              <Pressable onPress={chooseAttachment} style={{ marginTop: 10, alignSelf: 'flex-start' }}>
                <AppText size={12} family="InterSemiBold" customColor={colors.blue}>Change photo</AppText>
              </Pressable>
            </View>
          ) : editing?.attachment ? (
            <View>
              <View style={styles.preview}>
                <Image source={{ uri: editing.attachment }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              </View>
              <Pressable onPress={chooseAttachment} style={{ marginTop: 10, alignSelf: 'flex-start' }}>
                <AppText size={12} family="InterSemiBold" customColor={colors.blue}>Replace photo</AppText>
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.upload} onPress={chooseAttachment}>
              <AppText size={26}>📷</AppText>
              <AppText size={13} family="InterSemiBold" customColor={colors.blue}>Add invoice photo</AppText>
              <AppText size={11} color="black" opacity={0.45}>Camera or gallery, under 5 MB</AppText>
            </Pressable>
          )}
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
        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={() => setPicker(null)} />
          <View style={styles.sheet}>
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
