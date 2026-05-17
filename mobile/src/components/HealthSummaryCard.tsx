import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { HEART_RATE_STORAGE_KEY, HeartRateRecord } from '../screens/Health/HeartRateScreen';
import { COLORS, SPACING } from '../theme';
import { SHADOWS } from '../theme/shadows';

const MINI_CHART_W = 80;
const MINI_CHART_H = 36;

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

const Sparkline: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
  if (data.length < 2) return <View style={{ width: MINI_CHART_W, height: MINI_CHART_H }} />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const barW = MINI_CHART_W / data.length;
  return (
    <View style={{ width: MINI_CHART_W, height: MINI_CHART_H, flexDirection: 'row', alignItems: 'flex-end' }}>
      {data.map((v, i) => (
        <View key={i} style={{
          width: Math.max(barW - 1, 2), height: ((v - min) / range) * (MINI_CHART_H * 0.8) + MINI_CHART_H * 0.15,
          marginRight: 1, backgroundColor: i === data.length - 1 ? color : color + '60', borderRadius: 2,
        }} />
      ))}
    </View>
  );
};

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
  const todayLogs = healthLogs.filter(l => new Date(l.createdAt || l.scheduledDate || Date.now()).toDateString() === today);
  const caloriesIn = todayLogs.filter(l => l.type === 'meal').reduce((s, l) => s + (l.details?.calories || 0), 0);
  const caloriesOut = todayLogs.filter(l => l.type === 'exercise').reduce((s, l) => s + (l.details?.caloriesBurned || 0), 0);
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
  const symptoms = healthLogs.filter(l => l.type === 'symptom' && new Date(l.createdAt || Date.now()) >= weekAgo).length;

  const latest = heartHistory[0];
  const recentBpms = heartHistory.slice(0, 7).map(r => r.bpm).reverse();
  const bpmColor = latest ? getBpmColor(latest.bpm) : '#94a3b8';
  const hasData = !!(latest || caloriesIn || caloriesOut || symptoms);

  if (loading) return null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Icon name="insights" size={18} color={COLORS.primary} />
          <Text style={styles.headerTitle}>Tóm tắt sức khỏe</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('HeartRate')}>
          <Text style={styles.seeAll}>Đo nhịp tim +</Text>
        </TouchableOpacity>
      </View>

      {!hasData ? (
        /* Placeholder — chưa có dữ liệu */
        <TouchableOpacity style={styles.emptyState} onPress={() => navigation.navigate('HeartRate')} activeOpacity={0.8}>
          <View style={styles.emptyIconRow}>
            {[
              { bg: '#fee2e2', icon: 'favorite', color: '#ef4444' },
              { bg: '#fef3c7', icon: 'local-fire-department', color: '#f59e0b' },
              { bg: '#dbeafe', icon: 'monitor-heart', color: '#3b82f6' },
            ].map((item, i) => (
              <View key={i} style={[styles.emptyIconBadge, { backgroundColor: item.bg }]}>
                <Icon name={item.icon} size={20} color={item.color} />
              </View>
            ))}
          </View>
          <Text style={styles.emptyTitle}>Chưa có dữ liệu sức khỏe</Text>
          <Text style={styles.emptySub}>Nhấn để đo nhịp tim — kết quả sẽ hiển thị tại đây</Text>
        </TouchableOpacity>
      ) : (
        <>
          <View style={styles.statsRow}>
            {/* Nhịp tim */}
            {latest && (
              <TouchableOpacity style={[styles.statCard, { borderColor: bpmColor + '30' }]} onPress={() => navigation.navigate('HeartRate')} activeOpacity={0.8}>
                <View style={styles.statTop}>
                  <View style={[styles.statIcon, { backgroundColor: bpmColor + '18' }]}>
                    <Icon name="favorite" size={15} color={bpmColor} />
                  </View>
                  <Sparkline data={recentBpms.length > 1 ? recentBpms : [latest.bpm, latest.bpm]} color={bpmColor} />
                </View>
                <Text style={[styles.statValue, { color: bpmColor }]}>{latest.bpm}</Text>
                <Text style={styles.statUnit}>BPM</Text>
                <Text style={styles.statLabel}>{getBpmLabel(latest.bpm)}</Text>
              </TouchableOpacity>
            )}

            {/* Calo */}
            {(caloriesIn > 0 || caloriesOut > 0) && (
              <TouchableOpacity style={[styles.statCard, { borderColor: '#f59e0b30' }]} onPress={() => navigation.navigate('HealthTracking')} activeOpacity={0.8}>
                <View style={styles.statTop}>
                  <View style={[styles.statIcon, { backgroundColor: '#fef3c7' }]}>
                    <Icon name="local-fire-department" size={15} color="#f59e0b" />
                  </View>
                </View>
                {caloriesIn > 0 && <><Text style={[styles.statValue, { color: '#f59e0b' }]}>{caloriesIn}</Text><Text style={styles.statUnit}>kcal ăn</Text></>}
                {caloriesOut > 0 && <Text style={styles.statSub}>−{caloriesOut} đốt</Text>}
                <Text style={styles.statLabel}>Hôm nay</Text>
              </TouchableOpacity>
            )}

            {/* Triệu chứng */}
            {symptoms > 0 && (
              <TouchableOpacity style={[styles.statCard, { borderColor: '#ef444430' }]} onPress={() => navigation.navigate('HealthTracking')} activeOpacity={0.8}>
                <View style={styles.statTop}>
                  <View style={[styles.statIcon, { backgroundColor: '#fee2e2' }]}>
                    <Icon name="sick" size={15} color="#ef4444" />
                  </View>
                </View>
                <Text style={[styles.statValue, { color: '#ef4444' }]}>{symptoms}</Text>
                <Text style={styles.statUnit}>lần</Text>
                <Text style={styles.statLabel}>Triệu chứng</Text>
              </TouchableOpacity>
            )}
          </View>

          {latest && (
            <Text style={styles.timestamp}>
              Cập nhật {new Date(latest.timestamp).toLocaleTimeString('vi', { hour: '2-digit', minute: '2-digit' })}
              {' · '}{new Date(latest.timestamp).toLocaleDateString('vi', { day: '2-digit', month: '2-digit' })}
            </Text>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    ...SHADOWS.card,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  seeAll: { fontSize: 13, fontWeight: '600', color: COLORS.primary },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 16 },
  emptyIconRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  emptyIconBadge: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: '#334155', marginBottom: 4 },
  emptySub: { fontSize: 12, color: '#94a3b8', textAlign: 'center' },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 16, padding: 12, borderWidth: 1, minHeight: 72 },
  statTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  statIcon: { width: 30, height: 30, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5, lineHeight: 26 },
  statUnit: { fontSize: 11, fontWeight: '600', color: '#94a3b8', marginTop: -2 },
  statSub: { fontSize: 11, color: '#22c55e', fontWeight: '600', marginTop: 2 },
  statLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '500', marginTop: 4 },
  timestamp: { fontSize: 11, color: '#cbd5e1', marginTop: 10, textAlign: 'right' },
});
