import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import AppText from '../../components/AppText/AppText';
import { colors } from '../../utils/Colors';
import { apiErrorMessage } from '../../utils/misc';
import { kycSummary, listActiveRetailers } from '../../api/retailerKycApi';
import { invoiceStyles as styles } from './styles';

// The CRM's four KYC stages, in its order.
const STAGES = [
  { key: 'approved', countKey: 'approved', label: 'Fully Approved', tone: '#16A34A', bg: '#E7F6EC' },
  { key: 'complete_pending', countKey: 'complete_pending', label: 'Awaiting Review', tone: '#D97706', bg: '#FEF3C7' },
  { key: 'partial', countKey: 'partial', label: 'Partly Submitted', tone: '#2563EB', bg: '#E6EFFF' },
  { key: 'none', countKey: 'not_started', label: 'Not Started', tone: '#64748B', bg: '#F1F5F9' },
];

const stageOf = (key: string) => STAGES.find(stage => stage.key === key) ?? STAGES[3];

/**
 * The Loyalty screen's KYC tab: the active retailers (at least one loyalty invoice) this user
 * can see - all for an admin, the branch for a BM, the reporting downline for everyone else;
 * the server applies that scope. A stage tile narrows the list to that stage; tapping it again
 * clears it. A retailer opens its KYC for editing.
 */
const KycList = ({ navigation }: any) => {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // Only the latest request may fill the list; a slow earlier one must not overwrite it.
  const requestId = useRef(0);

  const load = useCallback(
    async (nextPage: number, mode: 'replace' | 'append') => {
      const id = ++requestId.current;
      try {
        const result = await listActiveRetailers({ page: nextPage, search, kyc: stage });
        if (id !== requestId.current) return;
        setItems(old => (mode === 'append' ? [...old, ...result.items] : result.items));
        setTotal(result.total);
        setPage(nextPage);
      } catch (error) {
        if (id !== requestId.current) return;
        Toast.show({ type: 'error', position: 'top', text1: apiErrorMessage(error, 'Unable to load retailers') });
        if (mode === 'replace') setItems([]);
      } finally {
        if (id === requestId.current) {
          setLoading(false);
          setLoadingMore(false);
          setRefreshing(false);
        }
      }
    },
    [search, stage],
  );

  const loadSummary = useCallback(async () => {
    try {
      setSummary(await kycSummary());
    } catch {
      // A count that cannot be fetched is not worth an error toast over the list.
      setSummary({});
    }
  }, []);

  // Typing should not fire a request per keystroke.
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => load(1, 'replace'), 350);
    return () => clearTimeout(timer);
  }, [load]);

  // Coming back from a retailer's KYC must show its new stage, in the list and in the counts.
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      loadSummary();
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      load(1, 'replace');
    }, [load, loadSummary]),
  );

  const tiles = useMemo(
    () => STAGES.map(item => ({ ...item, count: summary[item.countKey] ?? 0 })),
    [summary],
  );

  const canLoadMore = items.length < total && !loadingMore && !loading;

  return (
    <View style={styles.container}>
      <View style={[styles.toolbar, { paddingBottom: 2 }]}>
        <View style={styles.searchWrap}>
          <AppText size={14} color="black" opacity={0.35}>⌕</AppText>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search retailer, mobile or code"
            placeholderTextColor="#9AA5B1"
            style={styles.searchInput}
          />
          {search ? (
            <Pressable onPress={() => setSearch('')} hitSlop={10}>
              <AppText size={16} color="black" opacity={0.35}>×</AppText>
            </Pressable>
          ) : null}
        </View>
      </View>

      <AppText size={12} family="InterSemiBold" color="black" opacity={0.6} style={{ marginHorizontal: 16, marginTop: 12 }}>
        Active Retailer KYC ({summary.total ?? 0})
      </AppText>
      <View style={[styles.summaryRow, { marginTop: 8 }]}>
        {tiles.map(tile => {
          const active = stage === tile.key;
          return (
            <Pressable
              key={tile.key}
              onPress={() => setStage(active ? null : tile.key)}
              style={({ pressed }) => [
                styles.summaryCard,
                active && { borderWidth: 1.5, borderColor: tile.tone, backgroundColor: tile.bg },
                pressed ? { opacity: 0.6 } : null,
              ]}>
              <View style={[styles.summaryAccent, { backgroundColor: tile.tone }]} />
              <AppText size={19} family="InterSemiBold" color="black">{String(tile.count)}</AppText>
              <AppText size={11} color="black" opacity={0.5}>{tile.label}</AppText>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={{ paddingTop: 60 }}>
          <ActivityIndicator color={colors.navy} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadSummary();
                load(1, 'replace');
              }}
              colors={[colors.blue]}
            />
          }
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (!canLoadMore) return;
            setLoadingMore(true);
            load(page + 1, 'append');
          }}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.navy} /> : null}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 50, paddingHorizontal: 30 }}>
              <AppText size={15} family="InterSemiBold" color="black" opacity={0.7} align="center">
                No retailers found
              </AppText>
              <AppText size={12} color="black" opacity={0.45} align="center">
                {stage ? `No active retailer is at ${stageOf(stage).label}.` : 'Retailers with at least one loyalty invoice appear here.'}
              </AppText>
            </View>
          }
          renderItem={({ item }) => {
            const itemStage = stageOf(item.kyc_stage);
            const name = item.shop_name || item.owner_name || 'Retailer';
            return (
              <Pressable
                style={({ pressed }) => [styles.invoiceCard, pressed && { opacity: 0.75 }]}
                onPress={() => navigation.navigate('RetailerKyc', { retailerId: item.id, retailerName: name })}>
                <View style={styles.cardTop}>
                  <AppText size={14.5} family="InterSemiBold" color="black" numLines={1} style={{ flex: 1, marginRight: 8 }}>
                    {name}
                  </AppText>
                  <View style={[styles.statusPill, { backgroundColor: itemStage.bg }]}>
                    <AppText size={10.5} family="InterSemiBold" customColor={itemStage.tone}>{itemStage.label}</AppText>
                  </View>
                </View>
                {item.owner_name && item.owner_name !== name ? (
                  <AppText size={12} color="black" opacity={0.6} style={{ marginTop: 4 }}>{item.owner_name}</AppText>
                ) : null}
                <View style={styles.cardRow}>
                  <AppText size={12} color="black" opacity={0.5} numLines={1} style={{ flex: 1, marginRight: 8 }}>
                    {[item.customer_code, item.mobile_number, item.city_name].filter(Boolean).join('  ·  ')}
                  </AppText>
                  <AppText size={12} family="InterSemiBold" customColor={colors.primary}>
                    {item.kyc_stage === 'approved' ? 'View KYC ›' : 'Update KYC ›'}
                  </AppText>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
};

export default KycList;
