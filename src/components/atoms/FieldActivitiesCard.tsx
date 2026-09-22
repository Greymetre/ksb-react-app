import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, Image, Pressable, StyleSheet, View} from 'react-native';
import AppText from '../AppText/AppText';
import {rw} from '../../utils/responsive';
import {activityApi} from '../../api/activityApi';
import { colors, BRAND_GRADIENT } from '../../utils/Colors';

type RoleTab = 'asr' | 'dsr';
type RangeTab = 'today' | 'month' | 'year';
type MeetStats = {meets: number; participants: number; gifts: number; expense: number};

const DEFINITIONS = [
  {key: 'retailer', label: 'Retailer Meet', image: require('../../assets/images/Dummy/DoublePerson.png'), color: '#eff2e8', tone: '#2563EB'},
  {key: 'nukkad', label: 'Nukkad Meet', image: require('../../assets/images/Dummy/location.png'), color: '#e1f5ee', tone: '#0F9F6E'},
  {key: 'farmer', label: 'Farmer Meet / Demo', image: require('../../assets/images/Dummy/wrench.png'), color: '#faeeda', tone: '#D97706'},
  {key: 'influencer', label: 'Influencer Meet', image: require('../../assets/images/Dummy/danger.png'), color: '#fcebeb', tone: '#DC2626'},
];

const RANGES: [RangeTab, string][] = [['year', 'This year'], ['month', 'This month'], ['today', 'Today']];
const ZERO: MeetStats = {meets: 0, participants: 0, gifts: 0, expense: 0};

/** Rupees as lakh, the way the business reads spend: ₹0 · ₹0.35 L · ₹12.4 L. */
const lakh = (rupees: number) => {
  if (!rupees) return '₹0';
  const value = rupees / 100000;
  return `₹${value >= 10 ? value.toFixed(1) : value.toFixed(2)} L`;
};

const count = (value: number) => Number(value || 0).toLocaleString('en-IN');

/**
 * Promotional Activities on the dashboard: for ASR or DSR and the chosen period, the meets held
 * with their participants, gifts and spend - in total on top, then per meet type. A server
 * without the per-type details sends meet counts only; those still show, the rest at zero.
 */
const FieldActivitiesCard = () => {
  const [role, setRole] = useState<RoleTab>('asr');
  const [range, setRange] = useState<RangeTab>('year');
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await activityApi.dashboardSummary(range);
      setSummary(response?.data?.data || null);
    } catch {
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => DEFINITIONS.map(item => {
    const detail = summary?.details?.[role]?.[item.key];
    const stats: MeetStats = detail
      ? {meets: Number(detail.meets || 0), participants: Number(detail.participants || 0), gifts: Number(detail.gifts || 0), expense: Number(detail.expense || 0)}
      : {...ZERO, meets: Number(summary?.[role]?.[item.key] || 0)};
    return {...item, stats};
  }), [summary, role]);

  const totals = useMemo(() => rows.reduce<MeetStats>((sum, row) => ({
    meets: sum.meets + row.stats.meets,
    participants: sum.participants + row.stats.participants,
    gifts: sum.gifts + row.stats.gifts,
    expense: sum.expense + row.stats.expense,
  }), ZERO), [rows]);

  const periodLabel = RANGES.find(([key]) => key === range)?.[1].toLowerCase() ?? '';

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.topTabs}>
          {(['asr', 'dsr'] as RoleTab[]).map(item => (
            <Pressable key={item} style={[styles.tab, role === item && styles.activeTab]} onPress={() => setRole(item)}>
              <AppText size={14} family="InterMedium" color={role === item ? '#fff' : '#64748B'}>{item.toUpperCase()}</AppText>
            </Pressable>
          ))}
        </View>
        <View style={styles.subTabs}>
          {RANGES.map(([key, label]) => (
            <Pressable key={key} style={[styles.subTab, range === key && styles.activeSubTab]} onPress={() => setRange(key)}>
              <AppText size={12} family="InterMedium" color={range === key ? '#8A5A08' : '#64748B'}>{label}</AppText>
            </Pressable>
          ))}
        </View>

        {loading ? <ActivityIndicator style={styles.loader} color="#8A5A08" /> : (
          <>
            {/* The totals for everything below, on the brand gradient. */}
            <View style={styles.hero}>
              <View style={styles.heroTop}>
                <View>
                  <AppText size={11} family="InterMedium" color="rgba(255,255,255,0.8)" style={styles.caps}>Total meets</AppText>
                  <AppText size={30} family="InterBold" color="#fff">{count(totals.meets)}</AppText>
                </View>
                <View style={styles.heroSpend}>
                  <AppText size={11} family="InterMedium" color="rgba(255,255,255,0.8)" style={styles.caps}>Total expense</AppText>
                  <AppText size={22} family="InterBold" color="#fff">{lakh(totals.expense)}</AppText>
                </View>
              </View>
              <View style={styles.heroStats}>
                <HeroStat label="Participants" value={count(totals.participants)} />
                <View style={styles.heroDivider} />
                <HeroStat label="Gifts" value={count(totals.gifts)} />
                <View style={styles.heroDivider} />
                <HeroStat label="Avg / meet" value={totals.meets ? count(Math.round(totals.participants / totals.meets)) : '0'} />
              </View>
            </View>

            {totals.meets === 0 ? (
              <View style={styles.empty}>
                <AppText size={14} family="InterSemiBold" color="#334155" align="center">No meets recorded {periodLabel}</AppText>
                <AppText size={12} color="#94A3B8" align="center" style={{marginTop: 4}}>Meets you or your team log will show here.</AppText>
              </View>
            ) : rows.map((item, index) => {
              const share = totals.meets ? Math.round((item.stats.meets / totals.meets) * 100) : 0;
              return (
                <View key={item.key} style={[styles.activityRow, index === rows.length - 1 && styles.lastRow]}>
                  <View style={[styles.iconContainer, {backgroundColor: item.color}]}>
                    <Image source={item.image} style={styles.activityImage} resizeMode="contain" />
                  </View>
                  <View style={styles.activityContent}>
                    <View style={styles.labelRow}>
                      <AppText size={15} family="InterSemiBold" color="#1F2937">{item.label}</AppText>
                      <View style={styles.meetCount}>
                        <AppText size={18} family="InterBold" customColor={item.tone}>{count(item.stats.meets)}</AppText>
                        <AppText size={11} color="#94A3B8"> {item.stats.meets === 1 ? 'meet' : 'meets'}</AppText>
                      </View>
                    </View>
                    <View style={styles.progressContainer}>
                      <View style={[styles.progressBar, {width: `${share}%` as any, backgroundColor: item.tone}]} />
                    </View>
                    <View style={styles.chips}>
                      <Chip icon="👥" value={count(item.stats.participants)} label="" />
                      <Chip icon="🎁" value={count(item.stats.gifts)} label="" />
                      <Chip icon="₹" value={lakh(item.stats.expense).replace('₹', '')} label="" strong />
                    </View>
                  </View>
                </View>
              );
            })}
          </>
        )}
      </View>
    </View>
  );
};

const HeroStat = ({label, value}: {label: string; value: string}) => (
  <View style={styles.heroStat}>
    <AppText size={17} family="InterBold" color="#fff">{value}</AppText>
    <AppText size={11} color="rgba(255,255,255,0.8)">{label}</AppText>
  </View>
);

const Chip = ({icon, value, label, strong}: {icon: string; value: string; label: string; strong?: boolean}) => (
  <View style={[styles.chip, strong && styles.chipStrong]}>
    <AppText size={11} color={strong ? '#8A5A08' : '#475569'}>{icon} </AppText>
    <AppText size={11} family="InterSemiBold" color={strong ? '#8A5A08' : '#1E293B'}>{value}</AppText>
    {label ? <AppText size={11} color="#64748B"> {label}</AppText> : null}
  </View>
);

const styles = StyleSheet.create({
  container: {paddingHorizontal: rw(19), marginTop: rw(16)},
  card: {backgroundColor: '#fff', borderRadius: 16, padding: rw(16), shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.06, shadowRadius: 10, elevation: 4},
  topTabs: {flexDirection: 'row', backgroundColor: '#f3f4f8', borderRadius: 30, padding: 6, marginBottom: rw(12)},
  tab: {flex: 1, paddingVertical: rw(6), alignItems: 'center', borderRadius: 26},
  activeTab: {backgroundColor: colors.primary, experimental_backgroundImage: BRAND_GRADIENT},
  subTabs: {flexDirection: 'row', gap: rw(8), marginBottom: rw(14)},
  subTab: {flex: 1, backgroundColor: '#fff', borderRadius: 30, paddingVertical: rw(6), alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb'},
  activeSubTab: {backgroundColor: '#FAF0DD', borderColor: '#8A5A08'},
  loader: {height: rw(260)},

  hero: {borderRadius: 14, padding: rw(14), backgroundColor: colors.primary, experimental_backgroundImage: BRAND_GRADIENT, marginBottom: rw(6)},
  heroTop: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'},
  heroSpend: {alignItems: 'flex-end'},
  caps: {letterSpacing: 0.6, textTransform: 'uppercase'},
  heroStats: {flexDirection: 'row', alignItems: 'center', marginTop: rw(12), paddingTop: rw(10), borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.25)'},
  heroStat: {flex: 1, alignItems: 'center'},
  heroDivider: {width: 1, height: rw(26), backgroundColor: 'rgba(255,255,255,0.25)'},

  empty: {paddingVertical: rw(26), paddingHorizontal: rw(10)},

  activityRow: {flexDirection: 'row', alignItems: 'flex-start', gap: rw(12), paddingVertical: rw(13), borderBottomWidth: 1, borderBottomColor: '#F1F5F9'},
  lastRow: {borderBottomWidth: 0},
  iconContainer: {width: rw(38), height: rw(38), borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 2},
  activityImage: {width: rw(22), height: rw(22)},
  activityContent: {flex: 1},
  labelRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  meetCount: {flexDirection: 'row', alignItems: 'baseline'},
  progressContainer: {height: rw(5), backgroundColor: '#EEF2F7', borderRadius: 999, overflow: 'hidden', marginTop: rw(7)},
  progressBar: {height: '100%', borderRadius: 999},
  chips: {flexDirection: 'row', flexWrap: 'wrap', gap: rw(6), marginTop: rw(8)},
  chip: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: rw(8), paddingVertical: rw(3), borderRadius: 999, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#EEF2F7'},
  chipStrong: {backgroundColor: '#FAF0DD', borderColor: '#EAD9B8'},
});

export default FieldActivitiesCard;
