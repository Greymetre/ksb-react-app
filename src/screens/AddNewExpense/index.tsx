import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import Toast from 'react-native-toast-message';
import { styles } from './styles';
import { rw } from '../../utils/responsive';
import AppText from '../../components/AppText/AppText';
import { ArrowDownIcon, CalenderIcon, CrossIcon } from '../../assets/svgs/SvgsFile';
import { UploadIcon } from '../../assets/svgs/HomePageSvgs';
import { colors } from '../../utils/Colors';
import { expenseApi, normalizeExpenseType } from '../../api/expenseApi';

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

const apiDate = (date: Date) => {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

const parseDate = (value?: string | null) => {
  const parts = String(value || '').slice(0, 10).split('-');
  if (parts.length !== 3) return new Date();
  const parsed = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const toNumber = (value: string | number | null | undefined) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const AddNewExpense = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const editing = route.params?.expense ?? null;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [me, setMe] = useState<any>(null);
  const [types, setTypes] = useState<any[]>([]);

  const [typeId, setTypeId] = useState<number | null>(editing?.expensesType ?? null);
  const [date, setDate] = useState<Date>(editing ? parseDate(editing.date) : new Date());
  const [startKm, setStartKm] = useState<string>(editing?.startKm ? String(editing.startKm) : '');
  const [stopKm, setStopKm] = useState<string>(editing?.stopKm ? String(editing.stopKm) : '');
  const [amount, setAmount] = useState<string>(editing?.claimAmount ? String(editing.claimAmount) : '');
  const [note, setNote] = useState<string>(editing?.note ?? '');
  const [files, setFiles] = useState<any[]>([]);
  // Files already stored on the expense being edited; removed through the API.
  const [existing, setExisting] = useState<any[]>(editing?.attachments ?? []);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);

  const [typeOpen, setTypeOpen] = useState(false);
  const [showDate, setShowDate] = useState(false);

  const selectedType = useMemo(
    () => types.find(type => type.id === typeId) ?? null,
    [types, typeId],
  );
  const isTravelling = !!selectedType?.isTravelling;
  const hasGrade = me?.has_grade !== false;

  useEffect(() => {
    expenseApi
      .options()
      .then(response => {
        const options = response.data?.options || {};
        setMe(options.me ?? null);
        setTypes((options.my_expense_types || []).map(normalizeExpenseType));
      })
      .catch((error: any) => {
        Toast.show({
          type: 'error',
          text1: error?.response?.data?.message || 'Could not load expense types',
          position: 'top',
        });
      })
      .finally(() => setLoading(false));
  }, []);

  /**
   * The server is the authority on the claim amount; this only mirrors its rule so
   * the field shows the right figure before submitting.
   */
  const totalKm = useMemo(() => {
    const start = toNumber(startKm);
    const stop = toNumber(stopKm);
    if (start === null || stop === null || stop < start) return null;
    return stop - start;
  }, [startKm, stopKm]);

  useEffect(() => {
    if (!selectedType) return;
    if (selectedType.isTravelling) {
      setAmount(totalKm === null ? '' : String(Math.round(totalKm * selectedType.rate * 100) / 100));
      return;
    }
    setStartKm('');
    setStopKm('');
    if (selectedType.rate > 0) setAmount(String(selectedType.rate));
  }, [selectedType, totalKm]);

  const openDatePicker = useCallback(() => {
    setShowDate(open => !open);
  }, []);

  const onPickDate = useCallback((_: any, picked?: Date) => {
    // Android shows a native dialog that closes itself; iOS keeps the panel open.
    if (Platform.OS === 'android') setShowDate(false);
    if (picked) setDate(picked);
  }, []);

  const pickFrom = useCallback((source: 'camera' | 'gallery') => {
    setSourceOpen(false);
    const options = { mediaType: 'photo' as const, quality: 0.9 as const };
    const handler = (response: any) => {
      if (response.didCancel) return;
      if (response.errorCode) {
        Toast.show({
          type: 'error',
          text1:
            response.errorCode === 'camera_unavailable'
              ? 'Camera is not available'
              : 'Permission denied',
          position: 'top',
        });
        return;
      }

      const assets = response.assets || [];
      const tooBig = assets.find((asset: any) => (asset.fileSize || 0) > MAX_ATTACHMENT_BYTES);
      if (tooBig) {
        Toast.show({ type: 'error', text1: 'Each file must be under 5 MB', position: 'top' });
        return;
      }

      setFiles(old => [
        ...old,
        ...assets.map((asset: any) => ({
          uri: asset.uri,
          name: asset.fileName || `expense-${Date.now()}.jpg`,
          type: asset.type || 'image/jpeg',
        })),
      ]);
    };

    if (source === 'camera') {
      launchCamera({ ...options, saveToPhotos: false }, handler);
      return;
    }
    launchImageLibrary({ ...options, selectionLimit: 0 }, handler);
  }, []);

  const removeExisting = useCallback(
    (file: any) => {
      if (!editing?.id) return;
      Alert.alert('Remove attachment?', file.fileName, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setRemovingId(file.id);
            try {
              const response = await expenseApi.removeAttachment(editing.id, file.id);
              const left = response.data?.expense?.attachments;
              setExisting(
                Array.isArray(left) ? left : old => old.filter((x: any) => x.id !== file.id),
              );
              Toast.show({
                type: 'success',
                text1: response.data?.message || 'Attachment removed',
                position: 'top',
              });
            } catch (error: any) {
              Toast.show({
                type: 'error',
                text1: error?.response?.data?.message || 'Could not remove the attachment',
                position: 'top',
              });
            } finally {
              setRemovingId(null);
            }
          },
        },
      ]);
    },
    [editing],
  );

  const submit = useCallback(async () => {
    if (!hasGrade) {
      Toast.show({
        type: 'error',
        text1: 'Your payroll grade is not set. Ask an administrator to assign one.',
        position: 'top',
      });
      return;
    }
    if (!typeId) {
      Toast.show({ type: 'error', text1: 'Select an expense type', position: 'top' });
      return;
    }
    if (isTravelling && totalKm === null) {
      Toast.show({
        type: 'error',
        text1: 'Enter valid Start Km and Stop Km. Stop Km cannot be less than Start Km.',
        position: 'top',
      });
      return;
    }
    if (!isTravelling && !toNumber(amount)) {
      Toast.show({ type: 'error', text1: 'Enter the claim amount', position: 'top' });
      return;
    }

    const payload = {
      expenses_type: typeId,
      date: apiDate(date),
      ...(isTravelling ? { start_km: startKm, stop_km: stopKm } : { claim_amount: amount }),
      ...(note ? { note } : {}),
    };

    setSaving(true);
    try {
      const response = editing
        ? await expenseApi.update(editing.id, payload, files)
        : await expenseApi.create(payload, files);
      Toast.show({
        type: 'success',
        text1: response.data?.message || 'Expense submitted',
        position: 'top',
      });
      navigation.goBack();
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: error?.response?.data?.message || 'Could not submit the expense',
        position: 'top',
      });
    } finally {
      setSaving(false);
    }
  }, [hasGrade, typeId, isTravelling, totalKm, amount, date, startKm, stopKm, note, files, editing, navigation]);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.blue} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={[styles.container, { paddingHorizontal: rw(18), paddingTop: 20 }]}>
        {!hasGrade ? (
          <View style={styles.noticeBox}>
            <AppText size={14} color="#C25050" family="InterSemiBold">
              Your payroll grade is not set
            </AppText>
            <AppText size={13} color="#8A5A5A" family="InterRegular">
              Expense types and rates are decided by your grade. Ask an administrator to
              assign a grade before adding an expense.
            </AppText>
          </View>
        ) : null}

        <View style={styles.sectionContent}>
          <AppText size={16} color="#000000" family="InterSemiBold">
            Select Expense Type
          </AppText>
          <Pressable
            style={[styles.UserBox, styles.row]}
            disabled={!hasGrade}
            onPress={() => setTypeOpen(true)}
          >
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <AppText
                size={14}
                color={selectedType ? '#000000' : '#718096'}
                family="InterRegular"
                numLines={1}
              >
                {selectedType
                  ? `${selectedType.name} · ${selectedType.allowanceTypeName}`
                  : hasGrade
                  ? 'Select expense type'
                  : 'Grade not set'}
              </AppText>
            </View>
            <ArrowDownIcon color={'#000000'} />
          </Pressable>

          <AppText size={16} color="#000000" family="InterSemiBold">
            Select Expense Date
          </AppText>
          <Pressable style={[styles.UserBox, styles.row]} onPress={openDatePicker}>
            <View style={{ flex: 1, flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <CalenderIcon color={'#3C3C3C'} />
              <AppText size={14} color="#000000" family="InterRegular">
                {apiDate(date)}
              </AppText>
            </View>
            <ArrowDownIcon color={'#000000'} />
          </Pressable>

          {/* iOS renders the picker wherever it sits, so it gets its own panel
              right under the field instead of floating at a screen corner. */}
          {showDate && Platform.OS === 'ios' ? (
            <View style={styles.calendarPanel}>
              <DateTimePicker
                value={date}
                mode="date"
                display="inline"
                themeVariant="light"
                maximumDate={new Date()}
                style={{ alignSelf: 'stretch' }}
                onChange={onPickDate}
              />
              <Pressable style={styles.rangeDone} onPress={() => setShowDate(false)}>
                <AppText size={13} color="white" family="InterSemiBold">
                  Done
                </AppText>
              </Pressable>
            </View>
          ) : null}

          <AppText size={16} color="#000000" family="InterSemiBold">
            Rate
          </AppText>
          <View style={[styles.UserBox, styles.row, styles.readOnlyBox]}>
            <AppText size={14} color="#718096" family="InterRegular">
              {selectedType
                ? `₹ ${selectedType.rate}${selectedType.isTravelling ? ' per km' : ''}`
                : '-'}
            </AppText>
          </View>

          {isTravelling ? (
            <>
              <AppText size={16} color="#000000" family="InterSemiBold">
                Start Km
              </AppText>
              <View style={[styles.UserBox, styles.row]}>
                <TextInput
                  style={styles.input}
                  value={startKm}
                  onChangeText={setStartKm}
                  keyboardType="numeric"
                  placeholder="km"
                  placeholderTextColor="#718096"
                />
              </View>

              <AppText size={16} color="#000000" family="InterSemiBold">
                Stop Km
              </AppText>
              <View style={[styles.UserBox, styles.row]}>
                <TextInput
                  style={styles.input}
                  value={stopKm}
                  onChangeText={setStopKm}
                  keyboardType="numeric"
                  placeholder="km"
                  placeholderTextColor="#718096"
                />
              </View>

              <AppText size={16} color="#000000" family="InterSemiBold">
                Total Km
              </AppText>
              <View style={[styles.UserBox, styles.row, styles.readOnlyBox]}>
                <AppText size={14} color="#718096" family="InterRegular">
                  {totalKm === null ? 'km' : `${totalKm} km`}
                </AppText>
              </View>
            </>
          ) : null}

          <AppText size={16} color="#000000" family="InterSemiBold">
            Claim Amount
          </AppText>
          {isTravelling || (selectedType?.rate ?? 0) > 0 ? (
            <View style={[styles.UserBox, styles.row, styles.readOnlyBox]}>
              <AppText size={14} color={colors.blue} family="InterSemiBold">
                ₹ {amount || '0.0'}
              </AppText>
            </View>
          ) : (
            <View style={[styles.UserBox, styles.row]}>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder="₹ 0.0"
                placeholderTextColor="#718096"
              />
            </View>
          )}

          <AppText size={16} color="#000000" family="InterSemiBold">
            Note
          </AppText>
          <View style={[styles.UserBox, styles.row]}>
            <TextInput
              style={styles.input}
              value={note}
              onChangeText={setNote}
              placeholder="Optional"
              placeholderTextColor="#718096"
            />
          </View>
        </View>

        <View
          style={[
            styles.sectionContent,
            { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
          ]}
        >
          <Pressable style={styles.uploadBox} onPress={() => setSourceOpen(true)}>
            <UploadIcon width={24} height={24} />
            <AppText size={13} color={'#64748B'} family="InterMedium">
              Upload
            </AppText>
          </Pressable>
          <View style={{ gap: 3, flex: 1 }}>
            <AppText size={16} color="#000000" family="InterSemiBold" horizontal={6}>
              Expense Attachment
            </AppText>
            <AppText size={12} color="#C25050" family="InterRegular" horizontal={6}>
              {files.length ? `${files.length} file selected` : 'Camera or gallery · up to 5 MB'}
            </AppText>
          </View>
        </View>

        {existing.length ? (
          <View style={[styles.sectionContent, { marginTop: 8, gap: 10 }]}>
            <AppText size={14} color="#000000" family="InterSemiBold">
              Uploaded Attachments
            </AppText>
            <View style={styles.existingRow}>
              {existing.map((file: any) => (
                <View key={file.id} style={styles.existingItem}>
                  {String(file.mimeType || '').startsWith('image/') ? (
                    <Image source={{ uri: file.url }} style={styles.existingThumb} />
                  ) : (
                    <View style={[styles.existingThumb, styles.existingDoc]}>
                      <AppText size={13} color={colors.blue} family="InterBold">
                        PDF
                      </AppText>
                    </View>
                  )}
                  <Pressable
                    style={styles.existingRemove}
                    hitSlop={8}
                    disabled={removingId === file.id}
                    onPress={() => removeExisting(file)}
                  >
                    <AppText size={12} color="white" family="InterBold">
                      {removingId === file.id ? '…' : '×'}
                    </AppText>
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {files.length ? (
          <View style={[styles.sectionContent, { marginTop: 8, gap: 8 }]}>
            {files.map((file, index) => (
              <View
                key={`${file.name}-${index}`}
                style={[styles.row, { justifyContent: 'space-between' }]}
              >
                <AppText size={13} color="#333333" family="InterMedium" numLines={1}>
                  {file.name}
                </AppText>
                <Pressable onPress={() => setFiles(old => old.filter((_, i) => i !== index))}>
                  <CrossIcon color={'#C25050'} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}

        <Pressable
          style={[styles.buttonView, (!hasGrade || saving) && { opacity: 0.6 }]}
          disabled={!hasGrade || saving}
          onPress={submit}
        >
          <AppText color="white" family="InterBold" size={16}>
            {saving ? 'PLEASE WAIT...' : editing ? 'UPDATE' : 'SUBMIT'}
          </AppText>
        </Pressable>
      </ScrollView>

      <Modal
        visible={sourceOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSourceOpen(false)}
      >
        <Pressable style={styles.selectOverlay} onPress={() => setSourceOpen(false)}>
          <View style={styles.selectSheet}>
            <AppText size={16} color="black" family="InterSemiBold">
              Add attachment
            </AppText>
            <Pressable style={styles.selectRow} onPress={() => pickFrom('camera')}>
              <AppText size={15} color="#333333" family="InterMedium">
                Take a photo
              </AppText>
            </Pressable>
            <Pressable style={styles.selectRow} onPress={() => pickFrom('gallery')}>
              <AppText size={15} color="#333333" family="InterMedium">
                Choose from gallery
              </AppText>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={typeOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setTypeOpen(false)}
      >
        <Pressable style={styles.selectOverlay} onPress={() => setTypeOpen(false)}>
          <View style={styles.selectSheet}>
            <AppText size={16} color="black" family="InterSemiBold">
              Expense type {me?.payroll_name ? `· ${me.payroll_name}` : ''}
            </AppText>
            <ScrollView style={{ maxHeight: 380, marginTop: 8 }}>
              {types.length ? (
                types.map(type => (
                  <Pressable
                    key={type.id}
                    style={styles.selectRow}
                    onPress={() => {
                      setTypeId(type.id);
                      setTypeOpen(false);
                    }}
                  >
                    <AppText
                      size={15}
                      color={typeId === type.id ? colors.blue : '#333333'}
                      family="InterMedium"
                    >
                      {typeId === type.id ? '✓  ' : '    '}
                      {type.name} · ₹{type.rate}
                      {type.isTravelling ? '/km' : ''} · {type.allowanceTypeName}
                    </AppText>
                  </Pressable>
                ))
              ) : (
                <AppText size={14} color="#888888" family="InterRegular">
                  No expense types are set up for your grade
                </AppText>
              )}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {showDate && Platform.OS === 'android' ? (
        <DateTimePicker
          value={date}
          mode="date"
          maximumDate={new Date()}
          onChange={onPickDate}
        />
      ) : null}
    </View>
  );
};

export default AddNewExpense;
