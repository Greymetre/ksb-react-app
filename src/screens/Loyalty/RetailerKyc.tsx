import React, { useEffect, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Toast from 'react-native-toast-message';
import AppText from '../../components/AppText/AppText';
import AttachmentViewer from '../../components/AttachmentViewer';
import { BRAND_GRADIENT, colors } from '../../utils/Colors';
import { apiErrorMessage } from '../../utils/misc';
import { BANK_ACCOUNT_TYPES } from '../../utils/bankAccountType';
import { AttachmentTooLargeError, compressInvoiceAsset, pickInvoiceAssets } from '../../utils/invoiceAttachments';
import { KycDetails, KycDocKey, KycDocument, KycFieldKey, KycFile, retailerKycApi } from '../../api/retailerKycApi';

type FieldSpec = { key: KycFieldKey; label: string; numeric?: boolean; clean?: (value: string) => string };

const digitsOnly = (value: string) => value.replace(/\D/g, '');
const upper = (value: string) => value.toUpperCase();

// Which numbers belong under which document - read and filled together with its attachment.
const DOC_FIELDS: Record<KycDocKey, FieldSpec[]> = {
  gst: [{ key: 'gstNumber', label: 'GST Number', clean: upper }],
  pan: [{ key: 'panNumber', label: 'PAN Number', clean: upper }],
  aadhar: [{ key: 'aadharNo', label: 'Aadhaar Number', numeric: true, clean: value => digitsOnly(value).slice(0, 12) }],
  bank: [
    { key: 'accountHolderName', label: 'Account Holder' },
    { key: 'bankName', label: 'Bank Name' },
    { key: 'bankAccountType', label: 'Account Type' },
    { key: 'bankAccountNumber', label: 'Account Number', numeric: true, clean: digitsOnly },
    { key: 'ifscCode', label: 'IFSC Code', clean: upper },
  ],
};

const REQUIRED: [KycFieldKey, string][] = [
  ['gstNumber', 'GST Number'],
  ['panNumber', 'PAN Number'],
  ['aadharNo', 'Aadhaar Number'],
  ['accountHolderName', 'Account Holder'],
  ['bankName', 'Bank Name'],
  ['bankAccountType', 'Account Type'],
  ['bankAccountNumber', 'Account Number'],
  ['ifscCode', 'IFSC Code'],
];

const TONE = {
  approved: { fg: '#15803D', bg: '#E7F6EC', border: '#BFE5CB' },
  rejected: { fg: '#B91C1C', bg: '#FDECEC', border: '#F5C2C2' },
  pending: { fg: '#B45309', bg: '#FEF3C7', border: '#F3DDA0' },
};

const formatDate = (value: string) => {
  if (!value) return '';
  const date = new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(value) ? value : `${value.replace(' ', 'T')}Z`);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const isPdfUrl = (url: string) => /\.pdf(\?|$)/i.test(url);

/**
 * One retailer's KYC, opened from the Loyalty screen's KYC tab - the same screen the VRiDDHi
 * dealer login uses. Documents that are pending or rejected can be changed; an approved one
 * is locked here, and the server refuses changes to it as well. Anything changed goes back
 * into the CRM's review.
 */
const RetailerKyc = ({ navigation, route }: any) => {
  const retailerId = route?.params?.retailerId;
  const retailerName: string = route?.params?.retailerName || 'Retailer';
  const [kyc, setKyc] = useState<KycDetails | null>(null);
  const [files, setFiles] = useState<Partial<Record<KycDocKey, KycFile>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [picking, setPicking] = useState<KycDocKey | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({ title: retailerName });
  }, [navigation, retailerName]);

  useEffect(() => {
    retailerKycApi
      .get(retailerId)
      .then(setKyc)
      .catch(error => Toast.show({ type: 'error', position: 'top', text1: apiErrorMessage(error, 'Unable to load KYC details') }))
      .finally(() => setLoading(false));
  }, [retailerId]);

  const update = (key: KycFieldKey, value: string) => setKyc(current => (current ? { ...current, [key]: value } : current));

  const pick = async (key: KycDocKey, source: 'camera' | 'gallery') => {
    if (picking) return;
    setPicking(key);
    try {
      const [asset] = await pickInvoiceAssets(source, 1);
      if (!asset) return;
      const file = await compressInvoiceAsset(asset);
      setFiles(current => ({ ...current, [key]: { uri: file.uri, name: file.name, type: file.type } }));
    } catch (error: any) {
      Alert.alert(
        error instanceof AttachmentTooLargeError ? 'File too large' : source === 'camera' ? 'Camera unavailable' : 'Gallery unavailable',
        error?.message || 'Please try again.',
      );
    } finally {
      setPicking(null);
    }
  };

  const choose = (key: KycDocKey) =>
    Alert.alert('Add attachment', 'Choose a source', [
      { text: 'Camera', onPress: () => pick(key, 'camera') },
      { text: 'Gallery', onPress: () => pick(key, 'gallery') },
      { text: 'Cancel', style: 'cancel' },
    ]);

  const submit = async () => {
    if (!kyc) return;
    const missing = REQUIRED.find(([key]) => !String(kyc[key] ?? '').trim());
    if (missing) {
      Toast.show({ type: 'error', position: 'top', text1: `${missing[1]} is required` });
      return;
    }
    const noFile = kyc.documents.find(doc => !files[doc.key] && !doc.attachmentUrl);
    if (noFile) {
      Toast.show({ type: 'error', position: 'top', text1: `${noFile.title} attachment is required` });
      return;
    }
    setSaving(true);
    try {
      setKyc(await retailerKycApi.update(retailerId, kyc, files));
      setFiles({});
      Toast.show({ type: 'success', position: 'top', text1: 'KYC details submitted for review' });
    } catch (error) {
      Toast.show({ type: 'error', position: 'top', text1: apiErrorMessage(error, 'Unable to update KYC details') });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.navy} />
      </View>
    );
  }

  if (!kyc) {
    return (
      <View style={styles.center}>
        <AppText size={15} family="InterSemiBold" color={colors.navy}>KYC unavailable</AppText>
        <AppText size={12} color="#64748B" style={{ marginTop: 4 }}>Unable to load this retailer's KYC details.</AppText>
      </View>
    );
  }

  const allApproved = kyc.documents.every(doc => doc.status === 'approved');

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.summary}>
          <View style={{ flex: 1 }}>
            <AppText size={10} family="InterBold" color="#64748B" style={{ letterSpacing: 1.6 }}>KYC STATUS</AppText>
            <AppText size={20} family="InterBold" color={colors.primary} style={{ marginTop: 4 }}>
              {allApproved ? 'Approved' : kyc.summary.uploaded > 0 ? 'Pending' : 'Not Started'}
            </AppText>
          </View>
          <View style={styles.stat}>
            <AppText size={18} family="InterBold" color={colors.navy} align="center">{String(kyc.summary.uploaded)}</AppText>
            <AppText size={10} color="#64748B" align="center">Uploaded</AppText>
          </View>
          <View style={styles.stat}>
            <AppText size={18} family="InterBold" color={colors.navy} align="center">{String(kyc.summary.approved)}</AppText>
            <AppText size={10} color="#64748B" align="center">Approved</AppText>
          </View>
        </View>

        {kyc.documents.map(doc => (
          <DocumentCard
            key={doc.key}
            doc={doc}
            kyc={kyc}
            file={files[doc.key]}
            picking={picking === doc.key}
            onPick={() => choose(doc.key)}
            onPreview={setPreview}
            onChange={update}
          />
        ))}

        {allApproved ? (
          <View style={styles.doneNote}>
            <AppText size={13} family="InterSemiBold" color="#15803D" align="center">
              All documents are approved. Nothing left to update.
            </AppText>
          </View>
        ) : (
          <Pressable disabled={saving} onPress={submit} style={({ pressed }) => [styles.submit, (pressed || saving) && { opacity: 0.8 }]}>
            {saving ? <ActivityIndicator color="#fff" /> : <AppText size={14} family="InterBold" color="white" style={{ letterSpacing: 1.5 }}>SUBMIT KYC</AppText>}
          </Pressable>
        )}
      </ScrollView>

      <AttachmentViewer files={preview ? [{ url: preview }] : []} index={preview ? 0 : null} onClose={() => setPreview(null)} />
    </KeyboardAvoidingView>
  );
};

function DocumentCard({
  doc,
  kyc,
  file,
  picking,
  onPick,
  onPreview,
  onChange,
}: {
  doc: KycDocument;
  kyc: KycDetails;
  file?: KycFile;
  picking: boolean;
  onPick: () => void;
  onPreview: (url: string) => void;
  onChange: (key: KycFieldKey, value: string) => void;
}) {
  const locked = doc.status === 'approved';
  const tone = TONE[doc.status];
  const shown = file?.uri || doc.attachmentUrl;
  const reviewed = doc.status !== 'pending' && (doc.actionBy || doc.actionAt);

  return (
    <View style={[styles.card, { borderColor: tone.border }]}>
      <View style={styles.cardTop}>
        <Pressable onPress={() => shown && onPreview(shown)} disabled={!shown} style={styles.thumb}>
          {shown && !isPdfUrl(shown) ? (
            <Image source={{ uri: shown }} style={styles.thumbImage} resizeMode="cover" />
          ) : (
            <View style={[styles.thumbEmpty, shown ? styles.thumbPdf : null]}>
              <AppText size={shown ? 13 : 10} family="InterBold" color={shown ? '#D93A3A' : '#94A3B8'} align="center">
                {shown ? 'PDF' : 'No file'}
              </AppText>
            </View>
          )}
        </Pressable>
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <AppText size={15} family="InterSemiBold" color={colors.navy} style={{ flexShrink: 1 }}>{doc.title}</AppText>
            <View style={[styles.pill, { backgroundColor: tone.bg }]}>
              <AppText size={11} family="InterSemiBold" color={tone.fg}>{doc.statusLabel}</AppText>
            </View>
          </View>
          {reviewed ? (
            <AppText size={11} color="#94A3B8" style={{ marginTop: 4 }}>
              {[`${doc.statusLabel} by ${doc.actionBy || '-'}`, formatDate(doc.actionAt)].filter(Boolean).join(' · ')}
            </AppText>
          ) : null}
          {file ? (
            <AppText size={11} family="InterSemiBold" color={colors.primary} numLines={1} style={{ marginTop: 4 }}>
              ✓ New file: {file.name}
            </AppText>
          ) : null}
          {doc.remark ? (
            <View style={[styles.note, doc.status === 'rejected' && styles.noteRejected]}>
              <AppText size={12} color={doc.status === 'rejected' ? '#991B1B' : '#475569'}>
                <AppText size={12} family="InterSemiBold" color={doc.status === 'rejected' ? '#991B1B' : '#1E293B'}>Note: </AppText>
                {doc.remark}
              </AppText>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable disabled={!shown} onPress={() => shown && onPreview(shown)} style={[styles.viewButton, !shown && { opacity: 0.45 }]}>
          <AppText size={13} family="InterSemiBold" color="white">View</AppText>
        </Pressable>
        {locked ? (
          <View style={styles.locked}>
            <AppText size={12} family="InterSemiBold" color="#15803D">Approved · cannot be changed</AppText>
          </View>
        ) : (
          <Pressable disabled={picking} onPress={onPick} style={[styles.pickButton, picking && { opacity: 0.6 }]}>
            <AppText size={13} family="InterSemiBold" color={colors.navy}>
              {picking ? 'Opening...' : doc.attachmentUrl || file ? 'Replace File' : 'Add File'}
            </AppText>
          </Pressable>
        )}
      </View>

      {DOC_FIELDS[doc.key].map(field => (
        <View key={field.key} style={{ marginTop: 12 }}>
          <AppText size={11} family="InterSemiBold" color="#64748B" style={{ marginBottom: 6 }}>{field.label}</AppText>
          {field.key === 'bankAccountType' ? (
            <View style={styles.typeRow}>
              {BANK_ACCOUNT_TYPES.map(type => {
                const selected = kyc.bankAccountType === type.value;
                return (
                  <Pressable
                    key={type.value}
                    disabled={locked}
                    onPress={() => onChange('bankAccountType', selected ? '' : type.value)}
                    style={[styles.typeOption, selected && styles.typeSelected, locked && !selected && { opacity: 0.45 }]}>
                    <AppText size={13} family="InterSemiBold" color={selected ? 'white' : colors.navy}>{type.label}</AppText>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <TextInput
              value={String(kyc[field.key] ?? '')}
              editable={!locked}
              onChangeText={value => onChange(field.key, field.clean ? field.clean(value) : value)}
              keyboardType={field.numeric ? 'number-pad' : 'default'}
              autoCapitalize={field.clean === upper ? 'characters' : 'words'}
              placeholder={`Enter ${field.label}`}
              placeholderTextColor="#9AA5B1"
              style={[styles.input, locked && styles.inputLocked]}
            />
          )}
        </View>
      ))}
    </View>
  );
}

const card = {
  backgroundColor: 'white',
  borderRadius: 14,
  shadowOffset: { width: 0, height: 3 },
  shadowColor: 'rgba(0,0,0,0.08)',
  shadowOpacity: 1,
  shadowRadius: 6,
  elevation: 2,
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  content: { padding: 16, paddingBottom: 48 },
  summary: { ...card, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16, borderWidth: 1, borderColor: '#EAD9B8', backgroundColor: '#FAF0DD' },
  stat: { minWidth: 66, paddingVertical: 8, borderRadius: 12, backgroundColor: 'white' },
  card: { ...card, marginTop: 14, padding: 14, borderWidth: 1.2 },
  cardTop: { flexDirection: 'row', gap: 12 },
  thumb: { width: 84, height: 76, borderRadius: 10, overflow: 'hidden' },
  thumbImage: { width: '100%', height: '100%' },
  thumbEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderStyle: 'dashed', borderColor: '#CBD5E1', borderRadius: 10 },
  thumbPdf: { backgroundColor: '#FDECEC', borderStyle: 'solid', borderColor: '#F7B5B5' },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  pill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 12 },
  note: { marginTop: 6, padding: 8, borderRadius: 8, backgroundColor: '#F8FAFC' },
  noteRejected: { backgroundColor: '#FEF2F2' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  viewButton: { width: 72, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.navy },
  pickButton: { flex: 1, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1.2, borderColor: '#DCC9A3', backgroundColor: '#FFFBF3' },
  locked: { flex: 1, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E7F6EC' },
  input: { minHeight: 46, borderRadius: 12, borderWidth: 1.2, borderColor: '#E2E8F0', backgroundColor: '#FFFBF3', paddingHorizontal: 12, fontSize: 14, color: colors.navy },
  inputLocked: { backgroundColor: '#F1F4F8', color: '#64748B' },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeOption: { flex: 1, height: 44, borderRadius: 12, borderWidth: 1.2, borderColor: '#E2E8F0', backgroundColor: '#FFFBF3', alignItems: 'center', justifyContent: 'center' },
  typeSelected: { backgroundColor: colors.primary, experimental_backgroundImage: BRAND_GRADIENT, borderColor: colors.primary },
  submit: { marginTop: 22, height: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, experimental_backgroundImage: BRAND_GRADIENT },
  doneNote: { marginTop: 22, padding: 14, borderRadius: 14, backgroundColor: '#E7F6EC' },
});

export default RetailerKyc;
