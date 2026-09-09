import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Toast from 'react-native-toast-message';
import AppText from '../../components/AppText/AppText';
import { useGetRetailerSchemeDetail } from '../../api/query/CustomerApi';
import { colors } from '../../utils/Colors';
import { rw } from '../../utils/responsive';
import { shadowStyle } from '../../utils/typography';
import { loyaltyStyles as s, money, points, shortDate, themeFor } from './loyaltyStyles';
import AttachmentViewer from '../../components/AttachmentViewer';

type Slab = { tier_name?: string | null; value_from: number; value_to: number; reward_value: number; reward_type?: string | null; reward_label?: string | null; is_achieved: boolean };
type SchemeInvoice = {
  id: number; invoice_number: string; invoice_date: string; amount: number;
  approval_status: number; status_label: string; points_earned: number; points_expected: number;
};

/**
 * Only used against a server that does not yet write the reward out itself. The type
 * has to match exactly: a mixed scheme's own Based On reads "Value + Percentage",
 * which contains the word and would put a % on every slab. When that is all we have,
 * the figure is shown bare rather than given the wrong unit.
 */
const slabFallback = (type: string | null | undefined, value: number) => {
  const kind = (type || '').trim().toLowerCase();
  if (kind === 'percentage') return `${value}%`;
  if (kind === 'value + percentage') return String(value);
  return money(value);
};

const statusTint = (status: number) => {
  if (status === 3) return { bg: '#E7F7EF', text: '#0B6B43' };
  if (status === 4) return { bg: '#FDECEC', text: '#B42318' };
  if (status === 5) return { bg: '#EFEAFF', text: '#5B45C9' };
  if (status === 0) return { bg: '#FFF4E0', text: '#A05A00' };
  return { bg: '#E8F1FF', text: '#2B4A8B' };
};

const RetailerSchemeDetail = ({ route }: any) => {
  const { retailerId, schemeId, schemeName } = route?.params || {};
  const { mutateAsync: getDetail } = useGetRetailerSchemeDetail();

  const [retailer, setRetailer] = useState<any>(null);
  const [scheme, setScheme] = useState<any>(null);
  // The brochure opens in the viewer an invoice attachment already uses.
  const [brochureIndex, setBrochureIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!retailerId || !schemeId) { setLoading(false); return; }
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const response: any = await getDetail({ retailer_id: retailerId, scheme_id: schemeId });
      setRetailer(response?.data?.retailer || null);
      setScheme(response?.data?.data || null);
    } catch (error: any) {
      Toast.show({ type: 'error', text1: error?.response?.data?.message || 'Unable to load scheme' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [retailerId, schemeId, getDetail]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <View style={[s.container, s.state]}><ActivityIndicator color={colors.blue} /></View>;
  }

  if (!scheme) {
    return (
      <View style={[s.container, s.state]}>
        <AppText size={14.5} color="#334155" family="InterSemiBold" lineHeight={20}>Scheme unavailable</AppText>
        <AppText size={12.5} color="#64748B" family="InterRegular" align="center" lineHeight={18}>
          {schemeName ? `${schemeName} could not be loaded.` : 'Please try again.'}
        </AppText>
      </View>
    );
  }

  const theme = themeFor(scheme.scheme_status);
  const summary = scheme.summary || {};
  const progress = scheme.progress || {};
  const slabs: Slab[] = Array.isArray(scheme.slabs) ? scheme.slabs : [];
  const invoices: SchemeInvoice[] = Array.isArray(scheme.invoices) ? scheme.invoices : [];
  const percent = Math.max(0, Math.min(100, Number(progress.percent_to_next_tier) || 0));

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={{ paddingBottom: 28 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
    >
      <View style={[s.hero, shadowStyle]}>
        <LinearGradient
          colors={[theme.from, theme.to]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.heroGradient}
        />
        <View style={s.heroContent}>
          <View style={s.heroBadge}>
            <AppText size={11} color="#FFFFFF" family="InterSemiBold" transform="uppercase" spacing={0.9} lineHeight={15}>
              {scheme.status_label}
              {scheme.is_live && scheme.days_remaining > 0 ? ` · ${scheme.days_remaining} days left` : ''}
            </AppText>
          </View>

          <View style={{ marginTop: 8 }}>
            <AppText size={20} color={colors.white} family="InterBold" numLines={3} lineHeight={27}>
              {scheme.name}
            </AppText>
          </View>
          {scheme.code ? (
            <View style={{ marginTop: 3 }}>
              <AppText size={12.5} color="rgba(255,255,255,0.85)" family="InterMedium" lineHeight={18}>
                {scheme.code} · {scheme.tag} · {scheme.based_on === 'Value + Percentage' ? 'Value & % based' : scheme.based_on === 'Percentage' ? '% based' : 'Value based'}
              </AppText>
            </View>
          ) : null}
          <View style={{ marginTop: 2 }}>
            <AppText size={12.5} color="rgba(255,255,255,0.85)" family="InterMedium" lineHeight={18}>
              {shortDate(scheme.start_date)} – {shortDate(scheme.end_date)}
            </AppText>
          </View>
          {scheme.scheme_note ? (
            <View style={{ marginTop: 6 }}>
              <AppText size={12} color="rgba(255,255,255,0.9)" family="InterMedium" lineHeight={17}>
                {scheme.scheme_note}
              </AppText>
            </View>
          ) : null}
          {scheme.brochure_url ? (
            <Pressable style={local.brochure} onPress={() => setBrochureIndex(0)}>
              <AppText size={12} family="InterSemiBold" color={colors.white}>View Scheme PDF</AppText>
            </Pressable>
          ) : null}

          <View style={s.heroStats}>
            <View style={s.heroStat}>
              <View style={s.heroLabelRow}>
                <AppText size={12} color="rgba(255,255,255,0.85)" family="InterSemiBold" transform="uppercase" spacing={0.6} lineHeight={16}>
                  Points earned
                </AppText>
              </View>
              <View style={s.heroValueRow}>
                <AppText size={24} color={colors.white} family="InterBold" lineHeight={32} numLines={1}>
                  {points(summary.points_earned)}
                </AppText>
              </View>
            </View>
            <View style={s.heroDivider} />
            <View style={s.heroStat}>
              <View style={s.heroLabelRow}>
                <AppText size={12} color="rgba(255,255,255,0.85)" family="InterSemiBold" transform="uppercase" spacing={0.6} lineHeight={16}>
                  Expected
                </AppText>
              </View>
              <View style={s.heroValueRow}>
                <AppText size={24} color="#FFE7B8" family="InterBold" lineHeight={32} numLines={1}>
                  {points(summary.points_expected)}
                </AppText>
              </View>
            </View>
          </View>
        </View>
      </View>

      <View style={local.section}>
        <AppText size={12.5} color="#64748B" family="InterMedium" lineHeight={18} numLines={2}>
          {retailer?.name || 'Retailer'}
          {retailer?.dealer_name ? `  ·  Dealer: ${retailer.dealer_name}` : ''}
        </AppText>
      </View>

      {/* Progress to the next slab, measured on HO-approved business only. */}
      <View style={[local.block, { marginTop: 4 }]}>
        <View style={local.progressHead}>
          <View style={{ flex: 1 }}>
            <AppText size={11.5} color="#64748B" family="InterSemiBold" transform="uppercase" lineHeight={16}>
              Approved business
            </AppText>
            <AppText size={21} color="#0F172A" family="InterBold" lineHeight={28} numLines={1}>
              {money(progress.achieved_amount)}
            </AppText>
          </View>
          <View style={[s.tagPill, { backgroundColor: progress.current_tier ? '#E7F7EF' : '#F1F5F9' }]}>
            <AppText
              size={11.5}
              color={progress.current_tier ? '#0B6B43' : '#64748B'}
              family="InterBold"
              lineHeight={16}
            >
              {progress.current_tier ? `Tier ${progress.current_tier}` : 'No tier yet'}
            </AppText>
          </View>
        </View>

        <View style={local.track}>
          <View style={[local.fill, { width: `${percent}%`, backgroundColor: theme.dot }]} />
        </View>

        <AppText size={12} color="#475569" family="InterMedium" lineHeight={17} style={{ marginTop: 8 }}>
          {progress.next_tier
            ? `${money(progress.amount_to_next_tier)} more to reach tier ${progress.next_tier}`
            : 'Top tier reached'}
        </AppText>
      </View>

      <View style={local.block}>
        <AppText size={13} color="#334155" family="InterBold" transform="uppercase" spacing={0.5} lineHeight={18}>
          This retailer
        </AppText>
        <View style={local.grid}>
          <Stat label="Invoices" value={String(summary.total_invoices ?? 0)} />
          <Stat label="Approved" value={String(summary.approved_invoices ?? 0)} tone="#0B6B43" />
          <Stat label="In review" value={String(summary.pending_invoices ?? 0)} tone="#A05A00" />
          <Stat label="Rejected" value={String(summary.rejected_invoices ?? 0)} tone="#B42318" />
          <Stat label="Total value" value={money(summary.total_invoice_amount)} />
          <Stat label="In review value" value={money(summary.expected_invoice_amount)} />
        </View>
      </View>

      {slabs.length > 0 ? (
        <View style={local.block}>
          <AppText size={13} color="#334155" family="InterBold" transform="uppercase" spacing={0.5} lineHeight={18}>
            Slabs
          </AppText>
          {slabs.map((slab, index) => (
            <View key={`${slab.tier_name}-${index}`} style={[local.slabRow, index === slabs.length - 1 ? { borderBottomWidth: 0 } : null]}>
              <View style={[local.slabTick, slab.is_achieved ? { backgroundColor: '#0B6B43', borderColor: '#0B6B43' } : null]}>
                <AppText size={11} color={slab.is_achieved ? colors.white : '#94A3B8'} family="InterBold" lineHeight={15}>
                  {slab.is_achieved ? '✓' : String(index + 1)}
                </AppText>
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <AppText size={13.5} color="#0F172A" family="InterSemiBold" lineHeight={19}>
                  {slab.tier_name || `Tier ${index + 1}`}
                </AppText>
                <AppText size={12} color="#64748B" family="InterRegular" lineHeight={17}>
                  {money(slab.value_from)} – {money(slab.value_to)}
                </AppText>
              </View>
              <View style={[s.tagPill, { backgroundColor: slab.is_achieved ? '#E7F7EF' : '#F1F5F9' }]}>
                <AppText size={12} color={slab.is_achieved ? '#0B6B43' : '#475569'} family="InterBold" lineHeight={17}>
                  {/* The server labels each slab: a mixed scheme pays some in rupees and
                      some as a percentage, so the scheme alone cannot say which. */}
                  {slab.reward_label || slabFallback(slab.reward_type ?? scheme.based_on, slab.reward_value)}
                </AppText>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <View style={local.block}>
        <AppText size={13} color="#334155" family="InterBold" transform="uppercase" spacing={0.5} lineHeight={18}>
          Invoices ({invoices.length})
        </AppText>
        {invoices.length === 0 ? (
          <AppText size={12.5} color="#64748B" family="InterRegular" lineHeight={18} style={{ marginTop: 8 }}>
            No invoice filed under this scheme yet.
          </AppText>
        ) : invoices.map((invoice, index) => {
          const tint = statusTint(invoice.approval_status);
          return (
            <View key={invoice.id} style={[local.invoiceRow, index === invoices.length - 1 ? { borderBottomWidth: 0 } : null]}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <AppText size={13.5} color="#0F172A" family="InterSemiBold" lineHeight={19} numLines={1}>
                  {invoice.invoice_number}
                </AppText>
                <AppText size={12} color="#64748B" family="InterRegular" lineHeight={17}>
                  {shortDate(invoice.invoice_date)} · {money(invoice.amount)}
                </AppText>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <View style={[s.tagPill, { backgroundColor: tint.bg }]}>
                  <AppText size={11.5} color={tint.text} family="InterBold" lineHeight={16}>
                    {invoice.status_label}
                  </AppText>
                </View>
                <AppText
                  size={12}
                  color={invoice.points_earned > 0 ? '#0B6B43' : '#A05A00'}
                  family="InterSemiBold"
                  lineHeight={17}
                  style={{ marginTop: 4 }}
                >
                  {invoice.points_earned > 0
                    ? `${points(invoice.points_earned)} pts`
                    : invoice.points_expected > 0
                      ? `${points(invoice.points_expected)} pts expected`
                      : '—'}
                </AppText>
              </View>
            </View>
          );
        })}
      </View>

      <AttachmentViewer
        files={scheme.brochure_url
          ? [{ url: scheme.brochure_url, fileName: 'Scheme brochure', mimeType: 'application/pdf' }]
          : []}
        index={brochureIndex}
        onClose={() => setBrochureIndex(null)}
      />
    </ScrollView>
  );
};

const Stat = ({ label, value, tone }: { label: string; value: string; tone?: string }) => (
  <View style={local.gridCell}>
    <AppText size={11} color="#64748B" family="InterSemiBold" transform="uppercase" lineHeight={15}>{label}</AppText>
    <AppText size={16} color={tone || '#0F172A'} family="InterBold" lineHeight={22} numLines={1}>{value}</AppText>
  </View>
);

const local = StyleSheet.create({
  // The scheme brochure button, on the dark hero, so it borrows the same translucent
  // white the code and dates above it use rather than introducing a new colour.
  brochure: {
    marginTop: 10, alignSelf: 'flex-start', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 9,
    backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
  },
  section: { paddingHorizontal: rw(18), marginTop: 12 },
  block: {
    backgroundColor: colors.white, borderRadius: rw(16), marginHorizontal: rw(14), marginTop: 12,
    padding: rw(14), borderWidth: 1, borderColor: '#E2E8F0',
  },
  progressHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  track: { height: 9, borderRadius: 999, backgroundColor: '#EEF2F7', overflow: 'hidden' },
  fill: { height: 9, borderRadius: 999 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 },
  gridCell: { width: '50%', paddingVertical: 8, paddingRight: 8 },

  slabRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: '#F0F3F7',
  },
  slabTick: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: '#CBD5E1',
    alignItems: 'center', justifyContent: 'center',
  },
  invoiceRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: '#F0F3F7',
  },
});

export default RetailerSchemeDetail;
