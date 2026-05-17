import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useHeartRate } from '../../hooks/useHeartRate';
import { COLORS, SPACING, RADIUS } from '../../theme';

export const HEART_RATE_STORAGE_KEY = 'heart_rate_history';
export const MAX_HISTORY = 30; // Giữ tối đa 30 lần đo

export interface HeartRateRecord {
  bpm: number;
  timestamp: number;
  valid: boolean;
  label: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const WAVEFORM_WIDTH = SCREEN_WIDTH - 48;
const WAVEFORM_HEIGHT = 80;

// Màu sắc theo nhịp tim
const getBpmColor = (bpm: number | null) => {
  if (!bpm) return '#94a3b8';
  if (bpm < 60) return '#3b82f6'; // Chậm - xanh
  if (bpm <= 100) return '#22c55e'; // Bình thường - xanh lá
  if (bpm <= 140) return '#f59e0b'; // Nhanh - vàng
  return '#ef4444'; // Rất nhanh - đỏ
};

const getBpmLabel = (bpm: number | null) => {
  if (!bpm) return '';
  if (bpm < 60) return 'Nhịp chậm';
  if (bpm <= 100) return 'Bình thường';
  if (bpm <= 140) return 'Nhịp nhanh';
  return 'Rất nhanh';
};

// Component vẽ sóng tim đơn giản bằng View
const WaveformDisplay: React.FC<{ values: number[]; color: string }> = ({ values, color }) => {
  if (values.length < 2) {
    return (
      <View style={[waveStyles.container, { borderColor: color + '30' }]}>
        <Text style={[waveStyles.placeholder, { color: color + '80' }]}>
          Đang chờ tín hiệu...
        </Text>
      </View>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  // Vẽ bằng các bar mỏng
  const barCount = Math.min(values.length, 80);
  const startIdx = values.length - barCount;
  const barWidth = WAVEFORM_WIDTH / barCount;

  return (
    <View style={[waveStyles.container, { borderColor: color + '30' }]}>
      <View style={waveStyles.wave}>
        {values.slice(startIdx).map((val, i) => {
          const normalizedHeight = ((val - min) / range) * WAVEFORM_HEIGHT * 0.8 + WAVEFORM_HEIGHT * 0.1;
          const fromBottom = normalizedHeight;
          return (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: i * barWidth,
                bottom: 0,
                width: Math.max(barWidth - 0.5, 1),
                height: fromBottom,
                backgroundColor: color,
                opacity: 0.7 + (i / barCount) * 0.3,
                borderRadius: 1,
              }}
            />
          );
        })}
      </View>
    </View>
  );
};

const waveStyles = StyleSheet.create({
  container: {
    width: WAVEFORM_WIDTH,
    height: WAVEFORM_HEIGHT + 16,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.04)',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
  },
  wave: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: WAVEFORM_HEIGHT,
  },
  placeholder: {
    fontSize: 13,
    fontStyle: 'italic',
  },
});

export const HeartRateScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const {
    phase,
    elapsed,
    realtimeBpm,
    result,
    errorMsg,
    signalQuality,
    redValues,
    start,
    stop,
    reset,
    measureDuration,
    progress,
  } = useHeartRate();

  // Pulse animation cho biểu tượng tim
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (phase === 'measuring') {
      // Pulse khi đo
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 400, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [phase]);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  // Lưu kết quả vào AsyncStorage khi đo xong
  useEffect(() => {
    if (phase === 'done' && result?.valid && result.bpm > 0) {
      const saveResult = async () => {
        try {
          const raw = await AsyncStorage.getItem(HEART_RATE_STORAGE_KEY);
          const history: HeartRateRecord[] = raw ? JSON.parse(raw) : [];
          const newRecord: HeartRateRecord = {
            bpm: Math.round(result.bpm),
            timestamp: Date.now(),
            valid: result.valid,
            label: getBpmLabel(result.bpm),
          };
          const updated = [newRecord, ...history].slice(0, MAX_HISTORY);
          await AsyncStorage.setItem(HEART_RATE_STORAGE_KEY, JSON.stringify(updated));
          console.log('[HeartRate] Saved:', newRecord.bpm, 'BPM');
        } catch (e) {
          console.warn('[HeartRate] Save failed:', e);
        }
      };
      saveResult();
    }
  }, [phase, result]);

  const bpmColor = getBpmColor(realtimeBpm || result?.bpm || null);
  const displayBpm = result?.bpm || realtimeBpm;

  const signalQualityConfig = {
    none: { label: 'Chưa có tín hiệu', color: '#94a3b8', icon: 'signal-wifi-off' },
    low: { label: 'Tín hiệu yếu — giữ ngón tay chắc hơn', color: '#f59e0b', icon: 'signal-wifi-bad' },
    good: { label: 'Tín hiệu tốt', color: '#22c55e', icon: 'signal-wifi-4-bar' },
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đo Nhịp Tim</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* BPM Display — vòng tròn lớn */}
        <View style={styles.bpmCircleWrap}>
          <Animated.View style={[styles.bpmCircleOuter, { borderColor: bpmColor + '40', transform: [{ scale: pulseAnim }] }]}>
            <View style={[styles.bpmCircle, { borderColor: bpmColor }]}>
              <Icon name="favorite" size={28} color={bpmColor} style={{ marginBottom: 4 }} />
              {displayBpm ? (
                <>
                  <Text style={[styles.bpmNumber, { color: bpmColor }]}>
                    {Math.round(displayBpm)}
                  </Text>
                  <Text style={styles.bpmUnit}>BPM</Text>
                  <Text style={[styles.bpmLabel, { color: bpmColor }]}>
                    {getBpmLabel(displayBpm)}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.bpmNumberPlaceholder}>--</Text>
                  <Text style={styles.bpmUnit}>BPM</Text>
                  <Text style={styles.bpmHint}>
                    {phase === 'idle' ? 'Nhấn bắt đầu' : 'Đang đo...'}
                  </Text>
                </>
              )}
            </View>
          </Animated.View>
        </View>

        {/* Progress bar */}
        {phase === 'measuring' && (
          <View style={styles.progressWrap}>
            <View style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressBar,
                  {
                    backgroundColor: bpmColor,
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {elapsed}s / {measureDuration}s
            </Text>
          </View>
        )}

        {/* Signal quality indicator */}
        {phase === 'measuring' && (
          <View style={[styles.signalRow, { borderColor: signalQualityConfig[signalQuality].color + '40' }]}>
            <Icon
              name={signalQualityConfig[signalQuality].icon}
              size={18}
              color={signalQualityConfig[signalQuality].color}
            />
            <Text style={[styles.signalText, { color: signalQualityConfig[signalQuality].color }]}>
              {signalQualityConfig[signalQuality].label}
            </Text>
          </View>
        )}

        {/* Waveform */}
        {phase === 'measuring' && (
          <WaveformDisplay values={redValues} color={bpmColor} />
        )}

        {/* Hướng dẫn */}
        {phase === 'idle' && (
          <View style={styles.instructionCard}>
            <Text style={styles.instructionTitle}>Cách đo</Text>
            {[
              { icon: '💡', text: 'Đặt ngón trỏ phủ kín camera sau và đèn flash' },
              { icon: '🤫', text: 'Ngồi yên, không di chuyển trong khi đo' },
              { icon: '⏱', text: 'Giữ yên trong 30 giây để có kết quả chính xác' },
              { icon: '🌡️', text: 'Đặt tay nhẹ vừa phải, không ấn quá mạnh' },
            ].map((item, i) => (
              <View key={i} style={styles.instructionRow}>
                <Text style={styles.instructionIcon}>{item.icon}</Text>
                <Text style={styles.instructionText}>{item.text}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Kết quả */}
        {phase === 'done' && result && (
          <View style={[styles.resultCard, { borderColor: bpmColor + '40' }]}>
            <Text style={styles.resultTitle}>Kết quả đo</Text>

            <View style={styles.resultRow}>
              <View style={[styles.resultBadge, { backgroundColor: bpmColor + '15' }]}>
                <Icon name="favorite" size={20} color={bpmColor} />
                <Text style={[styles.resultBadgeText, { color: bpmColor }]}>
                  {Math.round(result.bpm)} BPM
                </Text>
              </View>
              <View style={styles.resultBadge}>
                <Icon name="timer" size={20} color="#64748b" />
                <Text style={styles.resultBadgeTextGray}>
                  {result.duration.toFixed(0)}s
                </Text>
              </View>
              <View style={styles.resultBadge}>
                <Icon name="bar-chart" size={20} color="#64748b" />
                <Text style={styles.resultBadgeTextGray}>
                  {result.sampleCount} mẫu
                </Text>
              </View>
            </View>

            {!result.valid && (
              <View style={styles.warningRow}>
                <Icon name="warning" size={16} color="#f59e0b" />
                <Text style={styles.warningText}>
                  Kết quả bất thường. Hãy đo lại và giữ ngón tay yên hơn.
                </Text>
              </View>
            )}

            <View style={styles.normalRangeRow}>
              <Text style={styles.normalRangeLabel}>Nhịp tim bình thường khi nghỉ:</Text>
              <Text style={styles.normalRangeValue}>60 – 100 BPM</Text>
            </View>

            <Text style={styles.disclaimer}>
              ⚠️ Đây là kết quả tham khảo, không thay thế thiết bị y tế. Hãy gặp bác sĩ nếu nhịp tim bất thường liên tục.
            </Text>
          </View>
        )}

        {/* Error */}
        {phase === 'error' && (
          <View style={styles.errorCard}>
            <Icon name="error-outline" size={32} color="#ef4444" />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        {/* Buttons */}
        <View style={styles.buttonArea}>
          {phase === 'idle' && (
            <TouchableOpacity style={[styles.btn, styles.btnStart]} onPress={start} activeOpacity={0.8}>
              <Icon name="favorite" size={22} color="#fff" />
              <Text style={styles.btnText}>Bắt đầu đo nhịp tim</Text>
            </TouchableOpacity>
          )}

          {phase === 'measuring' && (
            <TouchableOpacity style={[styles.btn, styles.btnStop]} onPress={stop} activeOpacity={0.8}>
              <Icon name="stop" size={22} color="#fff" />
              <Text style={styles.btnText}>Dừng đo</Text>
            </TouchableOpacity>
          )}

          {(phase === 'done' || phase === 'error') && (
            <TouchableOpacity style={[styles.btn, styles.btnStart]} onPress={reset} activeOpacity={0.8}>
              <Icon name="refresh" size={22} color="#fff" />
              <Text style={styles.btnText}>Đo lại</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 52,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 24,
  },

  // BPM Circle
  bpmCircleWrap: {
    marginBottom: 24,
  },
  bpmCircleOuter: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  bpmCircle: {
    width: 196,
    height: 196,
    borderRadius: 98,
    borderWidth: 2,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  bpmNumber: {
    fontSize: 64,
    fontWeight: '200',
    lineHeight: 68,
  },
  bpmNumberPlaceholder: {
    fontSize: 64,
    fontWeight: '200',
    color: '#cbd5e1',
    lineHeight: 68,
  },
  bpmUnit: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
    letterSpacing: 2,
    marginTop: -4,
  },
  bpmLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  bpmHint: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },

  // Progress
  progressWrap: {
    width: '100%',
    marginBottom: 12,
    alignItems: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e2e8f0',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 6,
  },

  // Signal quality
  signalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  signalText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Instruction
  instructionCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  instructionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 16,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  instructionIcon: {
    fontSize: 20,
    width: 28,
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },

  // Result
  resultCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginTop: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 16,
  },
  resultRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  resultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  resultBadgeText: {
    fontSize: 15,
    fontWeight: '700',
  },
  resultBadgeTextGray: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#92400e',
    lineHeight: 18,
  },
  normalRangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    marginBottom: 12,
  },
  normalRangeLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  normalRangeValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#22c55e',
  },
  disclaimer: {
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 16,
    textAlign: 'center',
  },

  // Error
  errorCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Buttons
  buttonArea: {
    width: '100%',
    marginTop: 24,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 20,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  btnStart: {
    backgroundColor: '#ef4444',
  },
  btnStop: {
    backgroundColor: '#64748b',
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
