import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import AppText from '../../components/AppText/AppText';
import { useGetCustomerSnapshot } from '../../api/query/CustomerApi';
import { colors } from '../../utils/Colors';
import { rw } from '../../utils/responsive';

type Snapshot = {
  last_visit_date?: string | null;
  last_visit_days_ago?: number | null;
  last_order_date?: string | null;
  last_order_days_ago?: number | null;
  mtd_visits: number;
  ytd_visits: number;
  mtd_orders: number;
  ytd_orders: number;
  mtd_order_amount: number;
  ytd_order_amount: number;
  mtd_order_qty: number;
  ytd_order_qty: number;
};

type Period = { month_label?: string; year_label?: string };

const compactMoney = (value: number) => {
  const amount = Number(value) || 0;
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(amount)}`;
};

const qty = (value: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(value) || 0);

const longDate = (value?: string | null) => {
  if (!value) return 'Never';
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

/** "Today" reads better than "0 days ago", and a gap worth acting on turns amber. */
const agoLabel = (days?: number | null) => {
  if (days === null || days === undefined) return 'No record';
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
};

const agoTone = (days?: number | null) => {
  if (days === null || days === undefined) return '#94A3B8';
  if (days <= 7) return '#0B6B43';
  if (days <= 30) return '#A05A00';
  return '#B42318';
};

const CustomerSnapshot = ({ entityId, entityType }: { entityId: any; entityType?: string }) => {
  const { mutateAsync: getSnapshot } = useGetCustomerSnapshot();
  const [data, setData] = useState<Snapshot | null>(null);
  const [period, setPeriod] = useState<Period>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!entityId) { setLoading(false); return; }
    setLoading(true);
    try {
      const response: any = await getSnapshot({
        entity_type: entityType === 'secondary' ? 'secondary_customer' : 'distributor',
        entity_id: entityId,
      });
      setData(response?.data?.data || null);
      setPeriod(response?.data?.period || {});
    } catch {
      // A snapshot is supporting detail, not the reason the screen exists: if it
      // cannot load, the rest of Customer Details still works.
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [entityId, entityType, getSnapshot]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <View style={[s.wrap, s.loadingWrap]}>
        <ActivityIndicator color={colors.blue} size="small" />
      </View>
    );
  }

  if (!data) return null;

  return (
    <View style={s.wrap}>
      {/* Last touchpoints: the two dates a field user checks first. */}
      <View style={s.touchRow}>
        <TouchCard
          icon="📍"
          label="Last Visit"
          value={longDate(data.last_visit_date)}
          caption={agoLabel(data.last_visit_days_ago)}
          tone={agoTone(data.last_visit_days_ago)}
        />
        <TouchCard
          icon="🧾"
          label="Last Order"
          value={longDate(data.last_order_date)}
          caption={agoLabel(data.last_order_days_ago)}
          tone={agoTone(data.last_order_days_ago)}
        />
      </View>

      <View style={s.board}>
        <LinearGradient
          colors={['#1F3A6E', '#2F6FB8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.boardGradient}
        />
        <View style={s.boardContent}>
          <View style={s.boardHead}>
            <AppText size={11.5} color="#FFFFFF" family="InterBold" transform="uppercase" spacing={0.8} lineHeight={16}>
              Performance
            </AppText>
            <View style={s.periodChips}>
              <View style={s.periodChip}>
                <AppText size={10.5} color="#DCE7FA" family="InterSemiBold" lineHeight={14}>
                  MTD {period.month_label || ''}
                </AppText>
              </View>
              <View style={s.periodChip}>
                <AppText size={10.5} color="#DCE7FA" family="InterSemiBold" lineHeight={14}>
                  YTD {period.year_label || ''}
                </AppText>
              </View>
            </View>
          </View>

          <View style={s.metricRow}>
            <Metric label="Visits" mtd={String(data.mtd_visits)} ytd={String(data.ytd_visits)} />
            <View style={s.metricDivider} />
            <Metric label="Order Value" mtd={compactMoney(data.mtd_order_amount)} ytd={compactMoney(data.ytd_order_amount)} highlight />
            <View style={s.metricDivider} />
            <Metric label="Quantity" mtd={qty(data.mtd_order_qty)} ytd={qty(data.ytd_order_qty)} />
          </View>

          <View style={s.boardFoot}>
            <AppText size={11.5} color="#C9D8F2" family="InterMedium" lineHeight={16}>
              {data.mtd_orders} order{data.mtd_orders === 1 ? '' : 's'} this month · {data.ytd_orders} this year
            </AppText>
          </View>
        </View>
      </View>
    </View>
  );
};

const TouchCard = ({ icon, label, value, caption, tone }: {
  icon: string; label: string; value: string; caption: string; tone: string;
}) => (
  <View style={s.touchCard}>
    <View style={s.touchHead}>
      <AppText size={13} color="#0F172A" family="InterRegular" lineHeight={18}>{icon}</AppText>
      <AppText size={11} color="#64748B" family="InterSemiBold" transform="uppercase" spacing={0.5} lineHeight={15}>
        {label}
      </AppText>
    </View>
    <AppText size={14} color="#0F172A" family="InterBold" lineHeight={20} numLines={1}>{value}</AppText>
    <View style={[s.touchPill, { backgroundColor: `${tone}1A` }]}>
      <AppText size={11} color={tone} family="InterBold" lineHeight={15}>{caption}</AppText>
    </View>
  </View>
);

const Metric = ({ label, mtd, ytd, highlight }: { label: string; mtd: string; ytd: string; highlight?: boolean }) => (
  <View style={s.metric}>
    <View style={s.metricLabelRow}>
      <AppText size={10.5} color="#C9D8F2" family="InterSemiBold" transform="uppercase" spacing={0.5} lineHeight={14}>
        {label}
      </AppText>
    </View>
    <View style={s.metricValueRow}>
      <AppText size={17} color={highlight ? '#A7F3C9' : colors.white} family="InterBold" lineHeight={23} numLines={1}>
        {mtd}
      </AppText>
    </View>
    <View style={s.metricSubRow}>
      <AppText size={11} color="rgba(255,255,255,0.7)" family="InterMedium" lineHeight={15} numLines={1}>
        YTD {ytd}
      </AppText>
    </View>
  </View>
);

const s = StyleSheet.create({
  wrap: { marginTop: 16 },
  loadingWrap: { paddingVertical: 22, alignItems: 'center' },

  touchRow: { flexDirection: 'row', gap: 10 },
  touchCard: {
    flex: 1, backgroundColor: colors.white, borderRadius: rw(14),
    padding: rw(12), borderWidth: 1, borderColor: '#E2E8F0',
  },
  touchHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  touchPill: { alignSelf: 'flex-start', marginTop: 7, paddingHorizontal: rw(8), paddingVertical: 3, borderRadius: 999 },

  // Gradient painted behind the content: as a wrapper it settles on a height
  // that clips the bottom row of text.
  board: { marginTop: 10, borderRadius: 18, backgroundColor: '#1F3A6E' },
  boardGradient: { ...StyleSheet.absoluteFillObject, borderRadius: 18 },
  boardContent: { paddingHorizontal: 14, paddingTop: 13, paddingBottom: 14 },
  boardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  periodChips: { flexDirection: 'row', gap: 6 },
  periodChip: { backgroundColor: 'rgba(255,255,255,0.16)', paddingHorizontal: rw(8), paddingVertical: 3, borderRadius: 999 },

  metricRow: {
    flexDirection: 'row', alignItems: 'flex-start', marginTop: 13, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)',
  },
  metric: { flex: 1 },
  metricLabelRow: { height: 16, justifyContent: 'center' },
  metricValueRow: { height: 25, justifyContent: 'center' },
  metricSubRow: { height: 17, justifyContent: 'center' },
  metricDivider: { width: 1, height: 58, backgroundColor: 'rgba(255,255,255,0.18)', marginHorizontal: rw(9) },

  boardFoot: { marginTop: 11, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)' },
});

export default CustomerSnapshot;
