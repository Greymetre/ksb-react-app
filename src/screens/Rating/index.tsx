import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, FlatList, Image, Pressable, RefreshControl, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import AppText from '../../components/AppText/AppText';
import { colors } from '../../utils/Colors';
import { resolveMediaUrl } from '../../api/AxiosClient';
import { apiErrorMessage } from '../../utils/misc';
import {
  RatingDashboard,
  RatingRow,
  TopPerformer,
  TopPerformers,
  ratingApi,
} from '../../api/ratingApi';
import { ratingStyles as styles } from './styles';
import EmployeeRatingModal from './EmployeeRatingModal';
import { useAppSelector } from '../../components/redux/Store';
import { isAdminUser } from '../../utils/roles';

/** ASR and DSR are the two field designations these ratings are kept for. */
const DESIGNATIONS: { label: string; value: number }[] = [
  { label: 'ASR', value: 3 },
  { label: 'DSR', value: 6 },
];

const ratingTone = (value: number) => (value >= 75 ? '#16A34A' : value >= 50 ? '#D97706' : '#DC2626');

/** Two initials, used until somebody actually uploads a photo - which today is nobody. */
const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('') || '?';

/** A performer card half: designation, photo, name, branch/zone, rating, then a nod.
 *  Everything centred, so the two halves read as a matched pair. */
const PerformerHalf = ({ role, performer }: { role: string; performer: TopPerformer | null }) => {
  const photo = performer?.profileImage ? resolveMediaUrl(performer.profileImage) : '';
  return (
    <View style={styles.performerHalf}>
      {performer ? (
        <>
          <View style={styles.avatar}>
            {photo ? (
              <Image source={{ uri: photo }} style={styles.avatarImage} resizeMode="cover" />
            ) : (
              <AppText size={18} family="InterBold" color="white">
                {initialsOf(performer.name)}
              </AppText>
            )}
          </View>
          <AppText size={15} family="InterSemiBold" color="white" align="center" numLines={2}>
            {performer.name}
          </AppText>
          <AppText size={11} family="InterSemiBold" color="white" opacity={0.85} align="center">
            ({role})
          </AppText>
          <AppText size={11} color="white" opacity={0.8} align="center" numLines={2}>
            {[performer.branch, performer.zone].filter(Boolean).join(' · ') || '-'}
          </AppText>
          <AppText size={24} family="InterBold" color="white" align="center">
            {performer.rating.toFixed(2)}%
          </AppText>
          <AppText size={10} color="white" opacity={0.8} align="center" numLines={2}>
            🎉 Congratulations!
          </AppText>
        </>
      ) : (
        <>
          <View style={styles.avatar}>
            <AppText size={18} family="InterBold" color="white">
              {role}
            </AppText>
          </View>
          <AppText size={13} color="white" opacity={0.75} align="center">
            No rating
          </AppText>
        </>
      )}
    </View>
  );
};

/** One zone leader, as the marquee shows them: picture on the left, everything else
 *  stacked on the right - the same details the all-India card carries. */
type ZoneEntry = { zone: string; role: 'ASR' | 'DSR'; performer: TopPerformer };

const ZoneCard = ({ entry }: { entry: ZoneEntry }) => {
  const photo = entry.performer.profileImage ? resolveMediaUrl(entry.performer.profileImage) : '';
  return (
    <View style={styles.zoneCard}>
      <View style={styles.zoneAvatar}>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.avatarImage} resizeMode="cover" />
        ) : (
          <AppText size={22} family="InterBold" color={colors.blue}>
            {initialsOf(entry.performer.name)}
          </AppText>
        )}
      </View>
      <View style={styles.zoneDetails}>
        <AppText size={11} family="InterSemiBold" color={colors.blue}>
          {entry.zone}
        </AppText>
        <AppText size={13} family="InterSemiBold" color="black" numLines={1}>
          {entry.performer.name}
        </AppText>
        <AppText size={10} family="InterSemiBold" color="black" opacity={0.55}>
          ({entry.role})
        </AppText>
        <AppText size={10} color="black" opacity={0.55} numLines={1}>
          {[entry.performer.branch, entry.performer.zone].filter(Boolean).join(' · ') || '-'}
        </AppText>
        <AppText size={14} family="InterBold" color={ratingTone(entry.performer.rating)}>
          {entry.performer.rating.toFixed(2)}%
        </AppText>
      </View>
    </View>
  );
};

/**
 * A news-ticker strip: the cards drift left on their own, slowly and without stopping.
 *
 * The row is rendered twice and slid by exactly one copy's width before snapping back,
 * so the join is invisible and it reads as one endless band rather than a list that
 * rewinds. Driven natively, so scrolling the page underneath does not stutter it.
 */
const ZoneMarquee = ({ entries }: { entries: ZoneEntry[] }) => {
  const offset = useRef(new Animated.Value(0)).current;
  const runWidth = entries.length * styles.zoneCardStride;

  useEffect(() => {
    if (runWidth <= 0) return;
    offset.setValue(0);
    // Distance-based duration, so a longer strip is not a faster strip.
    const animation = Animated.loop(
      Animated.timing(offset, {
        toValue: -runWidth,
        duration: runWidth * 48,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [runWidth, offset]);

  return (
    <View style={styles.marqueeWindow} pointerEvents="none">
      <Animated.View style={[styles.marqueeRow, { transform: [{ translateX: offset }] }]}>
        {[...entries, ...entries].map((entry, index) => (
          <ZoneCard key={`${entry.zone}-${entry.role}-${index}`} entry={entry} />
        ))}
      </Animated.View>
    </View>
  );
};

const Rating = () => {
  const { user } = useAppSelector(state => state.auth);
  const allowed = isAdminUser(user);
  const [designation, setDesignation] = useState(DESIGNATIONS[0].value);
  const [dashboard, setDashboard] = useState<RatingDashboard | null>(null);
  const [top, setTop] = useState<TopPerformers | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRow, setSelectedRow] = useState<RatingRow | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (designationId: number, mode: 'initial' | 'refresh' = 'initial') => {
      if (mode === 'initial') setLoading(true);
      try {
        // The leaderboard does not move with the designation toggle, so both come back
        // together and only the listing is re-read when the toggle changes.
        const [board, performers] = await Promise.all([
          ratingApi.dashboard(designationId),
          top ? Promise.resolve(top) : ratingApi.topPerformers(),
        ]);
        setDashboard(board);
        setTop(performers);
      } catch (error) {
        Toast.show({ type: 'error', position: 'top', text1: apiErrorMessage(error, 'Unable to load ratings') });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [top],
  );

  useFocusEffect(
    useCallback(() => {
      // Not just hidden - not requested either. There is no reason to call the server
      // for a screen this user is not going to be shown.
      if (!allowed) {
        setLoading(false);
        return;
      }
      load(designation);
    }, [designation, allowed]),
  );

  const months = dashboard?.months ?? [];

  // One card per zone per designation, skipping the ones with nobody rated.
  const zoneEntries = useMemo<ZoneEntry[]>(
    () =>
      (top?.zones ?? []).flatMap(zone =>
        ([['ASR', zone.asr], ['DSR', zone.dsr]] as const)
          .filter(([, performer]) => !!performer)
          .map(([role, performer]) => ({ zone: zone.zone, role, performer: performer! })),
      ),
    [top],
  );

  const header = useMemo(
    () => (
      <View>
        {/* Heading sits above the card, centred, so both halves below it read as one set. */}
        <View style={styles.allIndiaHeading}>
          <AppText size={16} family="InterSemiBold" color="black" align="center">
            All India Top Performer
          </AppText>
          <AppText size={11} color="black" opacity={0.5} align="center">
            {top?.monthLabel || ''}
          </AppText>
        </View>
        <View style={styles.allIndiaCard}>
          <View style={styles.performerRow}>
            <PerformerHalf role="ASR" performer={top?.allIndia.asr ?? null} />
            <View style={styles.performerDivider} />
            <PerformerHalf role="DSR" performer={top?.allIndia.dsr ?? null} />
          </View>
        </View>

        {/* Zone leaders, one card per zone per designation, drifting past on their own. */}
        {zoneEntries.length > 0 && (
          <>
            <AppText size={16} family="InterSemiBold" color="black" align="center" style={styles.sectionTitle}>
              Zone Top Performers
            </AppText>
            <ZoneMarquee entries={zoneEntries} />
          </>
        )}

        <View style={styles.listHead}>
          <AppText size={13} family="InterSemiBold" color="black">
            Ratings {dashboard ? `(${dashboard.totalEmployees})` : ''}
          </AppText>
          <View style={styles.toggleRow}>
            {DESIGNATIONS.map(item => {
              const active = designation === item.value;
              return (
                <Pressable
                  key={item.value}
                  style={[styles.toggle, active && styles.toggleActive]}
                  onPress={() => setDesignation(item.value)}>
                  <AppText size={12} family="InterSemiBold" color={active ? 'white' : 'black'} opacity={active ? 1 : 0.6}>
                    {item.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>
        {dashboard ? (
          <AppText size={11} color="black" opacity={0.5} style={styles.periodLine}>
            {dashboard.periodLabel} · average {dashboard.averageRating.toFixed(2)}%
          </AppText>
        ) : null}
      </View>
    ),
    [top, dashboard, designation],
  );

  const renderRow = ({ item }: { item: RatingRow }) => (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => setSelectedRow(item)}>
      <View style={styles.rowHead}>
        <View style={styles.rowIdentity}>
          <AppText size={14} family="InterSemiBold" color="black" numLines={1}>
            {item.employeeName}
          </AppText>
          <AppText size={11} color="black" opacity={0.55} numLines={1}>
            {[item.employeeCode, item.branch, item.zone].filter(Boolean).join(' · ')}
          </AppText>
        </View>
        <View style={[styles.avgPill, { backgroundColor: ratingTone(item.averageRating) }]}>
          <AppText size={10} family="InterSemiBold" color="white" opacity={0.85}>
            AVG
          </AppText>
          <AppText size={14} family="InterBold" color="white">
            {item.averageRating.toFixed(1)}%
          </AppText>
        </View>
      </View>
      {/* Six months across, oldest first, so a trend reads left to right. */}
      <View style={styles.monthRow}>
        {months.map(month => {
          const value = item.monthlyRatings[month.key] ?? 0;
          return (
            <View key={month.key} style={styles.monthCell}>
              <AppText size={10} color="black" opacity={0.45}>
                {month.label}
                {month.inProgress ? '*' : ''}
              </AppText>
              <AppText size={12} family="InterSemiBold" color={ratingTone(value)}>
                {value.toFixed(0)}%
              </AppText>
            </View>
          );
        })}
      </View>
    </Pressable>
  );

  if (!allowed) {
    return (
      <View style={styles.comingSoon}>
        <AppText size={44}>🚀</AppText>
        <AppText size={19} family="InterBold" color="black" align="center">
          Coming Soon
        </AppText>
        <AppText size={13} color="black" opacity={0.55} align="center">
          Ratings are being prepared for your role. You will see them here once they are
          ready.
        </AppText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.blue} />
        </View>
      ) : (
        <FlatList
          data={dashboard?.rows ?? []}
          keyExtractor={item => String(item.userId)}
          ListHeaderComponent={header}
          renderItem={renderRow}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load(designation, 'refresh');
              }}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <AppText size={13} color="black" opacity={0.5}>
                No ratings to show
              </AppText>
            </View>
          }
        />
      )}

      <EmployeeRatingModal row={selectedRow} months={months} onClose={() => setSelectedRow(null)} />
    </View>
  );
};

export default Rating;
