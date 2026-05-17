import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, Line, Text as SvgText } from 'react-native-svg';
import { HEART_RATE_STORAGE_KEY, HeartRateRecord } from '../screens/Health/HeartRateScreen';
import { COLORS, SPACING } from '../theme';
import { SHADOWS } from '../theme/shadows';

const SCREEN_W = Dimensions.get('window').width;
const CARD_W = SCREEN_W - SPACING.lg * 2;
const CHART_H = 110;
const CHART_W = CARD_W - 32; // padding 16*2
const CHART_PAD_L = 28;
const CHART_PAD_R = 12;
const CHART_PAD_T = 12;
const CHART_PAD_B = 24;
const PLOT_W = CHART_W - CHART_PAD_L - CHART_PAD_R;
const PLOT_H = CHART_H - CHART_PAD_T - CHART_PAD_B;

const getBpmColor = (bpm: number) => {
  if (bpm < 60) return '#3b82f6';
  if (bpm <= 100) return '#22c55e';
  if (bpm <= 140) return '#f59e0b';
  return '#ef4444';
};

const getBpmLabel = (bpm: number) => {
  if (bpm < 60) return 'Nhịp chậm';
  if (bpm <= 100) return 'Bình thường';
  if (bpm <= 140) return 'Nhịp nhanh';
  return 'Rất nhanh';
};

/**
 * Vẽ biểu đồ đường nhịp tim bằng SVG thuần
 * - Đường gradient fill phía dưới
 * - Điểm tròn tại mỗi mẫu đo
 * - Trục Y có giá trị min/max
 * - Trục X có label thời gian
 */
const HeartRateChart: React.FC<{ data: HeartRateRecord[] }> = ({ data }) => {
  if (data.length === 0) return null;

  // Hiển thị tối đa 7 điểm, mới nhất bên phải
  const displayData = data.slice(0, 7).reverse();
  const bpms = displayData.map(d => d.bpm);
  const rawMin = Math.min(...bpms);
  const rawMax = Math.max(...bpms);
  const padding = Math.max((rawMax - rawMin) * 0.2, 10);
  const minY = Math.max(0, rawMin - padding);
  const maxY = rawMax + padding;
  const rangeY = maxY - minY || 1;

  const n = displayData.length;

  // Tính tọa độ x,y
  const pts = displayData.map((d, i) => {
    const x = CHART_PAD_L + (i / Math.max(n - 1, 1)) * PLOT_W;
    const y = CHART_PAD_T + PLOT_H - ((d.bpm - minY) / rangeY) * PLOT_H;
    return { x, y, bpm: d.bpm, ts: d.timestamp };
  });

  // Tạo path đường cong smooth (catmull-rom)
  const linePath = pts.reduce((acc, pt, i) => {
    if (i === 0) return `M ${pt.x} ${pt.y}`;
    const prev = pts[i - 1];
    const cpx1 = prev.x + (pt.x - prev.x) / 3;
    const cpy1 = prev.y;
    const cpx2 = prev.x + (2 * (pt.x - prev.x)) / 3;
    const cpy2 = pt.y;
    return `${acc} C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${pt.x} ${pt.y}`;
  }, '');

  // Area fill: đường + đi xuống đáy + về điểm đầu
  const areaPath = `${linePath} L ${pts[pts.length - 1].x} ${CHART_PAD_T + PLOT_H} L ${pts[0].x} ${CHART_PAD_T + PLOT_H} Z`;

  // Color dựa trên điểm mới nhất
  const latestColor = getBpmColor(pts[pts.length - 1]?.bpm || 75);
  const gradId = 'hrGrad';

  // Label trục Y
  const yLabels = [minY, (minY + maxY) / 2, maxY].map(v => Math.round(v));

  return (
    <Svg width={CHART_W} height={CHART_H}>
      <Defs>
        <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={latestColor} stopOpacity="0.35" />
          <Stop offset="100%" stopColor={latestColor} stopOpacity="0.01" />
        </LinearGradient>
      </Defs>

      {/* Grid lines */}
      {[0, 0.5, 1].map((t, i) => {
        const y = CHART_PAD_T + t * PLOT_H;
        return (
          <Line
            key={i}
            x1={CHART_PAD_L}
            y1={y}
            x2={CHART_PAD_L + PLOT_W}
            y2={y}
            stroke="#f1f5f9"
            strokeWidth="1"
          />
        );
      })}

      {/* Y axis labels */}
      {yLabels.map((v, i) => {
        const t = [1, 0.5, 0][i];
        const y = CHART_PAD_T + t * PLOT_H;
        return (
          <SvgText
            key={i}
            x={CHART_PAD_L - 4}
            y={y + 4}
            textAnchor="end"
            fontSize="9"
            fill="#94a3b8"
          >
            {v}
          </SvgText>
        );
      })}

      {/* Area fill */}
      {pts.length > 1 && (
        <Path d={areaPath} fill={`url(#${gradId})`} />
      )}

      {/* Line */}
      {pts.length > 1 && (
        <Path
          d={linePath}
          stroke={latestColor}
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* Data points */}
      {pts.map((pt, i) => {
        const isLast = i === pts.length - 1;
        return (
          <React.Fragment key={i}>
            <Circle
              cx={pt.x}
              cy={pt.y}
              r={isLast ? 5 : 3.5}
              fill={isLast ? latestColor : '#fff'}
              stroke={latestColor}
              strokeWidth={isLast ? 0 : 2}
            />
            {isLast && (
              <Circle cx={pt.x} cy={pt.y} r={9} fill={latestColor} fillOpacity="0.15" />
            )}
          </React.Fragment>
        );
      })}

      {/* X axis labels — thời gian */}
      {pts.map((pt, i) => {
        if (n > 4 && i % 2 !== 0 && i !== n - 1) return null;
        const d = new Date(pt.ts);
        const label = `${d.getDate()}/${d.getMonth() + 1}`;
        return (
          <SvgText
            key={i}
            x={pt.x}
            y={CHART_PAD_T + PLOT_H + 16}
            textAnchor="middle"
            fontSize="9"
            fill="#94a3b8"
          >
            {label}
          </SvgText>
        );
      })}
    </Svg>
  );
};

/**
 * Biểu đồ cột Calo: ăn vào (cam) vs đốt cháy (xanh)
 */
const CalorieBar: React.FC<{ intake: number; burned: number }> = ({ intake, burned }) => {
  const max = Math.max(intake, burned, 1);
  const barH = 60;
  const barW = 20;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: barH + 24 }}>
      {/* Ăn vào */}
      {intake > 0 && (
        <View style={{ alignItems: 'center' }}>
          <Text style={calStyles.barVal}>{intake}</Text>
          <View style={[calStyles.bar, { height: (intake / max) * barH, backgroundColor: '#f59e0b', width: barW }]} />
          <Text style={calStyles.barLabel}>ăn</Text>
        </View>
      )}
      {/* Đốt */}
      {burned > 0 && (
        <View style={{ alignItems: 'center' }}>
          <Text style={calStyles.barVal}>{burned}</Text>
          <View style={[calStyles.bar, { height: (burned / max) * barH, backgroundColor: '#22c55e', width: barW }]} />
          <Text style={calStyles.barLabel}>đốt</Text>
        </View>
      )}
    </View>
  );
};

const calStyles = StyleSheet.create({
  bar: { borderRadius: 6, minHeight: 4 },
  barVal: { fontSize: 10, fontWeight: '700', color: '#475569', marginBottom: 3 },
  barLabel: { fontSize: 9, color: '#94a3b8', marginTop: 3 },
});

interface Props { healthLogs?: any[] }

export const HealthSummaryCard: React.FC<Props> = ({ healthLogs = [] }) => {
  const navigation = useNavigation<any>();
  const [heartHistory, setHeartHistory] = useState<HeartRateRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(HEART_RATE_STORAGE_KEY);
      if (raw) setHeartHistory(JSON.parse(raw));
    } catch (e) { } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const today = new Date().toDateString();
  const todayLogs = healthLogs.filter(l =>
    new Date(l.createdAt || l.scheduledDate || Date.now()).toDateString() === today
  );
  const caloriesIn = todayLogs
    .filter(l => l.type === 'meal')
    .reduce((s, l) => s + (l.details?.calories || 0), 0);
  const caloriesOut = todayLogs
    .filter(l => l.type === 'exercise')
    .reduce((s, l) => s + (l.details?.caloriesBurned || 0), 0);
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const symptoms = healthLogs.filter(l =>
    l.type === 'symptom' && new Date(l.createdAt || Date.now()) >= weekAgo
  ).length;

  const latest = heartHistory[0];
  const bpmColor = latest ? getBpmColor(latest.bpm) : COLORS.primary;
  const hasHeartData = heartHistory.length > 0;
  const hasCalData = caloriesIn > 0 || caloriesOut > 0;

  if (loading) return null;

  return (
    <View style={styles.card}>
      {/* ===== HEADER ===== */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Icon name="insights" size={16} color={COLORS.primary} />
          <Text style={styles.cardTitle}>Tóm tắt sức khỏe</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('HeartRate')} style={styles.measureBtn}>
          <Icon name="favorite" size={13} color="#ef4444" />
          <Text style={styles.measureBtnText}>Đo nhịp tim</Text>
        </TouchableOpacity>
      </View>

      {/* ===== NHỊP TIM CHART ===== */}
      {hasHeartData ? (
        <View style={styles.section}>
          {/* Stat header */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionLeft}>
              <Text style={[styles.bigNum, { color: bpmColor }]}>{latest.bpm}</Text>
              <View>
                <Text style={styles.bigUnit}>BPM</Text>
                <Text style={[styles.bigLabel, { color: bpmColor }]}>{getBpmLabel(latest.bpm)}</Text>
              </View>
            </View>
            <View style={styles.sectionRight}>
              <Text style={styles.sectionMeta}>
                {heartHistory.length} lần đo
              </Text>
              <Text style={styles.sectionMeta}>
                {new Date(latest.timestamp).toLocaleDateString('vi', { day: '2-digit', month: '2-digit' })}
              </Text>
            </View>
          </View>

          {/* Chart */}
          <HeartRateChart data={heartHistory} />

          {/* Legend */}
          <View style={styles.legend}>
            {[
              { color: '#3b82f6', label: '< 60 Chậm' },
              { color: '#22c55e', label: '60-100 Bình thường' },
              { color: '#f59e0b', label: '100-140 Nhanh' },
              { color: '#ef4444', label: '> 140 Rất nhanh' },
            ].map((item, i) => (
              <View key={i} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                <Text style={styles.legendText}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : (
        /* Placeholder nhịp tim */
        <TouchableOpacity style={styles.emptyHr} onPress={() => navigation.navigate('HeartRate')} activeOpacity={0.8}>
          <View style={styles.emptyHrLeft}>
            <View style={styles.emptyHeartIcon}>
              <Icon name="favorite-border" size={28} color="#ef4444" />
            </View>
            <View>
              <Text style={styles.emptyTitle}>Chưa đo nhịp tim</Text>
              <Text style={styles.emptySub}>Nhấn để đo → biểu đồ sẽ hiện tại đây</Text>
            </View>
          </View>
          <Icon name="chevron-right" size={20} color="#cbd5e1" />
        </TouchableOpacity>
      )}

      {/* ===== DIVIDER ===== */}
      {(hasCalData || symptoms > 0) && <View style={styles.divider} />}

      {/* ===== CALO + TRIỆU CHỨNG ===== */}
      {(hasCalData || symptoms > 0) && (
        <View style={styles.bottomRow}>
          {/* Calo */}
          {hasCalData && (
            <TouchableOpacity
              style={styles.metricBlock}
              onPress={() => navigation.navigate('HealthTracking')}
              activeOpacity={0.8}
            >
              <View style={styles.metricHeader}>
                <View style={[styles.metricIcon, { backgroundColor: '#fef3c7' }]}>
                  <Icon name="local-fire-department" size={14} color="#f59e0b" />
                </View>
                <Text style={styles.metricTitle}>Calo hôm nay</Text>
              </View>
              <CalorieBar intake={caloriesIn} burned={caloriesOut} />
              <Text style={styles.metricCaption}>kcal</Text>
            </TouchableOpacity>
          )}

          {/* Triệu chứng */}
          {symptoms > 0 && (
            <TouchableOpacity
              style={styles.metricBlock}
              onPress={() => navigation.navigate('HealthTracking')}
              activeOpacity={0.8}
            >
              <View style={styles.metricHeader}>
                <View style={[styles.metricIcon, { backgroundColor: '#fee2e2' }]}>
                  <Icon name="sick" size={14} color="#ef4444" />
                </View>
                <Text style={styles.metricTitle}>Triệu chứng</Text>
              </View>
              <View style={styles.symptomChart}>
                {/* Vẽ vòng tròn đơn giản */}
                <View style={styles.symptomCircle}>
                  <Text style={styles.symptomNum}>{symptoms}</Text>
                  <Text style={styles.symptomUnit}>lần</Text>
                </View>
                <Text style={styles.symptomSub}>7 ngày qua</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 16,
    ...SHADOWS.card,
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  measureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef2f2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  measureBtnText: { fontSize: 12, fontWeight: '600', color: '#ef4444' },

  // Heart rate section
  section: { marginBottom: 4 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  sectionLeft: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  sectionRight: { alignItems: 'flex-end' },
  sectionMeta: { fontSize: 11, color: '#94a3b8' },
  bigNum: { fontSize: 40, fontWeight: '800', letterSpacing: -1, lineHeight: 42 },
  bigUnit: { fontSize: 13, fontWeight: '600', color: '#94a3b8', lineHeight: 16 },
  bigLabel: { fontSize: 12, fontWeight: '600', lineHeight: 14 },

  // Legend
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  legendDot: { width: 6, height: 6, borderRadius: 3 },
  legendText: { fontSize: 9, color: '#94a3b8' },

  // Empty heart rate
  emptyHr: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fef2f2',
    borderRadius: 16,
    padding: 14,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  emptyHrLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  emptyHeartIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 3 },
  emptySub: { fontSize: 12, color: '#94a3b8' },

  // Divider
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 14,
    marginHorizontal: -16,
  },

  // Bottom metrics
  bottomRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metricBlock: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 12,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  metricIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricTitle: { fontSize: 12, fontWeight: '700', color: '#334155' },
  metricCaption: { fontSize: 10, color: '#94a3b8', marginTop: 4 },

  // Symptom
  symptomChart: { alignItems: 'center', paddingVertical: 4 },
  symptomCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    borderWidth: 3,
    borderColor: '#fca5a5',
  },
  symptomNum: { fontSize: 20, fontWeight: '800', color: '#ef4444', lineHeight: 22 },
  symptomUnit: { fontSize: 9, color: '#ef4444', fontWeight: '600' },
  symptomSub: { fontSize: 10, color: '#94a3b8' },
});
