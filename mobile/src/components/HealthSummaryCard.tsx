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
import { HEART_RATE_STORAGE_KEY, HeartRateRecord } from '../screens/Health/HeartRateScreen';
import { COLORS, SPACING, RADIUS } from '../theme';
import { SHADOWS } from '../theme/shadows';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_H = 72;
const MINI_CHART_W = 80;
const MINI_CHART_H = 36;

// Màu theo BPM
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

// Mini sparkline dùng View bars
const Sparkline: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
  if (data.length < 2) return <View style={{ width: MINI_CHART_W, height: MINI_CHART_H }} />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const barW = MINI_CHART_W / data.length;

  return (
    <View style={{ width: MINI_CHART_W, height: MINI_CHART_H, flexDirection: 'row', alignItems: 'flex-end' }}>
      {data.map((v, i) => {
        const h = ((v - min) / range) * (MINI_CHART_H * 0.8) + MINI_CHART_H * 0.15;
        const isLast = i === data.length - 1;
        return (
          <View
            key={i}
            style={{
              width: Math.max(barW - 1, 2),
              height: h,
              marginRight: 1,
              backgroundColor: isLast ? color : color + '60',
              borderRadius: 2,
            }}
          />
        );
      })}
    </View>
  );
};

interface HealthSummaryCardProps {
  healthLogs?: any[];
  onRefresh?: () => void;
}

export const HealthSummaryCard: React.FC<HealthSummaryCardProps> = ({ healthLogs = [], onRefresh }) => {
  const navigation = useNavigation<any>();
  const [heartRateHistory, setHeartRateHistory] = useState<HeartRateRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(HEART_RATE_STORAGE_KEY);
      if (raw) {
        setHeartRateHistory(JSON.parse(raw));
      }
    } catch (e) {
      console.warn('[HealthSummary] Load failed:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Tính calo từ healthLogs (meal = calo ăn vào, exercise = calo đốt)
  const todayLogs = healthLogs.filter(log => {
    const logDate = new Date(log.createdAt || log.scheduledDate || Date.now());
    const today = new Date();
    return logDate.toDateString() === today.toDateString();
  });

  const caloriesIn = todayLogs
    .filter(l => l.type === 'meal')
    .reduce((sum, l) => sum + (l.details?.calories || 0), 0);

  const caloriesOut = todayLogs
    .filter(l => l.type === 'exercise')
    .reduce((sum, l) => sum + (l.details?.caloriesBurned || 0), 0);

  const symptomsThisWeek = healthLogs.filter(log => {
    if (log.type !== 'symptom') return false;
    const logDate = new Date(log.createdAt || Date.now());
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return logDate >= weekAgo;
  }).length;

  // Heart rate data
  const latestBpm = heartRateHistory[0];
  const recentBpms = heartRateHistory.slice(0, 7).map(r => r.bpm).reverse();
  const bpmColor = latestBpm ? getBpmColor(latestBpm.bpm) : '#94a3b8';

  if (loading || (heartRateHistory.length === 0 && caloriesIn === 0 && caloriesOut === 0 && symptomsThisWeek === 0)) {
    return null; // Ẩn card nếu chưa có dữ liệu
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Icon name="insights" size={18} color={COLORS.primary} />
          <Text style={styles.headerTitle}>Tóm tắt sức khỏe</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('HeartRate')}>
          <Text style={styles.seeAll}>Đo nhịp tim</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>

        {/* Nhịp tim */}
        {latestBpm && (
          <TouchableOpacity
            style={[styles.statCard, { borderColor: bpmColor + '30' }]}
            onPress={() => navigation.navigate('HeartRate')}
            activeOpacity={0.8}
          >
            <View style={styles.statTop}>
              <View style={[styles.statIcon, { backgroundColor: bpmColor + '15' }]}>
                <Icon name="favorite" size={16} color={bpmColor} />
              </View>
              <Sparkline data={recentBpms.length > 1 ? recentBpms : [latestBpm.bpm, latestBpm.bpm]} color={bpmColor} />
            </View>
            <Text style={[styles.statValue, { color: bpmColor }]}>{latestBpm.bpm}</Text>
            <Text style={styles.statUnit}>BPM</Text>
            <Text style={styles.statLabel}>{getBpmLabel(latestBpm.bpm)}</Text>
          </TouchableOpacity>
        )}

        {/* Calo ăn vào */}
        {(caloriesIn > 0 || caloriesOut > 0) && (
          <TouchableOpacity
            style={[styles.statCard, { borderColor: '#f59e0b30' }]}
            onPress={() => navigation.navigate('HealthTracking')}
            activeOpacity={0.8}
          >
            <View style={styles.statTop}>
              <View style={[styles.statIcon, { backgroundColor: '#fef3c7' }]}>
                <Icon name="local-fire-department" size={16} color="#f59e0b" />
              </View>
            </View>
            {caloriesIn > 0 && (
              <>
                <Text style={[styles.statValue, { color: '#f59e0b' }]}>{caloriesIn}</Text>
                <Text style={styles.statUnit}>kcal ăn</Text>
              </>
            )}
            {caloriesOut > 0 && (
              <Text style={styles.statSub}>−{caloriesOut} đốt</Text>
            )}
            <Text style={styles.statLabel}>Hôm nay</Text>
          </TouchableOpacity>
        )}

        {/* Triệu chứng */}
        {symptomsThisWeek > 0 && (
          <TouchableOpacity
            style={[styles.statCard, { borderColor: '#ef444430' }]}
            onPress={() => navigation.navigate('HealthTracking')}
            activeOpacity={0.8}
          >
            <View style={styles.statTop}>
              <View style={[styles.statIcon, { backgroundColor: '#fee2e2' }]}>
                <Icon name="sick" size={16} color="#ef4444" />
              </View>
            </View>
            <Text style={[styles.statValue, { color: '#ef4444' }]}>{symptomsThisWeek}</Text>
            <Text style={styles.statUnit}>lần</Text>
            <Text style={styles.statLabel}>Triệu chứng</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Timestamp */}
      {latestBpm && (
        <Text style={styles.timestamp}>
          Cập nhật lúc {new Date(latestBpm.timestamp).toLocaleTimeString('vi', { hour: '2-digit', minute: '2-digit' })}
          {' · '}{new Date(latestBpm.timestamp).toLocaleDateString('vi', { day: '2-digit', month: '2-digit' })}
        </Text>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },

  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    minHeight: CARD_H,
  },
  statTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  statIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 26,
  },
  statUnit: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    marginTop: -2,
  },
  statSub: {
    fontSize: 11,
    color: '#22c55e',
    fontWeight: '600',
    marginTop: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
    marginTop: 4,
  },
  timestamp: {
    fontSize: 11,
    color: '#cbd5e1',
    marginTop: 10,
    textAlign: 'right',
  },
});
