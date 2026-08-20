import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Gallery from 'react-native-awesome-gallery';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ReactNativeBlobUtil from 'react-native-blob-util';
import DateTimePicker from '@react-native-community/datetimepicker';
import Toast from 'react-native-toast-message';
import { useSelector } from 'react-redux';
import { styles } from './styles';
import { rw } from '../../utils/responsive';
import AppText from '../../components/AppText/AppText';
import {
  ArrowDownIcon,
  CalenderIcon,
  CrossIcon,
  PlusAddIcon,
} from '../../assets/svgs/SvgsFile';
import { colors } from '../../utils/Colors';
import { shadowStyle } from '../../utils/typography';
import {
  EXPENSE_STATUS,
  EXPENSE_STATUS_LABEL,
  expenseApi,
  normalizeExpense,
} from '../../api/expenseApi';

const PAGE_SIZE = 20;

const STATUS_COLOR: Record<number, string> = {
  0: '#E78422',
  1: '#339D4F',
  2: '#FF3333',
  3: '#395299',
  4: '#395299',
  5: '#888888',
};

const STATUS_FILTERS: { value: number | null; label: string }[] = [
  { value: null, label: 'All status' },
  { value: EXPENSE_STATUS.pending, label: 'Pending' },
  { value: EXPENSE_STATUS.checked, label: 'Checked' },
  { value: EXPENSE_STATUS.checkedByReporting, label: 'Checked By Reporting' },
  { value: EXPENSE_STATUS.approved, label: 'Approved' },
  { value: EXPENSE_STATUS.rejected, label: 'Rejected' },
  { value: EXPENSE_STATUS.hold, label: 'Hold' },
];

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

const apiDate = (date: Date) => {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

const rangeLabel = (from: Date, to: Date) =>
  `${MONTHS[from.getMonth()]} ${from.getFullYear()} - ${MONTHS[to.getMonth()]} ${to.getFullYear()}`;

/** "2026-08-20" reads as "20 Aug 2026" on the cards. */
const readableDate = (value?: string | null) => {
  if (!value) return '-';
  const parts = String(value).slice(0, 10).split('-');
  if (parts.length !== 3) return String(value);
  const month = MONTHS[Number(parts[1]) - 1] ?? '';
  return `${parts[2]} ${month.charAt(0)}${month.slice(1).toLowerCase()} ${parts[0]}`;
};

const money = (value: number) =>
  `₹ ${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/** Images render as thumbnails; anything else (a PDF bill) gets a tappable tile. */
const isImageFile = (file: any) => {
  const mime = String(file?.mimeType || '').toLowerCase();
  const name = String(file?.fileName || '').toLowerCase();
  return mime.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|heic)$/.test(name);
};

const monthStart = () => {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), 1);
};

/** One-tap ranges, so the common periods need no calendar work at all. */
const RANGE_PRESETS: { label: string; range: () => [Date, Date] }[] = [
  {
    label: 'This month',
    range: () => [monthStart(), new Date()],
  },
  {
    label: 'Last month',
    range: () => {
      const today = new Date();
      return [
        new Date(today.getFullYear(), today.getMonth() - 1, 1),
        new Date(today.getFullYear(), today.getMonth(), 0),
      ];
    },
  },
  {
    label: 'Last 3 months',
    range: () => {
      const today = new Date();
      return [new Date(today.getFullYear(), today.getMonth() - 2, 1), today];
    },
  },
  {
    label: 'This year',
    range: () => {
      const today = new Date();
      return [new Date(today.getFullYear(), 0, 1), today];
    },
  },
];

const ExpenseReport = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const authUser = useSelector((state: any) => state?.auth?.user);
  const permissions: string[] = useMemo(
    () => (Array.isArray(authUser?.permissions) ? authUser.permissions : []),
    [authUser],
  );
  const can = useCallback((name: string) => permissions.includes(name), [permissions]);
  const canCheck = can('expense_checked') || can('expenses_authority');

  const [rows, setRows] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [me, setMe] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // "My" is the default; a manager can switch to the whole team or one person.
  const [scope, setScope] = useState<'my' | 'team'>('my');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [status, setStatus] = useState<number | null>(null);
  const [fromDate, setFromDate] = useState(monthStart());
  const [toDate, setToDate] = useState(new Date());

  const [userOpen, setUserOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [rangeOpen, setRangeOpen] = useState(false);
  const [rangeTarget, setRangeTarget] = useState<'from' | 'to'>('from');
  const [androidPicker, setAndroidPicker] = useState(false);

  const [detail, setDetail] = useState<any>(null);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [acting, setActing] = useState(false);

  const myId = me?.id ?? authUser?.id ?? null;
  const isTeamView = scope === 'team';

  const filters = useCallback(() => {
    const executiveId = isTeamView ? selectedUser?.id : myId;
    return {
      ...(executiveId ? { executive_id: executiveId } : {}),
      ...(status !== null ? { status } : {}),
      start_date: apiDate(fromDate),
      end_date: apiDate(toDate),
    };
  }, [isTeamView, selectedUser, myId, status, fromDate, toDate]);

  const load = useCallback(
    async (nextPage = 1) => {
      try {
        if (nextPage === 1) setLoading(true);
        else setLoadingMore(true);

        const response = await expenseApi.list(nextPage, filters(), PAGE_SIZE);
        const data = (response.data?.expenses || []).map(normalizeExpense);
        setRows(old => (nextPage === 1 ? data : [...old, ...data]));
        setTotal(Number(response.data?.total ?? data.length));
        setPage(nextPage);
      } catch (error: any) {
        Toast.show({
          type: 'error',
          text1: error?.response?.data?.message || 'Could not load expenses',
          position: 'top',
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [filters],
  );

  const loadSummary = useCallback(async () => {
    try {
      const response = await expenseApi.summary(filters());
      setSummary(response.data?.summary ?? null);
    } catch {
      setSummary(null);
    }
  }, [filters]);

  useEffect(() => {
    expenseApi
      .options()
      .then(response => {
        const options = response.data?.options || {};
        setMe(options.me ?? null);
        setUsers(options.users || []);
      })
      .catch(() => setUsers([]));
  }, []);

  // Coming back from the form must show the new row straight away.
  useFocusEffect(
    useCallback(() => {
      load(1);
      loadSummary();
    }, [load, loadSummary]),
  );

  const openDetail = useCallback(async (row: any) => {
    setDetail(row);
    setLogs([]);
    setLogsLoading(true);
    try {
      const response = await expenseApi.logs(row.id);
      setLogs(response.data?.logs || []);
    } catch {
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  const openRange = useCallback((target: 'from' | 'to') => {
    setRangeTarget(target);
    setRangeOpen(true);
    // Android has no inline calendar - the component opens the native dialog.
    if (Platform.OS === 'android') setAndroidPicker(true);
  }, []);

  const onPickDate = useCallback(
    (_: any, picked?: Date) => {
      if (Platform.OS === 'android') setAndroidPicker(false);
      if (!picked) return;
      if (rangeTarget === 'from') {
        setFromDate(picked);
        // Keep the range valid instead of silently returning nothing.
        if (picked > toDate) setToDate(picked);
        return;
      }
      setToDate(picked);
      if (picked < fromDate) setFromDate(picked);
    },
    [rangeTarget, fromDate, toDate],
  );

  /** PDFs open in the platform's own document preview, over the app. */
  const openPdf = useCallback(async (file: any) => {
    if (!file?.url) return;
    try {
      const fs = ReactNativeBlobUtil.fs;
      const destination = `${fs.dirs.DocumentDir}/${file.fileName}`;
      if (await fs.exists(destination)) await fs.unlink(destination);

      const saved = await ReactNativeBlobUtil.config({ path: destination, fileCache: true }).fetch(
        'GET',
        file.url,
      );

      if (Platform.OS === 'ios') {
        ReactNativeBlobUtil.ios.previewDocument(saved.path());
        return;
      }
      await ReactNativeBlobUtil.android.actionViewIntent(saved.path(), 'application/pdf');
    } catch {
      Toast.show({ type: 'error', text1: 'Could not open the PDF', position: 'top' });
    }
  }, []);

  const refreshAll = useCallback(() => {
    load(1);
    loadSummary();
  }, [load, loadSummary]);

  const markChecked = useCallback(async () => {
    if (!detail) return;
    setActing(true);
    try {
      const response = await expenseApi.checkByReporting(detail.id);
      Toast.show({
        type: 'success',
        text1: response.data?.message || 'Checked by reporting',
        position: 'top',
      });
      setDetail(null);
      refreshAll();
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: error?.response?.data?.message || 'Could not update the status',
        position: 'top',
      });
    } finally {
      setActing(false);
    }
  }, [detail, refreshAll]);

  const removeExpense = useCallback(async () => {
    if (!detail) return;
    setActing(true);
    try {
      const response = await expenseApi.remove(detail.id);
      Toast.show({
        type: 'success',
        text1: response.data?.message || 'Expense deleted',
        position: 'top',
      });
      setDetail(null);
      refreshAll();
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: error?.response?.data?.message || 'Could not delete the expense',
        position: 'top',
      });
    } finally {
      setActing(false);
    }
  }, [detail, refreshAll]);

  const renderItem = useCallback(
    ({ item }: any) => (
      <Pressable style={[styles.listItem, shadowStyle]} onPress={() => openDetail(item)}>
        <View style={[styles.row, { justifyContent: 'space-between' }]}>
          <View style={{ width: '52%' }}>
            <AppText color="black" family="InterSemiBold" size={16} numLines={1}>
              {item.userName || 'Expense'}
            </AppText>
            <AppText color="#888888" family="InterMedium" size={13}>
              #{item.id}
              {item.employeeCode ? ` · ${item.employeeCode}` : ''}
            </AppText>
          </View>
          <View style={{ width: '44%', alignItems: 'flex-end' }}>
            <AppText color="#395299" family="InterBold" size={18}>
              {money(item.claimAmount)}
            </AppText>
            <AppText color="#395299" family="InterSemiBold" size={14} numLines={1}>
              {item.expenseTypeName || '-'}
              {item.totalKm ? ` · ${item.totalKm} km` : ''}
            </AppText>
          </View>
        </View>

        <View style={styles.line} />

        <View style={[styles.row, { flex: 1, justifyContent: 'space-between', gap: 12 }]}>
          <View style={styles.firstPunchIN}>
            <AppText color="#888888" family="InterRegular" size={13}>
              Date
            </AppText>
            <AppText color="black" family="InterSemiBold" size={14}>
              {readableDate(item.date)}
            </AppText>
          </View>
          <View style={styles.firstPunchIN}>
            <AppText color="#888888" family="InterRegular" size={13}>
              Attachments
            </AppText>
            <AppText color="black" family="InterSemiBold" size={14}>
              {item.attachments.length ? `${item.attachments.length} file` : 'NA'}
            </AppText>
          </View>
          <View style={styles.firstPunchIN}>
            <AppText color="#888888" family="InterRegular" size={13}>
              Status
            </AppText>
            <AppText
              color={STATUS_COLOR[item.checkerStatus] || '#888888'}
              family="InterSemiBold"
              size={14}
              numLines={2}
            >
              {item.checkerStatusName || EXPENSE_STATUS_LABEL[item.checkerStatus]}
            </AppText>
          </View>
        </View>
      </Pressable>
    ),
    [openDetail],
  );

  // The viewer swipes across every image on this expense, not just the tapped one.
  const detailImages = useMemo<any[]>(
    () => (detail?.attachments || []).filter(isImageFile),
    [detail],
  );

  const detailIsPending = detail?.checkerStatus === EXPENSE_STATUS.pending;
  const detailIsMine = detail?.userId === myId;
  const canMarkChecked =
    canCheck &&
    !!detail &&
    (detail.checkerStatus === EXPENSE_STATUS.pending ||
      detail.checkerStatus === EXPENSE_STATUS.checked);

  // The list is the screen's scroller, so filters and totals ride along as its
  // header - a FlatList nested in a ScrollView would lose pull-to-refresh.
  const header = (
    <View>
      <View style={styles.filterRow}>
        <Pressable
          style={[styles.UserBox, styles.row, { justifyContent: 'space-between' }]}
          onPress={() => setUserOpen(true)}
        >
          <AppText size={14} color="#718096" family="InterRegular" numLines={1}>
            {!isTeamView ? 'My expenses' : selectedUser?.name || 'All users'}
          </AppText>
          <ArrowDownIcon />
        </Pressable>
        <Pressable
          style={[styles.UserBox, styles.row, { justifyContent: 'space-between' }]}
          onPress={() => setStatusOpen(true)}
        >
          <AppText size={14} color="#718096" family="InterRegular" numLines={1}>
            {STATUS_FILTERS.find(x => x.value === status)?.label}
          </AppText>
          <ArrowDownIcon />
        </Pressable>
      </View>

      <Pressable
        style={[styles.dateTimeBox, styles.row, { justifyContent: 'space-between' }]}
        onPress={() => (rangeOpen ? setRangeOpen(false) : openRange('from'))}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <AppText size={14} color="#718096" family="InterMedium">
            {rangeLabel(fromDate, toDate)}
          </AppText>
          <AppText size={11} color="#A0AEC0" family="InterRegular">
            {apiDate(fromDate)} to {apiDate(toDate)}
          </AppText>
        </View>
        <View style={[styles.calenderICon, styles.center]}>
          <CalenderIcon size={16} color={colors.blue} />
        </View>
      </Pressable>

      {rangeOpen ? (
        <View style={styles.calendarPanel}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {RANGE_PRESETS.map(preset => {
              const [presetFrom, presetTo] = preset.range();
              const active =
                apiDate(presetFrom) === apiDate(fromDate) && apiDate(presetTo) === apiDate(toDate);
              return (
                <Pressable
                  key={preset.label}
                  style={[styles.presetChip, active && styles.presetChipOn]}
                  onPress={() => {
                    setFromDate(presetFrom);
                    setToDate(presetTo);
                  }}
                >
                  <AppText
                    size={12}
                    color={active ? 'white' : '#4A5568'}
                    family="InterMedium"
                  >
                    {preset.label}
                  </AppText>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={[styles.row, { gap: 10 }]}>
            <Pressable
              style={[styles.rangeChip, rangeTarget === 'from' && styles.rangeChipOn]}
              onPress={() => openRange('from')}
            >
              <AppText
                size={11}
                color={rangeTarget === 'from' ? 'white' : '#718096'}
                family="InterMedium"
              >
                FROM
              </AppText>
              <AppText
                size={13}
                color={rangeTarget === 'from' ? 'white' : '#2D3748'}
                family="InterSemiBold"
              >
                {apiDate(fromDate)}
              </AppText>
            </Pressable>

            <Pressable
              style={[styles.rangeChip, rangeTarget === 'to' && styles.rangeChipOn]}
              onPress={() => openRange('to')}
            >
              <AppText
                size={11}
                color={rangeTarget === 'to' ? 'white' : '#718096'}
                family="InterMedium"
              >
                TO
              </AppText>
              <AppText
                size={13}
                color={rangeTarget === 'to' ? 'white' : '#2D3748'}
                family="InterSemiBold"
              >
                {apiDate(toDate)}
              </AppText>
            </Pressable>
          </View>

          {Platform.OS === 'ios' ? (
            <DateTimePicker
              value={rangeTarget === 'from' ? fromDate : toDate}
              mode="date"
              display="inline"
              themeVariant="light"
              style={styles.inlineCalendar}
              onChange={onPickDate}
            />
          ) : null}

          <Pressable style={styles.rangeDone} onPress={() => setRangeOpen(false)}>
            <AppText size={13} color="white" family="InterSemiBold">
              Done
            </AppText>
          </Pressable>
        </View>
      ) : null}

      {summary ? (
        <View style={[styles.row, styles.summaryStrip]}>
          <View style={styles.summaryCell}>
            <AppText size={12} color="#718096" family="InterRegular">
              Claimed
            </AppText>
            <AppText size={15} color={colors.blue} family="InterBold">
              {money(summary.claim_amount)}
            </AppText>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryCell}>
            <AppText size={12} color="#718096" family="InterRegular">
              Approved
            </AppText>
            <AppText size={15} color="#339D4F" family="InterBold">
              {money(summary.approve_amount)}
            </AppText>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryCell}>
            <AppText size={12} color="#718096" family="InterRegular">
              Pending
            </AppText>
            <AppText size={15} color="#E78422" family="InterBold">
              {summary.pending} of {summary.total}
            </AppText>
          </View>
        </View>
      ) : null}

      <View style={{ height: 16 }} />
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={loading ? [] : rows}
        keyExtractor={item => String(item.id)}
        renderItem={renderItem}
        style={{ paddingHorizontal: rw(18) }}
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={header}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              refreshAll();
            }}
          />
        }
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (!loading && !loadingMore && rows.length < total) load(page + 1);
        }}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={{ marginTop: 40 }} color={colors.blue} />
          ) : (
            <View style={{ paddingVertical: 50, alignItems: 'center' }}>
              <AppText size={14} color="#888888" family="InterMedium">
                No expenses in this period
              </AppText>
            </View>
          )
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator style={{ marginVertical: 16 }} color={colors.blue} />
          ) : null
        }
      />

      {can('expenses_create') ? (
        <Pressable style={styles.fab} onPress={() => navigation.navigate('AddNewExpense')}>
          <PlusAddIcon color={'white'} />
        </Pressable>
      ) : null}

      {/* -------------------------------------------------- user / scope picker */}
      <Modal
        visible={userOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setUserOpen(false)}
      >
        <Pressable style={styles.selectOverlay} onPress={() => setUserOpen(false)}>
          <View style={styles.selectSheet}>
            <AppText size={16} color="black" family="InterSemiBold">
              Whose expenses
            </AppText>
            <ScrollView style={{ maxHeight: 360, marginTop: 8 }}>
              <Pressable
                style={styles.selectRow}
                onPress={() => {
                  setScope('my');
                  setSelectedUser(null);
                  setUserOpen(false);
                }}
              >
                <AppText
                  size={15}
                  color={!isTeamView ? colors.blue : '#333333'}
                  family="InterMedium"
                >
                  {!isTeamView ? '✓  ' : '    '}My expenses
                </AppText>
              </Pressable>

              {users.length > 1 ? (
                <Pressable
                  style={styles.selectRow}
                  onPress={() => {
                    setScope('team');
                    setSelectedUser(null);
                    setUserOpen(false);
                  }}
                >
                  <AppText
                    size={15}
                    color={isTeamView && !selectedUser ? colors.blue : '#333333'}
                    family="InterMedium"
                  >
                    {isTeamView && !selectedUser ? '✓  ' : '    '}My team (all users)
                  </AppText>
                </Pressable>
              ) : null}

              {users
                .filter((user: any) => user.id !== myId)
                .map((user: any) => (
                  <Pressable
                    key={user.id}
                    style={styles.selectRow}
                    onPress={() => {
                      setScope('team');
                      setSelectedUser(user);
                      setUserOpen(false);
                    }}
                  >
                    <AppText
                      size={15}
                      color={selectedUser?.id === user.id ? colors.blue : '#333333'}
                      family="InterMedium"
                    >
                      {selectedUser?.id === user.id ? '✓  ' : '    '}
                      {user.name}
                    </AppText>
                  </Pressable>
                ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* -------------------------------------------------------- status picker */}
      <Modal
        visible={statusOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setStatusOpen(false)}
      >
        <Pressable style={styles.selectOverlay} onPress={() => setStatusOpen(false)}>
          <View style={styles.selectSheet}>
            <AppText size={16} color="black" family="InterSemiBold">
              Status
            </AppText>
            {STATUS_FILTERS.map(option => (
              <Pressable
                key={String(option.value)}
                style={styles.selectRow}
                onPress={() => {
                  setStatus(option.value);
                  setStatusOpen(false);
                }}
              >
                <AppText
                  size={15}
                  color={status === option.value ? colors.blue : '#333333'}
                  family="InterMedium"
                >
                  {status === option.value ? '✓  ' : '    '}
                  {option.label}
                </AppText>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      {Platform.OS === 'android' && androidPicker ? (
        <DateTimePicker
          value={rangeTarget === 'from' ? fromDate : toDate}
          mode="date"
          onChange={onPickDate}
        />
      ) : null}

      {/* -------------------------------------------------------------- detail */}
      <Modal
        visible={!!detail}
        transparent
        animationType="fade"
        onRequestClose={() => setDetail(null)}
      >
        <View style={styles.detailOverlay}>
          <Pressable style={styles.detailBackdrop} onPress={() => setDetail(null)} />

          <View style={styles.detailCard}>
            <View style={styles.detailHeader}>
              <AppText size={16} color="white" family="InterSemiBold">
                Expense #{detail?.id}
              </AppText>
              <Pressable
                style={styles.detailClose}
                hitSlop={16}
                onPress={() => setDetail(null)}
              >
                <CrossIcon />
              </Pressable>
            </View>

            <ScrollView
              style={{ flexGrow: 0 }}
              contentContainerStyle={styles.detailBody}
              showsVerticalScrollIndicator={false}
            >
              <View style={[styles.row, { gap: 16 }]}>
                <View style={styles.detailCell}>
                  <AppText size={13} family="InterMedium" color="#718096">
                    Employee
                  </AppText>
                  <AppText size={14} family="InterBold" color="black">
                    {detail?.userName || '-'}
                  </AppText>
                </View>
                <View style={styles.detailCell}>
                  <AppText size={13} family="InterMedium" color="#718096">
                    Date
                  </AppText>
                  <AppText size={14} family="InterBold" color="black">
                    {readableDate(detail?.date)}
                  </AppText>
                </View>
              </View>

              <View style={[styles.row, { gap: 16 }]}>
                <View style={styles.detailCell}>
                  <AppText size={13} family="InterMedium" color="#718096">
                    Expense Type
                  </AppText>
                  <AppText size={14} family="InterBold" color="black">
                    {detail?.expenseTypeName || '-'}
                  </AppText>
                </View>
                <View style={styles.detailCell}>
                  <AppText size={13} family="InterMedium" color="#718096">
                    Status
                  </AppText>
                  <AppText
                    size={14}
                    family="InterBold"
                    color={STATUS_COLOR[detail?.checkerStatus] || '#888888'}
                  >
                    {detail?.checkerStatusName || '-'}
                  </AppText>
                </View>
              </View>

              {detail?.totalKm ? (
                <View style={[styles.row, { gap: 16 }]}>
                  <View style={styles.detailCell}>
                    <AppText size={13} family="InterMedium" color="#718096">
                      Start / Stop Km
                    </AppText>
                    <AppText size={14} family="InterBold" color="black">
                      {detail?.startKm} - {detail?.stopKm}
                    </AppText>
                  </View>
                  <View style={styles.detailCell}>
                    <AppText size={13} family="InterMedium" color="#718096">
                      Total Km
                    </AppText>
                    <AppText size={14} family="InterBold" color="black">
                      {detail?.totalKm} km
                    </AppText>
                  </View>
                </View>
              ) : null}

              <View style={[styles.row, { gap: 16 }]}>
                <View style={styles.detailCell}>
                  <AppText size={13} family="InterMedium" color="#718096">
                    Claim Amount
                  </AppText>
                  <AppText size={14} family="InterBold" color={colors.blue}>
                    {money(detail?.claimAmount)}
                  </AppText>
                </View>
                <View style={styles.detailCell}>
                  <AppText size={13} family="InterMedium" color="#718096">
                    Approve Amount
                  </AppText>
                  <AppText size={14} family="InterBold" color="#339D4F">
                    {detail?.approveAmount ? money(detail.approveAmount) : '-'}
                  </AppText>
                </View>
              </View>

              {detail?.note ? (
                <View style={styles.detailCell}>
                  <AppText size={13} family="InterMedium" color="#718096">
                    Note
                  </AppText>
                  <AppText size={14} family="InterBold" color="black">
                    {detail.note}
                  </AppText>
                </View>
              ) : null}

              {detail?.reason ? (
                <View style={styles.detailCell}>
                  <AppText size={13} family="InterMedium" color="#718096">
                    Reason
                  </AppText>
                  <AppText size={14} family="InterBold" color="#FF3333">
                    {detail.reason}
                  </AppText>
                </View>
              ) : null}

              {detail?.attachments?.length ? (
                <View style={styles.detailCell}>
                  <AppText size={13} family="InterMedium" color="#718096">
                    Attachments
                  </AppText>
                  <View style={styles.attachmentRow}>
                    {detail.attachments.map((file: any) =>
                      isImageFile(file) ? (
                        <Pressable
                          key={file.id}
                          onPress={() => {
                            const index = detailImages.findIndex((x: any) => x.id === file.id);
                            setViewerIndex(index < 0 ? 0 : index);
                            setViewerOpen(true);
                          }}
                        >
                          <Image source={{ uri: file.url }} style={styles.attachmentThumb} />
                        </Pressable>
                      ) : (
                        <Pressable
                          key={file.id}
                          style={styles.attachmentDoc}
                          onPress={() => openPdf(file)}
                        >
                          <AppText size={14} color={colors.blue} family="InterBold">
                            PDF
                          </AppText>
                          <AppText size={10} color="#718096" family="InterRegular">
                            Tap to open
                          </AppText>
                        </Pressable>
                      ),
                    )}
                  </View>
                </View>
              ) : null}

              <View style={styles.detailCell}>
                <AppText size={13} family="InterMedium" color="#718096">
                  History
                </AppText>
                {logsLoading ? (
                  <ActivityIndicator color={colors.blue} />
                ) : logs.length ? (
                  logs.map((log: any) => (
                    <View
                      key={log.id}
                      style={[styles.row, { justifyContent: 'space-between', marginTop: 2 }]}
                    >
                      <AppText size={13} family="InterSemiBold" color="black">
                        {log.status_type}
                      </AppText>
                      <AppText size={12} family="InterRegular" color="#888888">
                        {readableDate(log.log_date)}
                        {log.created_by_name ? ` · ${log.created_by_name}` : ''}
                      </AppText>
                    </View>
                  ))
                ) : (
                  <AppText size={13} family="InterRegular" color="#888888">
                    No history yet
                  </AppText>
                )}
              </View>

              {canMarkChecked ? (
                <Pressable
                  style={[styles.buttonView, { marginTop: 6, marginBottom: 0 }]}
                  disabled={acting}
                  onPress={markChecked}
                >
                  <AppText size={15} color="white" family="InterBold">
                    {acting ? 'Please wait...' : 'Mark Checked By Reporting'}
                  </AppText>
                </Pressable>
              ) : null}

              {detailIsPending && detailIsMine ? (
                <View style={[styles.row, { gap: 10, marginTop: 4 }]}>
                  {can('expenses_edit') ? (
                    <Pressable
                      style={[styles.buttonView, { flex: 1, marginTop: 0, marginBottom: 0 }]}
                      onPress={() => {
                        const row = detail;
                        setDetail(null);
                        navigation.navigate('AddNewExpense', { expense: row });
                      }}
                    >
                      <AppText size={15} color="white" family="InterBold">
                        Edit
                      </AppText>
                    </Pressable>
                  ) : null}
                  {can('expenses_delete') ? (
                    <Pressable
                      style={[
                        styles.buttonView,
                        { flex: 1, marginTop: 0, marginBottom: 0, backgroundColor: '#FF3333' },
                      ]}
                      disabled={acting}
                      onPress={removeExpense}
                    >
                      <AppText size={15} color="white" family="InterBold">
                        Delete
                      </AppText>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
            </ScrollView>
          </View>

          {/* Stays inside the detail modal so it presents above it on both platforms. */}
          <Modal
            visible={viewerOpen}
            transparent={false}
            animationType="fade"
            onRequestClose={() => setViewerOpen(false)}
          >
            <View style={styles.viewerContainer}>
              <Pressable
                style={[styles.viewerClose, { marginTop: insets.top }]}
                hitSlop={12}
                onPress={() => setViewerOpen(false)}
              >
                <CrossIcon size={30} color="white" />
              </Pressable>
              <Gallery
                data={detailImages.map((file: any) => String(file.url))}
                initialIndex={viewerIndex}
                style={{ flex: 1 }}
                pinchEnabled
                doubleTapEnabled
                doubleTapScale={2.5}
                maxScale={6}
                disableSwipeUp
                disableVerticalSwipe
                loop={false}
              />
            </View>
          </Modal>
        </View>
      </Modal>
    </View>
  );
};

export default ExpenseReport;
