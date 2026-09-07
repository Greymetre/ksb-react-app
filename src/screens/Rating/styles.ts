import { StyleSheet } from 'react-native';
import { colors } from '../../utils/Colors';
import { SCREEN_WIDTH } from '../../utils/misc';

const ZONE_CARD_WIDTH = Math.round(SCREEN_WIDTH * 0.62);
const ZONE_CARD_GAP = 10;
// Fixed, because 'stretch' inside the marquee row has no height to stretch against and
// grows the card to fill whatever the parent offers - which was the whole screen.
const ZONE_CARD_HEIGHT = 96;
const ZONE_CARD_PADDING = 10;

const card = {
  backgroundColor: '#fff',
  borderRadius: 12,
  borderWidth: 1,
  borderColor: '#E6E9F0',
};

export const ratingStyles = StyleSheet.create<any>({
  container: { flex: 1, backgroundColor: '#F4F6FB' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  // The bottom bar floats over the list, so the last row needs room to clear it.
  listContent: { padding: 14, paddingBottom: 120, gap: 10 },

  // Heading lives outside the card now, centred above it.
  allIndiaHeading: { alignItems: 'center', gap: 2, marginBottom: 10 },

  allIndiaCard: {
    backgroundColor: colors.blue,
    borderRadius: 14,
    padding: 16,
  },
  // The two halves are the same height whatever their text runs to, so the divider
  // reaches top to bottom and neither side sits higher than the other.
  performerRow: { flexDirection: 'row', alignItems: 'stretch' },
  performerHalf: { flex: 1, alignItems: 'center', gap: 5, paddingHorizontal: 4 },
  performerDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.28)', marginHorizontal: 10 },

  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginTop: 2,
  },
  avatarImage: { width: '100%', height: '100%' },

  sectionTitle: { marginTop: 20, marginBottom: 10 },

  // The strip runs edge to edge, so a card can drift in and out of view rather than
  // appearing at a margin.
  marqueeWindow: { height: ZONE_CARD_HEIGHT, overflow: 'hidden', marginHorizontal: -14 },
  marqueeRow: { flexDirection: 'row', paddingHorizontal: 0 },

  // Stride is width + gap: the marquee slides by exactly one run of these, so the
  // number here and the card's own width must stay in step.
  zoneCardStride: ZONE_CARD_WIDTH + ZONE_CARD_GAP,
  zoneCard: {
    ...card,
    width: ZONE_CARD_WIDTH,
    height: ZONE_CARD_HEIGHT,
    marginRight: ZONE_CARD_GAP,
    padding: ZONE_CARD_PADDING,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  zoneAvatar: {
    width: ZONE_CARD_HEIGHT - ZONE_CARD_PADDING * 2,
    height: ZONE_CARD_HEIGHT - ZONE_CARD_PADDING * 2,
    borderRadius: 12,
    backgroundColor: '#EEF2FB',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  zoneDetails: { flex: 1, gap: 1 },

  listHead: {
    marginTop: 18,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleRow: { flexDirection: 'row', gap: 6 },
  toggle: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#C9CFE4',
    backgroundColor: '#fff',
  },
  toggleActive: { backgroundColor: colors.blue, borderColor: colors.blue },
  periodLine: { marginBottom: 10 },

  row: { ...card, padding: 12, gap: 10 },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowIdentity: { flex: 1, gap: 2 },
  avgPill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },

  monthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#EEF1F7',
    paddingTop: 8,
  },
  monthCell: { alignItems: 'center', gap: 2, flex: 1 },

  empty: { paddingVertical: 40, alignItems: 'center' },
  rowPressed: { opacity: 0.75 },

  comingSoon: {
    flex: 1,
    backgroundColor: '#F4F6FB',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 40,
    // Clears the floating bottom bar so the text is not sitting behind it.
    paddingBottom: 90,
  },

  // --- employee detail popup ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.55)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#F7F9FD',
    borderRadius: 16,
    overflow: 'hidden',
    maxHeight: '88%',
  },
  modalHead: {
    backgroundColor: colors.blue,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  modalClose: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: { padding: 14, gap: 8 },

  factGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  factBox: {
    ...card,
    flexGrow: 1,
    flexBasis: '46%',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  factBoxWide: { flexBasis: '100%', borderColor: '#C7D6F5', backgroundColor: '#EEF3FE' },

  chartHead: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthPill: { backgroundColor: '#EEF3FE', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  trendPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },

  chart: {
    ...card,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    marginTop: 8,
  },
  chartCol: { flex: 1, alignItems: 'center', gap: 4 },
  // A fixed track height is what lets a bar's percentage read as its height.
  chartTrack: {
    width: 18,
    height: 96,
    borderRadius: 6,
    backgroundColor: '#EDF0F7',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  chartBar: { width: '100%', borderRadius: 6 },
  // Sits over the bars. 'top' is supplied at runtime from the measured track position.
  trendOverlay: { position: 'absolute', left: 10 },

  attentionHead: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  countPill: { backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  attentionEmpty: { ...card, padding: 14, alignItems: 'center', marginTop: 6 },
  driverRow: {
    ...card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    marginTop: 6,
  },
});
