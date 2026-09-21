import React from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import FastImage from 'react-native-fast-image';
import AppText from '../../components/AppText/AppText';
import { resolveMediaUrl } from '../../api/AxiosClient';
import { colors } from '../../utils/Colors';

/**
 * The four KYC documents on the retailer details screen - GST, PAN, Aadhaar and Bank - each with
 * its attachment, its number, where the CRM's KYC review has it (Approved / Rejected / Pending /
 * Not Submitted) and the reviewer's note. The status and note are the fields the CRM writes:
 * `<doc>_kyc_status`, `<doc>_kyc_remark`, `<doc>_kyc_action_by_name`, `<doc>_kyc_action_at`.
 */
type Doc = { key: 'gst' | 'pan' | 'aadhar' | 'bank'; title: string; files: string[]; numbers: [string, string][] };

const DOCS: Doc[] = [
  { key: 'gst', title: 'GST', files: ['gst_attachment', 'gst_image'], numbers: [['GST No.', 'gst_number']] },
  { key: 'pan', title: 'PAN', files: ['pan_attachment', 'pan_image'], numbers: [['PAN No.', 'pan_number']] },
  { key: 'aadhar', title: 'Aadhaar', files: ['aadhar_attachment', 'aadhaar_attachment', 'adharcard'], numbers: [['Aadhaar No.', 'aadhar_no']] },
  {
    key: 'bank',
    title: 'Bank Proof',
    files: ['bank_proof', 'cancelled_cheque', 'blank_cheque', 'passbook'],
    numbers: [['A/c No.', 'bank_account_number'], ['IFSC', 'ifsc_code']],
  },
];

const text = (value: unknown) => (value === null || value === undefined ? '' : String(value).trim());
const first = (data: any, keys: string[]) => keys.map(key => text(data?.[key])).find(Boolean) || '';

const STATUS = {
  approved: { label: 'Approved', fg: '#15803D', bg: '#E7F6EC' },
  rejected: { label: 'Rejected', fg: '#B91C1C', bg: '#FDECEC' },
  pending: { label: 'Pending Review', fg: '#B45309', bg: '#FEF3C7' },
  none: { label: 'Not Submitted', fg: '#64748B', bg: '#F1F5F9' },
};

const statusOf = (data: any, doc: Doc, submitted: boolean) => {
  const raw = text(data?.[`${doc.key}_kyc_status`]).toLowerCase();
  if (raw.startsWith('approve') || raw === 'verified') return STATUS.approved;
  if (raw.startsWith('reject')) return STATUS.rejected;
  return submitted ? STATUS.pending : STATUS.none;
};

const formatDate = (value: string) => {
  if (!value) return '';
  const date = new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(value) ? value : `${value.replace(' ', 'T')}Z`);
  if (Number.isNaN(date.getTime())) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
};

const KycDocumentCards = ({ data, onOpenImage }: { data: any; onOpenImage: (url: string) => void }) => (
  <View style={styles.list}>
    {DOCS.map(doc => {
      const file = first(data, doc.files);
      const url = file ? resolveMediaUrl(file) : '';
      const isPdf = /\.pdf(\?|$)/i.test(file);
      const numbers = doc.numbers.map(([label, key]) => [label, text(data?.[key])] as const).filter(([, value]) => value);
      const status = statusOf(data, doc, Boolean(file) || numbers.length > 0);
      const note = text(data?.[`${doc.key}_kyc_remark`]);
      const by = text(data?.[`${doc.key}_kyc_action_by_name`]);
      const at = formatDate(text(data?.[`${doc.key}_kyc_action_at`]));
      const open = () => {
        if (!url) return;
        if (isPdf) void Linking.openURL(url);
        else onOpenImage(url);
      };
      return (
        <View key={doc.key} style={styles.card}>
          <Pressable onPress={open} disabled={!url} style={styles.thumb}>
            {url && !isPdf ? (
              <FastImage source={{ uri: url }} style={styles.thumbImage} resizeMode="cover" />
            ) : (
              <View style={[styles.thumbEmpty, isPdf && styles.thumbPdf]}>
                <AppText size={isPdf ? 14 : 11} family="InterBold" color={isPdf ? '#D93A3A' : '#94A3B8'} align="center">
                  {isPdf ? 'PDF' : 'No file'}
                </AppText>
              </View>
            )}
          </Pressable>
          <View style={styles.body}>
            <View style={styles.titleRow}>
              <AppText size={15} family="InterSemiBold" color={colors.navy}>{doc.title}</AppText>
              <View style={[styles.pill, { backgroundColor: status.bg }]}>
                <AppText size={11} family="InterSemiBold" color={status.fg}>{status.label}</AppText>
              </View>
            </View>
            {numbers.length > 0 ? numbers.map(([label, value]) => (
              <AppText key={label} size={12} color="#475569" style={styles.line}>
                {label} <AppText size={12} family="InterSemiBold" color="#1E293B">{value}</AppText>
              </AppText>
            )) : (
              <AppText size={12} color="#94A3B8" style={styles.line}>Details not entered</AppText>
            )}
            {note ? (
              <View style={[styles.note, status === STATUS.rejected && styles.noteRejected]}>
                <AppText size={12} color={status === STATUS.rejected ? '#991B1B' : '#475569'}>
                  <AppText size={12} family="InterSemiBold" color={status === STATUS.rejected ? '#991B1B' : '#1E293B'}>Note: </AppText>
                  {note}
                </AppText>
              </View>
            ) : null}
            {(status === STATUS.approved || status === STATUS.rejected) && (by || at) ? (
              <AppText size={11} color="#94A3B8" style={styles.line}>
                {[`${status.label} by ${by || '-'}`, at].filter(Boolean).join(' · ')}
              </AppText>
            ) : null}
          </View>
        </View>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  list: { marginTop: 12, gap: 12 },
  card: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EAD9B8',
    backgroundColor: '#FFFFFF',
  },
  thumb: { width: 76, height: 76, borderRadius: 10, overflow: 'hidden' },
  thumbImage: { width: '100%', height: '100%' },
  thumbEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    borderRadius: 10,
  },
  thumbPdf: { backgroundColor: '#FDECEC', borderStyle: 'solid', borderColor: '#F7B5B5' },
  body: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  pill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 12 },
  line: { marginTop: 4 },
  note: { marginTop: 6, padding: 8, borderRadius: 8, backgroundColor: '#F8FAFC' },
  noteRejected: { backgroundColor: '#FEF2F2' },
});

export default KycDocumentCards;
