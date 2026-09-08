import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import Toast from 'react-native-toast-message';
import AppText from '../../components/AppText/AppText';
import { colors } from '../../utils/Colors';
import { SCHEME_TONE, SchemeCard, SchemeDetail, schemeApi } from '../../api/schemeApi';
import { apiErrorMessage } from '../../utils/misc';
import { schemeStyles as styles } from './styles';

const money = (value: number) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const shortDate = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

/** "Branch: Patna, Indore" - why this scheme is on this user's screen. */
const areaLine = (scheme: SchemeCard) => {
  const scope = (scheme.areaScope || 'All').trim();
  if (!scope || scope.toLowerCase() === 'all') return 'All areas';
  if (scheme.areaValues.length === 0) return scope;
  return `${scope}: ${scheme.areaValues.join(', ')}`;
};

/**
 * The schemes this user's retailers qualify for. A scheme written for one branch, zone
 * or state only reaches the people working that area, which is decided by the API - the
 * screen shows what it is given.
 */
const SchemeList = () => {
  const [schemes, setSchemes] = useState<SchemeCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [detail, setDetail] = useState<SchemeDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setSchemes(await schemeApi.list());
    } catch (error) {
      Toast.show({ type: 'error', position: 'top', text1: apiErrorMessage(error, 'Unable to load schemes') });
      setSchemes([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const open = useCallback(async (scheme: SchemeCard) => {
    setDetailLoading(true);
    try {
      setDetail(await schemeApi.detail(scheme.id));
    } catch (error) {
      Toast.show({ type: 'error', position: 'top', text1: apiErrorMessage(error, 'Unable to open this scheme') });
    } finally {
      setDetailLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <View style={{ paddingTop: 60 }}>
        <ActivityIndicator color={colors.blue} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={schemes}
        keyExtractor={scheme => String(scheme.id)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            colors={[colors.blue]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <AppText size={15} family="InterSemiBold" color="black" opacity={0.7} align="center">No schemes yet</AppText>
            <AppText size={12} color="black" opacity={0.45} align="center">
              Schemes running for your retailers' area will appear here.
            </AppText>
          </View>
        }
        renderItem={({ item }) => {
          const tone = SCHEME_TONE[item.status];
          return (
            <Pressable style={styles.card} onPress={() => open(item)}>
              <View style={[styles.accent, { backgroundColor: tone.accent }]} />
              <View style={styles.cardBody}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <AppText size={15} family="InterSemiBold" color="black" numLines={2}>{item.name}</AppText>
                    {item.code ? (
                      <AppText size={11} color="black" opacity={0.45}>{item.code}</AppText>
                    ) : null}
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: tone.background }]}>
                    <AppText size={10.5} family="InterSemiBold" customColor={tone.text}>{item.statusLabel}</AppText>
                  </View>
                </View>

                <View style={styles.chipRow}>
                  <View style={styles.chip}>
                    <AppText size={10.5} family="InterMedium" color="black" opacity={0.6}>{item.walletType}</AppText>
                  </View>
                  {item.customerType ? (
                    <View style={styles.chip}>
                      <AppText size={10.5} family="InterMedium" color="black" opacity={0.6} numLines={1}>{item.customerType}</AppText>
                    </View>
                  ) : null}
                  {item.slabCount ? (
                    <View style={styles.chip}>
                      <AppText size={10.5} family="InterMedium" color="black" opacity={0.6}>{item.slabCount} slabs</AppText>
                    </View>
                  ) : null}
                </View>

                <View style={styles.cardFooter}>
                  <View style={{ flex: 1 }}>
                    <AppText size={11} color="black" opacity={0.45}>{areaLine(item)}</AppText>
                    <AppText size={11.5} family="InterMedium" color="black" opacity={0.7}>
                      {`${shortDate(item.startDate)} – ${shortDate(item.endDate)}`}
                    </AppText>
                    {item.note ? (
                      <AppText size={11} family="InterMedium" color="black" opacity={0.5} numLines={3} lineHeight={15}>
                        {item.note}
                      </AppText>
                    ) : null}
                  </View>
                  {item.isLive ? (
                    <View style={styles.daysPill}>
                      <AppText size={10.5} family="InterSemiBold" customColor={colors.blue}>
                        {item.daysRemaining === 0 ? 'Ends today' : `${item.daysRemaining} days left`}
                      </AppText>
                    </View>
                  ) : null}
                </View>
              </View>
            </Pressable>
          );
        }}
      />

      <Modal visible={!!detail || detailLoading} transparent animationType="slide" onRequestClose={() => setDetail(null)}>
        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={() => setDetail(null)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            {detailLoading || !detail ? (
              <View style={{ padding: 40 }}>
                <ActivityIndicator color={colors.blue} />
              </View>
            ) : (
              <>
                <View style={styles.sheetHead}>
                  <View style={styles.cardTop}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <AppText size={17} family="InterSemiBold" color="black">{detail.scheme.name}</AppText>
                      <AppText size={11.5} color="black" opacity={0.5}>
                        {`${shortDate(detail.scheme.startDate)} – ${shortDate(detail.scheme.endDate)} · ${areaLine(detail.scheme)}`}
                      </AppText>
                      {detail.scheme.note ? (
                        <AppText size={11.5} family="InterMedium" color="black" opacity={0.55} lineHeight={16}>
                          {detail.scheme.note}
                        </AppText>
                      ) : null}
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: SCHEME_TONE[detail.scheme.status].background }]}>
                      <AppText size={11} family="InterSemiBold" customColor={SCHEME_TONE[detail.scheme.status].text}>
                        {detail.scheme.statusLabel}
                      </AppText>
                    </View>
                  </View>
                </View>

                <ScrollView
                  style={styles.sheetScroll}
                  contentContainerStyle={{ padding: 20, paddingTop: 6, paddingBottom: 28 }}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled>
                  <View style={styles.statRow}>
                    {[
                      { label: 'Invoices', value: String(detail.performance.invoiceCount) },
                      { label: 'Retailers', value: String(detail.performance.retailerCount) },
                      { label: 'Points earned', value: String(Math.round(detail.performance.pointsEarned)) },
                    ].map(stat => (
                      <View key={stat.label} style={styles.statCard}>
                        <AppText size={17} family="InterSemiBold" color="black">{stat.value}</AppText>
                        <AppText size={10.5} color="black" opacity={0.5}>{stat.label}</AppText>
                      </View>
                    ))}
                  </View>

                  <View style={styles.amountRow}>
                    <View style={{ flex: 1 }}>
                      <AppText size={11} color="black" opacity={0.5}>Approved value</AppText>
                      <AppText size={15} family="InterSemiBold" customColor="#16A34A">{money(detail.performance.approvedAmount)}</AppText>
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText size={11} color="black" opacity={0.5}>In process</AppText>
                      <AppText size={15} family="InterSemiBold" customColor="#B45309">{money(detail.performance.pendingAmount)}</AppText>
                    </View>
                  </View>

                  {detail.slabs.length ? (
                    <View style={{ marginTop: 20 }}>
                      <AppText size={13} family="InterSemiBold" color="black">Reward slabs</AppText>
                      <AppText size={11} color="black" opacity={0.45} style={{ marginBottom: 8 }}>
                        {detail.scheme.basedOn ? `Based on ${detail.scheme.basedOn.toLowerCase()}` : ''}
                      </AppText>
                      {detail.slabs.map((slab, index) => (
                        <View key={index} style={styles.slabRow}>
                          <AppText size={12.5} family="InterMedium" color="black" opacity={0.8}>
                            {slab.toAmount > 0
                              ? `${money(slab.fromAmount)} – ${money(slab.toAmount)}`
                              : `${money(slab.fromAmount)} and above`}
                          </AppText>
                          <AppText size={13} family="InterSemiBold" customColor={colors.blue}>{slab.value}</AppText>
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

export default SchemeList;
