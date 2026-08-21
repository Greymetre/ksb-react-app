import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Toast from 'react-native-toast-message';
import AppText from '../../components/AppText/AppText';
import { useGetCustomerCheckinActivity } from '../../api/query/CustomerApi';
import { colors } from '../../utils/Colors';
import { rw } from '../../utils/responsive';
import { shadowStyle } from '../../utils/typography';

type ActivityRow = {
  checkin_id: number;
  employee_name: string;
  employee_code?: string | null;
  designation?: string | null;
  checkin_date?: string | null;
  checkin_time?: string | null;
  order_value: number;
  note?: string | null;
};

type ListEntry =
  | { kind: 'month'; key: string; label: string; count: number; value: number }
  | { kind: 'row'; key: string; row: ActivityRow };

const PAGE_SIZE = 20;

// One colour per employee, picked from the name so the same person keeps the
// same avatar as you scroll.
const AVATAR_COLORS = ['#395299', '#0F7B4F', '#B4530A', '#7A3EA1', '#0E6F86', '#A63A55'];

const money = (value: number) =>
  `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value || 0)}`;

const parseDate = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const initials = (name?: string | null) => {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const avatarColor = (name?: string | null) => {
  const text = name || '';
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) hash = (hash + text.charCodeAt(index)) % 997;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

/** Rows arrive newest first, so a month header goes in whenever the month turns over. */
const buildEntries = (rows: ActivityRow[]): ListEntry[] => {
  const entries: ListEntry[] = [];
  let currentMonth = '';

  rows.forEach((row, index) => {
    const date = parseDate(row.checkin_date);
    const monthKey = date ? `${date.getFullYear()}-${date.getMonth()}` : 'unknown';

    if (monthKey !== currentMonth) {
      currentMonth = monthKey;
      const sameMonth = rows.filter(other => {
        const otherDate = parseDate(other.checkin_date);
        const otherKey = otherDate ? `${otherDate.getFullYear()}-${otherDate.getMonth()}` : 'unknown';
        return otherKey === monthKey;
      });
      entries.push({
        kind: 'month',
        key: `month-${monthKey}`,
        label: date ? date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : 'Undated',
        count: sameMonth.length,
        value: sameMonth.reduce((total, item) => total + (Number(item.order_value) || 0), 0),
      });
    }

    entries.push({ kind: 'row', key: `row-${row.checkin_id}-${index}`, row });
  });

  return entries;
};

const CustomerActivity = ({ route }: any) => {
  const { entityId, entityType, customerName } = route?.params || {};
  const { mutateAsync: getActivity } = useGetCustomerCheckinActivity();

  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [totalCheckins, setTotalCheckins] = useState(0);
  const [totalOrderValue, setTotalOrderValue] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // FlatList fires onEndReached repeatedly while a page is still in flight.
  const pageRef = useRef(1);
  const fetchingRef = useRef(false);

  const load = useCallback(async (page: number, mode: 'initial' | 'refresh' | 'more') => {
    if (!entityId) {
      setLoading(false);
      return;
    }
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    if (mode === 'initial') setLoading(true);
    if (mode === 'refresh') setRefreshing(true);
    if (mode === 'more') setLoadingMore(true);

    try {
      const response: any = await getActivity({
        entity_type: entityType === 'secondary' ? 'secondary_customer' : 'distributor',
        entity_id: entityId,
        page,
        page_size: PAGE_SIZE,
      });
      const body = response?.data;
      const incoming: ActivityRow[] = Array.isArray(body?.data) ? body.data : [];

      setRows(previous => (page === 1 ? incoming : [...previous, ...incoming]));
      setTotalCheckins(Number(body?.total_checkins) || 0);
      setTotalOrderValue(Number(body?.total_order_value) || 0);
      setHasMore(Boolean(body?.pagination?.has_more));
      pageRef.current = page;
    } catch (error: any) {
      Toast.show({ type: 'error', text1: error?.response?.data?.message || 'Unable to load activity' });
    } finally {
      fetchingRef.current = false;
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [entityId, entityType, getActivity]);

  useEffect(() => { load(1, 'initial'); }, [load]);

  const entries = useMemo(() => buildEntries(rows), [rows]);

  const loadMore = () => {
    if (loading || loadingMore || refreshing || !hasMore) return;
    load(pageRef.current + 1, 'more');
  };

  const renderEntry = ({ item }: { item: ListEntry }) => {
    if (item.kind === 'month') {
      return (
        <View style={styles.monthRow}>
          <View style={styles.monthLine} />
          <AppText size={12.5} color="#334155" family="InterBold" transform="uppercase" spacing={0.6} lineHeight={17}>
            {item.label}
          </AppText>
          <View style={styles.monthCount}>
            <AppText size={12} color="#334155" family="InterBold" lineHeight={16}>{item.count}</AppText>
          </View>
          <View style={styles.monthLine} />
        </View>
      );
    }

    const { row } = item;
    const date = parseDate(row.checkin_date);
    const hasOrder = Number(row.order_value) > 0;
    const tint = avatarColor(row.employee_name);

    return (
      <View style={styles.card}>
        <View style={styles.dateChip}>
          <AppText size={20} color="#0F172A" family="InterBold" align="center" lineHeight={25}>
            {date ? String(date.getDate()).padStart(2, '0') : '--'}
          </AppText>
          <AppText size={12} color="#475569" family="InterSemiBold" align="center" transform="uppercase" lineHeight={16}>
            {date ? date.toLocaleDateString('en-IN', { month: 'short' }) : ''}
          </AppText>
          {row.checkin_time ? (
            <AppText size={11.5} color="#64748B" family="InterMedium" align="center" lineHeight={16}>
              {row.checkin_time.slice(0, 5)}
            </AppText>
          ) : null}
        </View>

        <View style={styles.cardBody}>
          <View style={styles.employeeRow}>
            <View style={[styles.avatar, { backgroundColor: tint }]}>
              <AppText size={12} color={colors.white} family="InterBold" lineHeight={16}>{initials(row.employee_name)}</AppText>
            </View>
            <AppText size={14.5} color="#0F172A" family="InterSemiBold" numLines={2} lineHeight={20} style={styles.employeeName}>
              {row.employee_name?.trim() || '-'}
              {row.designation?.trim() ? (
                <AppText size={13} color="#475569" family="InterMedium" lineHeight={20}> ({row.designation.trim()})</AppText>
              ) : null}
            </AppText>
          </View>

          {row.employee_code ? (
            <AppText size={12} color="#64748B" family="InterMedium" lineHeight={17} style={styles.employeeCode}>
              {row.employee_code}
            </AppText>
          ) : null}

          <View style={styles.metaRow}>
            <View style={[styles.orderPill, hasOrder ? styles.orderPillActive : null]}>
              <AppText
                size={13}
                lineHeight={18}
                color={hasOrder ? '#0B6B43' : '#64748B'}
                family={hasOrder ? 'InterBold' : 'InterMedium'}
              >
                {hasOrder ? money(row.order_value) : 'No order'}
              </AppText>
            </View>
          </View>

          {row.note?.trim() ? (
            <View style={styles.noteBox}>
              <AppText size={13} color="#334155" family="InterRegular" numLines={4} lineHeight={19}>
                {row.note.trim()}
              </AppText>
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.hero, shadowStyle]}>
        <LinearGradient
          colors={['#395299', '#2F6FB8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroGradient}
        />
        <View style={styles.heroContent}>
          <View style={styles.heroBadge}>
            <AppText size={11} color="#FFFFFF" family="InterSemiBold" transform="uppercase" spacing={0.9} lineHeight={15}>
              Visit activity
            </AppText>
          </View>
          <View style={{ marginTop: 8 }}>
            <AppText size={20} color={colors.white} family="InterBold" numLines={2} lineHeight={27}>
              {customerName || 'Customer'}
            </AppText>
          </View>

          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <View style={styles.heroLabelRow}>
                <AppText size={12} color="#E3ECFB" family="InterSemiBold" transform="uppercase" spacing={0.6} lineHeight={16}>
                  Total visits
                </AppText>
              </View>
              <View style={styles.heroValueRow}>
                <AppText size={26} color={colors.white} family="InterBold" lineHeight={34} numLines={1}>
                  {totalCheckins}
                </AppText>
            </View>
          </View>

          <View style={styles.heroDivider} />

          <View style={styles.heroStat}>
            <View style={styles.heroLabelRow}>
              <AppText size={12} color="#E3ECFB" family="InterSemiBold" transform="uppercase" spacing={0.6} lineHeight={16}>
                Order value
              </AppText>
            </View>
            <View style={styles.heroValueRow}>
              <AppText size={24} color="#A7F3C9" family="InterBold" lineHeight={34} numLines={1}>
                {money(totalOrderValue)}
              </AppText>
            </View>
          </View>
        </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.state}><ActivityIndicator color={colors.blue} /></View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={item => item.key}
          renderItem={renderEntry}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.listBody, entries.length === 0 ? styles.emptyBody : null]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(1, 'refresh')} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <View style={styles.state}>
              <AppText size={14.5} color="#334155" family="InterSemiBold" lineHeight={20}>No visit recorded yet</AppText>
              <AppText size={12.5} color="#64748B" family="InterRegular" align="center" lineHeight={18}>
                Check-ins on this customer will show up here.
              </AppText>
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footer}><ActivityIndicator color={colors.blue} size="small" /></View>
            ) : entries.length > 0 && !hasMore ? (
              <View style={styles.footer}>
                <AppText size={12.5} color="#64748B" family="InterMedium" lineHeight={17}>
                  Showing all {totalCheckins} activities
                </AppText>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.offWHite },

  // Heights are pinned rather than left to auto-measure: the gradient wrapper was
  // settling on a height that clipped the numbers off the bottom of the card.
  // The gradient sits behind the content instead of wrapping it: as a wrapper it
  // settled on a height that clipped the numbers off the bottom of the card.
  hero: {
    marginHorizontal: rw(14), marginTop: 12, borderRadius: 18,
    backgroundColor: '#395299',
  },
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
  heroValueRow: { height: 36, justifyContent: 'center' },
  heroDivider: { width: 1, height: 54, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: rw(14) },

  listBody: { paddingHorizontal: rw(14), paddingTop: 6, paddingBottom: 24 },

  monthRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, marginBottom: 8 },
  monthLine: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
  monthCount: {
    minWidth: 22, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10,
    backgroundColor: '#E9EEF6', alignItems: 'center',
  },

  card: {
    flexDirection: 'row', backgroundColor: colors.white, borderRadius: rw(14),
    padding: rw(13), marginBottom: 11, borderWidth: 1, borderColor: '#E2E8F0',
  },
  dateChip: {
    width: 60, paddingVertical: rw(10), borderRadius: rw(12),
    backgroundColor: '#EEF3FB', borderWidth: 1, borderColor: '#DDE6F4',
    alignItems: 'center', justifyContent: 'center',
  },
  cardBody: { flex: 1, marginLeft: rw(12) },

  employeeRow: { flexDirection: 'row', alignItems: 'flex-start' },
  avatar: {
    width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 9,
  },
  employeeName: { flex: 1, marginTop: 1 },
  employeeCode: { marginTop: 3, marginLeft: 37 },

  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  orderPill: {
    paddingHorizontal: rw(12), paddingVertical: 6, borderRadius: 999,
    backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#DDE3EB',
  },
  orderPillActive: { backgroundColor: '#E7F7EF', borderColor: '#BFE8D3' },

  noteBox: {
    marginTop: 9, backgroundColor: '#F6F9FC', borderRadius: rw(10),
    paddingHorizontal: rw(11), paddingVertical: rw(9),
    borderLeftWidth: 3, borderLeftColor: '#94A3B8',
  },

  state: { paddingVertical: rw(40), alignItems: 'center', paddingHorizontal: rw(24), gap: 6 },
  emptyBody: { flexGrow: 1, justifyContent: 'center' },
  footer: { paddingVertical: rw(16), alignItems: 'center' },
});

export default CustomerActivity;
