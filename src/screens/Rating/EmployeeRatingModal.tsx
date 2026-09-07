import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import AppText from '../../components/AppText/AppText';
import { colors } from '../../utils/Colors';
import { RatingMonth, RatingRow } from '../../api/ratingApi';
import { ratingStyles as styles } from './styles';

/** Below this a driver is worth calling out; the CRM uses the same line. */
const ATTENTION_BELOW = 85;

/** Must match the chart styles: the overlay is positioned against these. */
const CHART_PADDING = 10;
const CHART_TRACK_HEIGHT = 96;

const tone = (value: number) => (value >= 75 ? '#16A34A' : value >= 50 ? '#D97706' : '#DC2626');

/**
 * How fast the rating is moving, in points per month.
 *
 * A least-squares fit over the months the employee was actually rated for, so one bad
 * month does not read as a collapse and a joiner's blank months do not drag the line
 * down. Matches the trend line on the CRM's popup.
 */
const fitTrend = (values: number[]): { slope: number; at: (x: number) => number } | null => {
  if (values.length < 2) return null;
  const n = values.length;
  const meanX = (n - 1) / 2;
  const meanY = values.reduce((sum, v) => sum + v, 0) / n;
  let top = 0;
  let bottom = 0;
  values.forEach((value, index) => {
    top += (index - meanX) * (value - meanY);
    bottom += (index - meanX) ** 2;
  });
  if (bottom === 0) return null;
  const slope = top / bottom;
  return { slope, at: (x: number) => meanY + slope * (x - meanX) };
};

type Props = {
  row: RatingRow | null;
  months: RatingMonth[];
  onClose: () => void;
};

const EmployeeRatingModal = ({ row, months, onClose }: Props) => {
  const [selected, setSelected] = useState<string | null>(null);
  // Measured rather than assumed: the popup's width depends on the screen, and the line
  // has to land on the same columns the bars are drawn in.
  const [chartWidth, setChartWidth] = useState(0);
  // Where the bar tracks actually begin inside the chart. Measured, not derived from the
  // label's font size - that would put the line a few pixels off on any device whose
  // text renders taller.
  const [trackTop, setTrackTop] = useState<number | null>(null);

  // The first month the employee was rated for, so a joiner opens on a real month
  // rather than a blank one before they started.
  const firstRated = useMemo(
    () => months.find(m => m.key >= (row?.ratingStartMonth ?? '')) ?? months[0],
    [months, row],
  );
  const activeKey = selected ?? firstRated?.key ?? '';
  const activeMonth = months.find(m => m.key === activeKey);
  const detail = row?.monthlyDetails?.[activeKey];

  // Fitted over the months this person is actually rated for. The line is then drawn
  // across those same columns, so it sits over the bars it describes.
  const trend = useMemo(() => {
    if (!row) return null;
    const rated = months.filter(m => m.key >= row.ratingStartMonth);
    const fit = fitTrend(rated.map(m => row.monthlyRatings[m.key] ?? 0));
    return fit ? { ...fit, firstIndex: months.findIndex(m => m.key === rated[0]?.key), count: rated.length } : null;
  }, [row, months]);
  const slope = trend?.slope ?? null;

  const attention = (detail?.components ?? []).filter(c => c.percentage < ATTENTION_BELOW);

  if (!row) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={() => {}}>
          <View style={styles.modalHead}>
            <View style={{ flex: 1 }}>
              <AppText size={10} family="InterSemiBold" color="white" opacity={0.75}>
                EMPLOYEE RATING DETAILS
              </AppText>
              <AppText size={18} family="InterBold" color="white" numLines={2}>
                {row.employeeName}
              </AppText>
            </View>
            <Pressable onPress={onClose} hitSlop={12} style={styles.modalClose}>
              <AppText size={18} color="white">×</AppText>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
            <View style={styles.factGrid}>
              {[
                { label: 'BRANCH', value: row.branch || '-' },
                { label: 'ZONE', value: row.zone || '-' },
                { label: 'EMPLOYEE CODE', value: row.employeeCode || '-' },
                { label: 'REPORTING MANAGER', value: row.reportingManager || '-' },
              ].map(fact => (
                <View key={fact.label} style={styles.factBox}>
                  <AppText size={9} family="InterSemiBold" color="black" opacity={0.45}>
                    {fact.label}
                  </AppText>
                  <AppText size={13} family="InterSemiBold" color="black" numLines={1}>
                    {fact.value}
                  </AppText>
                </View>
              ))}
              <View style={[styles.factBox, styles.factBoxWide]}>
                <AppText size={9} family="InterSemiBold" color={colors.blue} opacity={0.7}>
                  LAST {row.averageMonthCount} MONTHS AVERAGE
                </AppText>
                <AppText size={17} family="InterBold" color={colors.blue}>
                  {row.averageRating.toFixed(2)}%
                </AppText>
              </View>
            </View>

            <View style={styles.chartHead}>
              <AppText size={14} family="InterSemiBold" color="black">
                Month-Wise Final Rating
              </AppText>
              {activeMonth ? (
                <View style={styles.monthPill}>
                  <AppText size={11} family="InterSemiBold" color={colors.blue}>
                    {activeMonth.fullLabel}
                  </AppText>
                </View>
              ) : null}
            </View>
            <AppText size={11} color="black" opacity={0.5}>
              Tap a month to inspect the rating drivers.
            </AppText>

            {slope !== null && (
              <View style={styles.trendRow}>
                <AppText size={11} color="black" opacity={0.55}>
                  Average trend
                </AppText>
                <View style={[styles.trendPill, { backgroundColor: slope < 0 ? '#FEE2E2' : '#DCFCE7' }]}>
                  <AppText size={11} family="InterSemiBold" color={slope < 0 ? '#DC2626' : '#16A34A'}>
                    {slope > 0 ? '+' : ''}{slope.toFixed(2)}% per month
                  </AppText>
                </View>
              </View>
            )}

            {/* Bars are drawn to the month's own value, so a short bar is a low month
                rather than a rendering quirk. The trend line is laid over them in the
                same coordinates, the way the CRM draws it. */}
            <View style={styles.chart} onLayout={e => setChartWidth(e.nativeEvent.layout.width)}>
              {trend && chartWidth > 0 && trackTop !== null && (
                <Svg
                  pointerEvents="none"
                  style={[styles.trendOverlay, { top: trackTop }]}
                  width={chartWidth - CHART_PADDING * 2}
                  height={CHART_TRACK_HEIGHT}>
                  {(() => {
                    const columns = months.length;
                    const inner = chartWidth - CHART_PADDING * 2;
                    const step = inner / columns;
                    // Half a column past each end, so the line spans the bars rather
                    // than stopping at their centres.
                    const x1 = (trend.firstIndex + 0) * step + step * 0.1;
                    const x2 = (trend.firstIndex + trend.count) * step - step * 0.1;
                    const clamp = (v: number) => Math.max(0, Math.min(100, v));
                    const y = (value: number) => CHART_TRACK_HEIGHT * (1 - clamp(value) / 100);
                    return (
                      <Line
                        x1={x1}
                        y1={y(trend.at(-0.4))}
                        x2={x2}
                        y2={y(trend.at(trend.count - 0.6))}
                        stroke={colors.blue}
                        strokeWidth={2}
                        strokeDasharray="6,5"
                        strokeLinecap="round"
                      />
                    );
                  })()}
                </Svg>
              )}
              {months.map(month => {
                const value = row.monthlyRatings[month.key] ?? 0;
                const isActive = month.key === activeKey;
                return (
                  <Pressable key={month.key} style={styles.chartCol} onPress={() => setSelected(month.key)}>
                    <AppText size={10} family="InterSemiBold" color={tone(value)}>
                      {value.toFixed(0)}%
                    </AppText>
                    <View
                      style={styles.chartTrack}
                      onLayout={
                        month.key === months[0]?.key
                          ? e => setTrackTop(CHART_PADDING + e.nativeEvent.layout.y)
                          : undefined
                      }>
                      <View
                        style={[
                          styles.chartBar,
                          { height: `${Math.max(3, Math.min(100, value))}%`, backgroundColor: tone(value) },
                        ]}
                      />
                    </View>
                    <AppText
                      size={10}
                      family={isActive ? 'InterBold' : 'InterMedium'}
                      color={isActive ? colors.blue : 'black'}
                      opacity={isActive ? 1 : 0.5}>
                      {month.label}
                      {month.inProgress ? '*' : ''}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.attentionHead}>
              <AppText size={14} family="InterSemiBold" color="black">
                Needs Attention
              </AppText>
              <View style={styles.countPill}>
                <AppText size={10} family="InterSemiBold" color="#92400E">
                  {attention.length} of {detail?.components.length ?? 0}
                </AppText>
              </View>
            </View>
            <AppText size={11} color="black" opacity={0.5}>
              Only drivers below {ATTENTION_BELOW}% for {activeMonth?.fullLabel ?? 'this month'} are shown.
            </AppText>

            {attention.length === 0 ? (
              <View style={styles.attentionEmpty}>
                <AppText size={12} color="black" opacity={0.5}>
                  {detail ? 'Every driver is at or above 85% this month.' : 'No rating for this month.'}
                </AppText>
              </View>
            ) : (
              attention.map(component => (
                <View key={component.key} style={styles.driverRow}>
                  <View style={{ flex: 1 }}>
                    <AppText size={13} family="InterSemiBold" color="black">
                      {component.label}
                    </AppText>
                    <AppText size={10} color="black" opacity={0.55}>
                      {component.description}
                    </AppText>
                    <AppText size={10} color="black" opacity={0.4}>
                      Weight {component.weight.toFixed(2)}% · Score {component.weightedScore.toFixed(2)}/
                      {component.weight.toFixed(2)}
                    </AppText>
                  </View>
                  <AppText size={15} family="InterBold" color={tone(component.percentage)}>
                    {component.percentage.toFixed(2)}%
                  </AppText>
                </View>
              ))
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default EmployeeRatingModal;
