import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Toast from 'react-native-toast-message';
import AppText from '../../components/AppText/AppText';
import { useGetRetailerLoyalty } from '../../api/query/CustomerApi';
import { colors } from '../../utils/Colors';
import { rw } from '../../utils/responsive';
import { shadowStyle } from '../../utils/typography';
import { loyaltyStyles as s, money, points, shortDate, themeFor } from './loyaltyStyles';

type SchemeRow = {
  id: number;
  name: string;
  code?: string | null;
  tag?: string | null;
  based_on?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  scheme_status: string;
  status_label: string;
  is_live: boolean;
  days_remaining: number;
  invoice_count: number;
  invoice_amount: number;
  points_earned: number;
  points_expected: number;
  slab_count: number;
};

type RetailerHead = { id: number; name: string; shop_name?: string | null; code?: string | null; dealer_name?: string | null };
type Summary = { total_schemes: number; live_schemes: number; total_invoices: number; total_invoice_amount: number; points_earned: number; points_expected: number };

const emptySummary: Summary = {
  total_schemes: 0, live_schemes: 0, total_invoices: 0,
  total_invoice_amount: 0, points_earned: 0, points_expected: 0,
};

const RetailerLoyalty = ({ navigation, route }: any) => {
  const { retailerId, customerName } = route?.params || {};
  const { mutateAsync: getLoyalty } = useGetRetailerLoyalty();

  const [retailer, setRetailer] = useState<RetailerHead | null>(null);
  const [summary, setSummary] = useState<Summary>(emptySummary);
  const [schemes, setSchemes] = useState<SchemeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!retailerId) { setLoading(false); return; }
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const response: any = await getLoyalty({ retailer_id: retailerId });
      const body = response?.data;
      setRetailer(body?.retailer || null);
      setSummary({ ...emptySummary, ...(body?.summary || {}) });
      setSchemes(Array.isArray(body?.data) ? body.data : []);
    } catch (error: any) {
      Toast.show({ type: 'error', text1: error?.response?.data?.message || 'Unable to load loyalty' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [retailerId, getLoyalty]);

  useEffect(() => { load(); }, [load]);

  const renderScheme = ({ item }: { item: SchemeRow }) => {
    const theme = themeFor(item.scheme_status);
    return (
      <Pressable
        style={({ pressed }) => [s.card, pressed ? { opacity: 0.85 } : null]}
        onPress={() => navigation.navigate('RetailerSchemeDetail', {
          retailerId,
          schemeId: item.id,
          schemeName: item.name,
        })}
      >
        <View style={s.cardTopRow}>
          <View style={[s.statusPill, { backgroundColor: theme.pill }]}>
            <View style={[s.statusDot, { backgroundColor: theme.dot }]} />
            <AppText size={11.5} color={theme.pillText} family="InterBold" transform="uppercase" lineHeight={16}>
              {item.status_label}
            </AppText>
          </View>
          <AppText size={12} color="#94A3B8" family="InterMedium" lineHeight={16}>›</AppText>
        </View>

        <View style={{ marginTop: 9 }}>
          <AppText size={15.5} color="#0F172A" family="InterBold" numLines={2} lineHeight={21}>
            {item.name}
          </AppText>
        </View>
        {item.code ? (
          <View style={{ marginTop: 3 }}>
            <AppText size={12} color="#64748B" family="InterMedium" lineHeight={17}>{item.code}</AppText>
          </View>
        ) : null}

        <View style={s.metaRow}>
          <View style={s.tagPill}>
            <AppText size={11.5} color="#475569" family="InterSemiBold" lineHeight={16}>
              {item.tag || 'Regular'}
            </AppText>
          </View>
          <View style={s.tagPill}>
            <AppText size={11.5} color="#475569" family="InterSemiBold" lineHeight={16}>
              {shortDate(item.start_date)} – {shortDate(item.end_date)}
            </AppText>
          </View>
          {item.is_live && item.days_remaining > 0 ? (
            <View style={[s.tagPill, { backgroundColor: '#FFF4E0' }]}>
              <AppText size={11.5} color="#A05A00" family="InterBold" lineHeight={16}>
                {item.days_remaining} days left
              </AppText>
            </View>
          ) : null}
        </View>

        <View style={s.statGrid}>
          <View style={s.statCell}>
            <AppText size={11} color="#64748B" family="InterSemiBold" transform="uppercase" lineHeight={15}>Invoices</AppText>
            <AppText size={16} color="#0F172A" family="InterBold" lineHeight={22}>{item.invoice_count}</AppText>
          </View>
          <View style={s.statDivider} />
          <View style={s.statCell}>
            <AppText size={11} color="#64748B" family="InterSemiBold" transform="uppercase" lineHeight={15}>Business</AppText>
            <AppText size={16} color="#0F172A" family="InterBold" lineHeight={22} numLines={1}>
              {money(item.invoice_amount)}
            </AppText>
          </View>
          <View style={s.statDivider} />
          <View style={s.statCell}>
            <AppText size={11} color="#64748B" family="InterSemiBold" transform="uppercase" lineHeight={15}>Points</AppText>
            <AppText size={16} color="#0B6B43" family="InterBold" lineHeight={22} numLines={1}>
              {points(item.points_earned)}
            </AppText>
            {item.points_expected > 0 ? (
              <AppText size={11} color="#A05A00" family="InterMedium" lineHeight={15}>
                +{points(item.points_expected)} expected
              </AppText>
            ) : null}
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={s.container}>
      <View style={[s.hero, shadowStyle]}>
        <LinearGradient
          colors={['#5B3FBF', '#8257E5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.heroGradient}
        />
        <View style={s.heroContent}>
          <View style={s.heroBadge}>
            <AppText size={11} color="#FFFFFF" family="InterSemiBold" transform="uppercase" spacing={0.9} lineHeight={15}>
              Loyalty
            </AppText>
          </View>

          <View style={{ marginTop: 8 }}>
            <AppText size={20} color={colors.white} family="InterBold" numLines={2} lineHeight={27}>
              {retailer?.name || customerName || 'Retailer'}
            </AppText>
          </View>
          <View style={{ marginTop: 3 }}>
            <AppText size={12.5} color="#E4DAFB" family="InterMedium" numLines={1} lineHeight={18}>
              Dealer: {retailer?.dealer_name?.trim() || 'Not assigned'}
            </AppText>
          </View>

          <View style={s.heroStats}>
            <View style={s.heroStat}>
              <View style={s.heroLabelRow}>
                <AppText size={12} color="#E4DAFB" family="InterSemiBold" transform="uppercase" spacing={0.6} lineHeight={16}>
                  Points earned
                </AppText>
              </View>
              <View style={s.heroValueRow}>
                <AppText size={24} color="#C7F5DC" family="InterBold" lineHeight={32} numLines={1}>
                  {points(summary.points_earned)}
                </AppText>
              </View>
            </View>

            <View style={s.heroDivider} />

            <View style={s.heroStat}>
              <View style={s.heroLabelRow}>
                <AppText size={12} color="#E4DAFB" family="InterSemiBold" transform="uppercase" spacing={0.6} lineHeight={16}>
                  Business
                </AppText>
              </View>
              <View style={s.heroValueRow}>
                <AppText size={24} color={colors.white} family="InterBold" lineHeight={32} numLines={1}>
                  {money(summary.total_invoice_amount)}
                </AppText>
              </View>
            </View>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={s.state}><ActivityIndicator color={colors.blue} /></View>
      ) : (
        <FlatList
          data={schemes}
          keyExtractor={item => String(item.id)}
          renderItem={renderScheme}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[s.listBody, schemes.length === 0 ? s.emptyBody : null]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
          ListHeaderComponent={
            schemes.length > 0 ? (
              <View style={{ marginBottom: 10, paddingHorizontal: 2 }}>
                <AppText size={13} color="#334155" family="InterBold" transform="uppercase" spacing={0.5} lineHeight={18}>
                  Schemes ({summary.total_schemes})
                </AppText>
                <AppText size={12} color="#64748B" family="InterRegular" lineHeight={17}>
                  {summary.live_schemes} running now · {summary.total_invoices} invoices filed
                </AppText>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={s.state}>
              <AppText size={14.5} color="#334155" family="InterSemiBold" lineHeight={20}>No scheme yet</AppText>
              <AppText size={12.5} color="#64748B" family="InterRegular" align="center" lineHeight={18}>
                Schemes this retailer can earn on will appear here.
              </AppText>
            </View>
          }
        />
      )}
    </View>
  );
};

export default RetailerLoyalty;
