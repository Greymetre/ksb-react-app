import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import AppText from '../../components/AppText/AppText';
import { colors } from '../../utils/Colors';
import {
  INVOICE_STATUS_TONE,
  InvoiceDetail,
  InvoiceListItem,
  InvoiceSummary,
  invoiceApi,
} from '../../api/invoiceApi';
import { invoiceStyles as styles } from './styles';

const STATUS_FILTERS: { label: string; value: number | null }[] = [
  { label: 'All', value: null },
  { label: 'Pending', value: 0 },
  { label: 'In Process', value: 1 },
  { label: 'Approved', value: 3 },
  { label: 'On Hold', value: 5 },
  { label: 'Rejected', value: 4 },
];

const PAGE_SIZE = 10;

const money = (value: number) =>
  `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const shortDate = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

/**
 * Every invoice this user is allowed to see - their own retailers plus those of
 * anyone reporting to them. The list is what the API returns; nothing is filtered
 * again here, so what is counted on top is always what is listed below.
 */
const InvoiceList = ({ navigation }: any) => {
  const [items, setItems] = useState<InvoiceListItem[]>([]);
  const [summary, setSummary] = useState<InvoiceSummary | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<number | null>(null);
  const [selected, setSelected] = useState<InvoiceDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(
    async (nextPage: number, mode: 'replace' | 'append') => {
      try {
        const result = await invoiceApi.list({ page: nextPage, pageSize: PAGE_SIZE, search, status });
        setItems(old => (mode === 'append' ? [...old, ...result.items] : result.items));
        setSummary(result.summary);
        setTotal(result.total);
        setPage(nextPage);
      } catch (error: any) {
        Toast.show({
          type: 'error',
          position: 'top',
          text1: error?.response?.data?.message || 'Unable to load invoices',
        });
        if (mode === 'replace') setItems([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [search, status],
  );

  // Typing should not fire a request per keystroke.
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => load(1, 'replace'), 350);
    return () => clearTimeout(timer);
  }, [search, status, load]);

  // Coming back from the create screen must show what was just raised.
  useFocusEffect(
    useCallback(() => {
      load(1, 'replace');
    }, [load]),
  );

  const openDetail = useCallback(async (invoice: InvoiceListItem) => {
    setDetailLoading(true);
    try {
      setSelected(await invoiceApi.detail(invoice.id));
    } catch (error: any) {
      Toast.show({
        type: 'error',
        position: 'top',
        text1: error?.response?.data?.message || 'Unable to open this invoice',
      });
    } finally {
      setDetailLoading(false);
    }
  }, []);

  /** Only while nobody has acted on it: pending or on hold. */
  const editInvoice = useCallback(() => {
    if (!selected) return;
    const invoice = selected;
    setSelected(null);
    navigation.navigate('LoyaltyNewInvoice', { invoice });
  }, [navigation, selected]);

  const deleteInvoice = useCallback(() => {
    if (!selected) return;
    Alert.alert(
      'Delete this invoice?',
      `${selected.invoiceNumber || 'This invoice'} will be removed. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await invoiceApi.remove(selected.id);
              setSelected(null);
              Toast.show({ type: 'success', position: 'top', text1: 'Invoice deleted' });
              load(1, 'replace');
            } catch (error: any) {
              const message = error?.response?.data?.message;
              Toast.show({
                type: 'error',
                position: 'top',
                text1: typeof message === 'string' ? message : 'Could not delete the invoice',
              });
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  }, [load, selected]);

  const summaryCards = useMemo(
    () => [
      { label: 'Invoices', value: String(summary?.total ?? 0), tone: colors.blue },
      { label: 'Pending', value: String((summary?.pending ?? 0) + (summary?.hold ?? 0)), tone: '#D97706' },
      { label: 'Approved', value: String(summary?.approved ?? 0), tone: '#16A34A' },
    ],
    [summary],
  );

  const canLoadMore = items.length < total && !loadingMore && !loading;

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <View style={styles.searchWrap}>
          <AppText size={14} color="black" opacity={0.35}>⌕</AppText>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search retailer, shop or invoice number"
            placeholderTextColor="#9AA5B1"
            style={styles.searchInput}
          />
          {search ? (
            <Pressable onPress={() => setSearch('')} hitSlop={10}>
              <AppText size={16} color="black" opacity={0.35}>×</AppText>
            </Pressable>
          ) : null}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {STATUS_FILTERS.map(filter => {
            const active = status === filter.value;
            return (
              <Pressable
                key={filter.label}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setStatus(filter.value)}>
                <AppText size={12} family="InterMedium" color={active ? 'white' : 'black'} opacity={active ? 1 : 0.6}>
                  {filter.label}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.summaryRow}>
        {summaryCards.map(card => (
          <View key={card.label} style={styles.summaryCard}>
            <View style={[styles.summaryAccent, { backgroundColor: card.tone }]} />
            <AppText size={19} family="InterSemiBold" color="black">{card.value}</AppText>
            <AppText size={11} color="black" opacity={0.5}>{card.label}</AppText>
          </View>
        ))}
      </View>

      {loading ? (
        <View style={{ paddingTop: 60 }}>
          <ActivityIndicator color={colors.blue} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
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
          ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.blue} /> : null}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <AppText size={15} family="InterSemiBold" color="black" opacity={0.7} align="center">
                No invoices yet
              </AppText>
              <AppText size={12} color="black" opacity={0.45} align="center">
                Invoices you raise for your retailers will appear here.
              </AppText>
            </View>
          }
          renderItem={({ item }) => {
            const tone = INVOICE_STATUS_TONE[item.approvalStatus] || INVOICE_STATUS_TONE[0];
            return (
              <Pressable style={styles.invoiceCard} onPress={() => openDetail(item)}>
                <View style={styles.cardTop}>
                  <AppText size={14.5} family="InterSemiBold" color="black">{item.invoiceNumber || '-'}</AppText>
                  <View style={[styles.statusPill, { backgroundColor: tone.background }]}>
                    <AppText size={10.5} family="InterSemiBold" customColor={tone.text}>{item.statusLabel}</AppText>
                  </View>
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.cardRow}>
                  <View style={styles.metaLeft}>
                    <AppText size={13.5} family="InterMedium" color="black" numLines={1}>{item.retailerName || '-'}</AppText>
                    <AppText size={11} color="black" opacity={0.5} numLines={1}>{item.shopName}</AppText>
                  </View>
                  <AppText size={15} family="InterSemiBold" customColor={colors.blue}>{money(item.amount)}</AppText>
                </View>

                <View style={styles.cardRow}>
                  <AppText size={11} color="black" opacity={0.5} numLines={1}>
                    {item.dealerName ? `Dealer: ${item.dealerName}` : 'Dealer: -'}
                  </AppText>
                  <AppText size={11} color="black" opacity={0.5}>{shortDate(item.invoiceDate)}</AppText>
                </View>
              </Pressable>
            );
          }}
        />
      )}

      <Pressable style={styles.fab} onPress={() => navigation.navigate('LoyaltyNewInvoice')}>
        <AppText size={30} color="white" family="InterLight">+</AppText>
      </Pressable>

      <Modal visible={!!selected || detailLoading} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={() => setSelected(null)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            {detailLoading || !selected ? (
              <View style={{ padding: 40 }}>
                <ActivityIndicator color={colors.blue} />
              </View>
            ) : (
              <>
                <View style={styles.sheetHead}>
                  <View style={styles.cardTop}>
                    <AppText size={17} family="InterSemiBold" color="black">{selected.invoiceNumber || '-'}</AppText>
                    <View
                      style={[
                        styles.statusPill,
                        { backgroundColor: (INVOICE_STATUS_TONE[selected.approvalStatus] || INVOICE_STATUS_TONE[0]).background },
                      ]}>
                      <AppText
                        size={11}
                        family="InterSemiBold"
                        customColor={(INVOICE_STATUS_TONE[selected.approvalStatus] || INVOICE_STATUS_TONE[0]).text}>
                        {selected.statusLabel}
                      </AppText>
                    </View>
                  </View>
                  <AppText size={12} color="black" opacity={0.5}>{shortDate(selected.invoiceDate)}</AppText>
                </View>

                <ScrollView
                  style={styles.sheetScroll}
                  contentContainerStyle={{ padding: 20, paddingTop: 4, paddingBottom: 28 }}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled>
                  {[
                    ['Retailer', selected.retailerName],
                    ['Shop', selected.shopName],
                    ['Mobile', selected.mobile],
                    ['City', selected.city || '-'],
                    ['Dealer', selected.dealerName || '-'],
                    ['Scheme', selected.schemeName || '-'],
                    ['Amount', money(selected.amount)],
                    ['Points', String(selected.points || 0)],
                    ['Created by', selected.createdByName || '-'],
                  ].map(([label, value]) => (
                    <View key={label as string} style={styles.detailRow}>
                      <AppText size={12} color="black" opacity={0.45}>{label as string}</AppText>
                      <AppText size={12.5} family="InterMedium" color="black" align="right" style={{ flex: 1 }}>
                        {value as string}
                      </AppText>
                    </View>
                  ))}

                  {selected.approvalRemark ? (
                    <View style={{ marginTop: 14 }}>
                      <AppText size={12} color="black" opacity={0.45}>Remark</AppText>
                      <AppText size={12.5} family="InterMedium" color="black">{selected.approvalRemark}</AppText>
                    </View>
                  ) : null}

                  {selected.attachment ? (
                    <View style={styles.attachmentBox}>
                      <Image source={{ uri: selected.attachment }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
                    </View>
                  ) : null}

                  {selected.canEdit || selected.canDelete ? (
                    <View style={styles.detailActions}>
                      {selected.canEdit ? (
                        <Pressable style={[styles.detailAction, styles.editAction]} onPress={editInvoice} disabled={deleting}>
                          <AppText size={13} family="InterSemiBold" customColor={colors.blue}>Edit</AppText>
                        </Pressable>
                      ) : null}
                      {selected.canDelete ? (
                        <Pressable style={[styles.detailAction, styles.deleteAction]} onPress={deleteInvoice} disabled={deleting}>
                          <AppText size={13} family="InterSemiBold" customColor="#B91C1C">
                            {deleting ? 'Deleting...' : 'Delete'}
                          </AppText>
                        </Pressable>
                      ) : null}
                    </View>
                  ) : null}

                  {selected.approvalLogs?.length ? (
                    <View style={{ marginTop: 20 }}>
                      <AppText size={13} family="InterSemiBold" color="black">History</AppText>
                      {selected.approvalLogs.map((log, index) => (
                        <View key={index} style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                          <View style={styles.timelineDot} />
                          <View style={{ flex: 1 }}>
                            <AppText size={12.5} family="InterMedium" color="black" transform="capitalize">
                              {log.statusType}
                            </AppText>
                            <AppText size={11} color="black" opacity={0.5}>
                              {(log.by || '-') + ' · ' + shortDate(log.at)}
                            </AppText>
                            {log.remark ? (
                              <AppText size={11.5} color="black" opacity={0.7}>{log.remark}</AppText>
                            ) : null}
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default InvoiceList;
