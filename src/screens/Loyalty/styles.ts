import { Platform, StyleSheet } from 'react-native';
import { colors } from '../../utils/Colors';

const card = {
  backgroundColor: 'white',
  borderRadius: 12,
  shadowOffset: { width: 2, height: 4 },
  shadowColor: Platform.OS === 'ios' ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.12)',
  shadowOpacity: 1,
  shadowRadius: 6,
  elevation: 2,
};

export const loyaltyTabStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgColor },
  /* One control, two halves - the same shape the CRM uses for its segmented tabs. */
  tabBar: {
    flexDirection: 'row',
    margin: 16,
    marginBottom: 4,
    padding: 4,
    borderRadius: 12,
    backgroundColor: '#E6EAF2',
  },
  tab: { flex: 1, height: 38, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  tabActive: {
    backgroundColor: colors.blue,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
});

export const schemeStyles = StyleSheet.create({
  listContent: { padding: 16, paddingTop: 12, paddingBottom: 40 },

  /* A colour down the left edge says live, upcoming or finished before anything is read. */
  card: { ...card, flexDirection: 'row', overflow: 'hidden', marginBottom: 12 },
  accent: { width: 5 },
  cardBody: { flex: 1, padding: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  chip: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6, backgroundColor: '#F1F5F9', maxWidth: 150 },

  cardFooter: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 12 },
  daysPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: '#EAF2FF' },

  emptyWrap: { alignItems: 'center', paddingTop: 70, paddingHorizontal: 40 },

  overlay: { flex: 1, backgroundColor: 'rgba(8,20,40,0.55)', justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    paddingBottom: 24,
    overflow: 'hidden',
  },
  sheetScroll: { flexGrow: 0, flexShrink: 1 },
  sheetHandle: { alignSelf: 'center', width: 42, height: 4, borderRadius: 4, backgroundColor: '#D9E1EC', marginTop: 10 },
  sheetHead: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12, borderBottomWidth: 1, borderColor: '#EEF2F7' },

  statRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  statCard: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 12 },
  amountRow: { flexDirection: 'row', gap: 10, marginTop: 12, backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14 },
  slabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
});

export const invoiceStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgColor },

  /* Search and the status chips sit together, above the list. */
  toolbar: { paddingHorizontal: 16, paddingTop: 14, backgroundColor: colors.bgColor },
  searchWrap: {
    ...card,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 46,
  },
  searchInput: { flex: 1, fontSize: 13, color: '#111827', padding: 0, marginLeft: 8 },
  chipRow: { flexDirection: 'row', gap: 8, marginTop: 12, paddingBottom: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: { backgroundColor: colors.blue, borderColor: colors.blue },

  /* A strip of totals, so the first thing on screen is the shape of the workload. */
  // Four cards now, so the gap and the side padding come down to keep the label on
  // one line on a narrow phone.
  summaryRow: { flexDirection: 'row', gap: 7, paddingHorizontal: 12, marginTop: 14 },
  summaryCard: { ...card, flex: 1, paddingVertical: 12, paddingHorizontal: 8 },
  summaryAccent: { height: 3, width: 26, borderRadius: 3, marginBottom: 8 },

  listContent: { padding: 16, paddingBottom: 120 },

  invoiceCard: { ...card, padding: 14, marginBottom: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  cardDivider: { height: 1, backgroundColor: '#EEF2F7', marginVertical: 11 },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  metaLeft: { flex: 1, paddingRight: 10 },

  /* Bottom right, above the list, always reachable. */
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    height: 58,
    width: 58,
    borderRadius: 29,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },

  /* The detail popup. */
  /* The backdrop is its own layer. Wrapping the sheet in a Pressable would take the touch
     responder and the list inside it would never scroll. */
  overlay: { flex: 1, backgroundColor: 'rgba(8,20,40,0.55)', justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    paddingBottom: 24,
    overflow: 'hidden',
  },
  /* Bounded so the content scrolls inside the sheet rather than pushing it taller. */
  sheetScroll: { flexGrow: 0, flexShrink: 1 },
  sheetHandle: { alignSelf: 'center', width: 42, height: 4, borderRadius: 4, backgroundColor: '#D9E1EC', marginTop: 10 },
  sheetHead: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12, borderBottomWidth: 1, borderColor: '#EEF2F7' },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderColor: '#F3F6FA',
    gap: 16,
  },
  attachmentBox: {
    marginTop: 14,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    height: 190,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentPdf: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  timelineDot: { width: 8, height: 8, borderRadius: 8, backgroundColor: colors.blue, marginTop: 5 },

  emptyWrap: { alignItems: 'center', paddingTop: 70, paddingHorizontal: 40 },

  /* Offered only while the invoice is pending or on hold. */
  detailActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  detailAction: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  editAction: { borderColor: '#BFD7F5', backgroundColor: '#F2F8FF' },
  deleteAction: { borderColor: '#F6C9C9', backgroundColor: '#FEF3F3' },
});

export const invoiceFormStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgColor },
  content: { padding: 16, paddingBottom: 130 },
  card: { ...card, padding: 16, marginBottom: 14 },
  label: { marginBottom: 7 },
  field: {
    minHeight: 50,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: 'white',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  input: { flex: 1, fontSize: 13.5, color: '#111827', padding: 0 },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },

  /* A retailer with one dealer is told, not asked. */
  dealerFixed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    backgroundColor: '#F5F9FF',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dealerBadge: {
    height: 34,
    width: 34,
    borderRadius: 17,
    backgroundColor: '#E0EDFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  upload: {
    minHeight: 130,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#A7C7E8',
    backgroundColor: '#F7FBFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
  },
  preview: { height: 150, borderRadius: 12, overflow: 'hidden', backgroundColor: '#EEF3F8' },
  // An invoice can carry up to ten files, so they sit in a wrapping grid of thumbnails
  // with a remove badge on each and an "add" tile at the end.
  attachmentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  attachmentTile: {
    width: 78,
    height: 78,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#EEF3F8',
  },
  attachmentImage: { width: '100%', height: '100%' },
  attachmentDoc: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  attachmentRemove: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 19,
    height: 19,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(17,24,39,0.72)',
  },
  attachmentAdd: {
    width: 78,
    height: 78,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#B7C7DA',
    backgroundColor: '#F7FAFD',
  },

  submitBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderColor: '#EEF2F7',
  },
  submit: {
    height: 52,
    borderRadius: 12,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Picker sheet shared by retailer, dealer and scheme. */
  overlay: { flex: 1, backgroundColor: 'rgba(8,20,40,0.55)', justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheet: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '78%', padding: 20 },
  /* With the keyboard up there is less room, so the sheet gives some back rather than
     being squeezed against the top of the screen. */
  sheetWithKeyboard: { maxHeight: '55%' },
  sheetScroll: { flexGrow: 0, flexShrink: 1 },
  option: { paddingVertical: 13, borderBottomWidth: 1, borderColor: '#F1F5F9' },
  search: {
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    marginBottom: 10,
    fontSize: 13,
    color: '#111827',
  },
});

export const datePickerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(8,20,40,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: { width: '100%', maxWidth: 360, backgroundColor: 'white', borderRadius: 18, padding: 18 },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, marginBottom: 10 },
  arrow: {
    height: 34,
    width: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  arrowDisabled: { backgroundColor: '#F8FAFC' },
  weekRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  /* Seven to a row, whatever the screen width. */
  cell: { width: `${100 / 7}%`, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  day: { height: 36, width: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  daySelected: { backgroundColor: colors.blue },
  dayToday: { borderWidth: 1, borderColor: colors.blue },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderColor: '#EEF2F7' },
});
