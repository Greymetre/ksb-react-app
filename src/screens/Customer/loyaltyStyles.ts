import { StyleSheet } from 'react-native';
import { colors } from '../../utils/Colors';
import { rw } from '../../utils/responsive';

/** One palette for both loyalty screens so a Live scheme looks the same on each. */
export const statusTheme: Record<string, { from: string; to: string; pill: string; pillText: string; dot: string }> = {
  live: { from: '#0F7B4F', to: '#18A06A', pill: '#E7F7EF', pillText: '#0B6B43', dot: '#12A05F' },
  upcoming: { from: '#395299', to: '#2F6FB8', pill: '#E8EEFB', pillText: '#2B4A8B', dot: '#3B62B5' },
  expired: { from: '#4B5563', to: '#6B7280', pill: '#EEF1F4', pillText: '#475569', dot: '#94A3B8' },
};

export const themeFor = (status?: string | null) => statusTheme[String(status || 'live').toLowerCase()] || statusTheme.live;

export const money = (value: number) =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(value) || 0)}`;

export const points = (value: number) =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Number(value) || 0);

export const shortDate = (value?: string | null) => {
  if (!value) return '-';
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
};

export const loyaltyStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.offWHite },

  // The gradient paints behind the content rather than wrapping it: as a wrapper
  // it settles on a height that clips the bottom row of text.
  hero: { marginHorizontal: rw(14), marginTop: 12, borderRadius: 18, backgroundColor: '#395299' },
  heroGradient: { ...StyleSheet.absoluteFillObject, borderRadius: 18 },
  heroContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 18 },
  heroBadge: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: rw(9), paddingVertical: 4, borderRadius: 999,
  },
  heroStats: {
    flexDirection: 'row', alignItems: 'flex-start', marginTop: 14, paddingTop: 13,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)',
  },
  heroStat: { flex: 1 },
  heroLabelRow: { height: 18, justifyContent: 'center' },
  heroValueRow: { height: 34, justifyContent: 'center' },
  heroDivider: { width: 1, height: 52, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: rw(12) },

  listBody: { paddingHorizontal: rw(14), paddingTop: 12, paddingBottom: 26 },

  card: {
    backgroundColor: colors.white, borderRadius: rw(16), padding: rw(14),
    marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0',
  },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  statusPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: rw(9), paddingVertical: 4, borderRadius: 999 },
  statusDot: { width: 7, height: 7, borderRadius: 4, marginRight: 6 },
  tagPill: { paddingHorizontal: rw(9), paddingVertical: 4, borderRadius: 999, backgroundColor: '#F1F5F9' },

  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 8, gap: 6 },

  statGrid: {
    flexDirection: 'row', marginTop: 13, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: '#EEF2F7',
  },
  statCell: { flex: 1 },
  statDivider: { width: 1, backgroundColor: '#EEF2F7', marginHorizontal: rw(8) },

  state: { paddingVertical: rw(44), alignItems: 'center', paddingHorizontal: rw(26), gap: 6 },
  emptyBody: { flexGrow: 1, justifyContent: 'center' },
});
