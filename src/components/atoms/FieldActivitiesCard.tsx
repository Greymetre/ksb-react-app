import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, Image, Pressable, StyleSheet, View} from 'react-native';
import AppText from '../AppText/AppText';
import {rw} from '../../utils/responsive';
import {activityApi} from '../../api/activityApi';

type RoleTab = 'asr' | 'dsr';
type RangeTab = 'today' | 'month' | 'year';

const DEFINITIONS = [
  {key: 'retailer', label: 'Retailer Meet', image: require('../../assets/images/Dummy/DoublePerson.png'), color: '#eff2e8'},
  {key: 'nukkad', label: 'Nukkad Meet', image: require('../../assets/images/Dummy/location.png'), color: '#e1f5ee'},
  {key: 'farmer', label: 'Farmer Meet / Demo', image: require('../../assets/images/Dummy/wrench.png'), color: '#faeeda'},
  {key: 'influencer', label: 'Influencer Meet', image: require('../../assets/images/Dummy/danger.png'), color: '#fcebeb'},
];

const EMPTY = {asr: {retailer: 0, nukkad: 0, farmer: 0, influencer: 0}, dsr: {retailer: 0, nukkad: 0, farmer: 0, influencer: 0}};

const FieldActivitiesCard = () => {
  const [role, setRole] = useState<RoleTab>('asr');
  const [range, setRange] = useState<RangeTab>('today');
  const [summary, setSummary] = useState<any>(EMPTY);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await activityApi.dashboardSummary(range);
      setSummary(response?.data?.data || EMPTY);
    } catch {
      setSummary(EMPTY);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { load(); }, [load]);

  const values = summary?.[role] || EMPTY[role];
  const total = useMemo(() => DEFINITIONS.reduce((sum, item) => sum + Number(values?.[item.key] || 0), 0), [values]);

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
          {([['today', 'Today'], ['month', 'This month'], ['year', 'This year']] as [RangeTab, string][]).map(([key, label]) => (
            <Pressable key={key} style={[styles.subTab, range === key && styles.activeSubTab]} onPress={() => setRange(key)}>
              <AppText size={12} family="InterMedium" color={range === key ? '#1E40AF' : '#64748B'}>{label}</AppText>
            </Pressable>
          ))}
        </View>
        {loading ? <ActivityIndicator style={styles.loader} color="#3a4da0" /> : DEFINITIONS.map((item, index) => {
          const value = Number(values?.[item.key] || 0);
          const width = total ? `${Math.round((value / total) * 100)}%` : '0%';
          return (
            <View key={item.key} style={[styles.activityRow, index === DEFINITIONS.length - 1 && styles.lastRow]}>
              <View style={[styles.iconContainer, {backgroundColor: item.color}]}><Image source={item.image} style={styles.activityImage} resizeMode="contain" /></View>
              <View style={styles.activityContent}>
                <View style={styles.labelRow}>
                  <AppText size={16} family="InterMedium" color="#1F2937">{item.label}</AppText>
                  <AppText size={17} family="InterSemiBold" color="#3a4da0">{value}</AppText>
                </View>
                <View style={styles.progressContainer}><View style={[styles.progressBar, {width: width as any}]} /></View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {paddingHorizontal: rw(19), marginTop: rw(16)},
  card: {backgroundColor: '#fff', borderRadius: 16, padding: rw(16), shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.06, shadowRadius: 10, elevation: 4},
  topTabs: {flexDirection: 'row', backgroundColor: '#f3f4f8', borderRadius: 30, padding: 6, marginBottom: rw(12)},
  tab: {flex: 1, paddingVertical: rw(6), alignItems: 'center', borderRadius: 26},
  activeTab: {backgroundColor: '#3a4da0'},
  subTabs: {flexDirection: 'row', gap: rw(8), marginBottom: rw(10)},
  subTab: {flex: 1, backgroundColor: '#fff', borderRadius: 30, paddingVertical: rw(6), alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb'},
  activeSubTab: {backgroundColor: '#e8eaf2', borderColor: '#3a4da0'},
  loader: {height: rw(220)},
  activityRow: {flexDirection: 'row', alignItems: 'center', gap: rw(12), paddingVertical: rw(13), borderBottomWidth: 1, borderBottomColor: '#F1F5F9'},
  lastRow: {borderBottomWidth: 0},
  iconContainer: {width: rw(36), height: rw(36), borderRadius: 8, justifyContent: 'center', alignItems: 'center'},
  activityImage: {width: rw(22), height: rw(22)},
  activityContent: {flex: 1},
  labelRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  progressContainer: {height: rw(4), backgroundColor: '#E2E8F0', borderRadius: 999, overflow: 'hidden', marginTop: rw(8)},
  progressBar: {height: '100%', backgroundColor: '#3a4da0', borderRadius: 999},
});

export default FieldActivitiesCard;
