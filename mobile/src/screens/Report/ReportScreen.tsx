import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Linking, Platform, Dimensions } from 'react-native';
import { showError, showSuccess } from '../../utils/alert';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, Line, Text as SvgText, Rect } from 'react-native-svg';
import { useAuth } from '../../contexts/AuthContext';
import { getComprehensiveReport, exportReportPDF } from '../../services/report.service';
import { analyzeReport } from '../../services/ai.service';
import { ReportSummary } from '../../types';
import { COLORS } from '../../utils/constants';
import { StatCard } from '../../components/StatCard';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { HEART_RATE_STORAGE_KEY, HeartRateRecord } from '../Health/HeartRateScreen';

const SCREEN_W = Dimensions.get('window').width;
const CHART_W = SCREEN_W - 32 - 32; // margin 16*2, padding 16*2
const CHART_H = 130;
const PAD_L = 32; const PAD_R = 12; const PAD_T = 14; const PAD_B = 28;
const PLOT_W = CHART_W - PAD_L - PAD_R;
const PLOT_H = CHART_H - PAD_T - PAD_B;

const getBpmColor = (bpm: number) => {
  if (bpm < 60) return '#3b82f6';
  if (bpm <= 100) return '#22c55e';
  if (bpm <= 140) return '#f59e0b';
  return '#ef4444';
};
const getBpmStatus = (bpm: number) => {
  if (bpm < 60) return { label: 'Nhịp chậm', color: '#3b82f6', bg: '#dbeafe' };
  if (bpm <= 100) return { label: 'Bình thường', color: '#22c55e', bg: '#d1fae5' };
  if (bpm <= 140) return { label: 'Nhịp nhanh', color: '#f59e0b', bg: '#fef3c7' };
  return { label: 'Rất nhanh', color: '#ef4444', bg: '#fee2e2' };
};

// ============ Heart Rate Chart (SVG) ============
const HeartRateReportChart: React.FC<{ data: HeartRateRecord[] }> = ({ data }) => {
  if (data.length === 0) return null;
  const display = data.slice(0, 10).reverse();
  const bpms = display.map(d => d.bpm);
  const rawMin = Math.min(...bpms);
  const rawMax = Math.max(...bpms);
  const pad = Math.max((rawMax - rawMin) * 0.25, 15);
  const minY = Math.max(0, rawMin - pad);
  const maxY = rawMax + pad;
  const rangeY = maxY - minY || 1;
  const n = display.length;

  const pts = display.map((d, i) => ({
    x: PAD_L + (i / Math.max(n - 1, 1)) * PLOT_W,
    y: PAD_T + PLOT_H - ((d.bpm - minY) / rangeY) * PLOT_H,
    bpm: d.bpm, ts: d.timestamp,
  }));

  const linePath = pts.reduce((acc, pt, i) => {
    if (i === 0) return `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
    const prev = pts[i - 1];
    const cx1 = prev.x + (pt.x - prev.x) / 3;
    const cx2 = prev.x + (2 * (pt.x - prev.x)) / 3;
    return `${acc} C ${cx1.toFixed(1)} ${prev.y.toFixed(1)}, ${cx2.toFixed(1)} ${pt.y.toFixed(1)}, ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
  }, '');

  const areaPath = `${linePath} L ${pts[pts.length-1].x.toFixed(1)} ${(PAD_T+PLOT_H).toFixed(1)} L ${pts[0].x.toFixed(1)} ${(PAD_T+PLOT_H).toFixed(1)} Z`;
  const latestColor = getBpmColor(pts[pts.length - 1]?.bpm || 75);
  const yLabels = [Math.round(maxY), Math.round((minY + maxY) / 2), Math.round(minY)];

  return (
    <View>
      <Svg width={CHART_W} height={CHART_H}>
        <Defs>
          <LinearGradient id="rptGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={latestColor} stopOpacity="0.3" />
            <Stop offset="100%" stopColor={latestColor} stopOpacity="0.02" />
          </LinearGradient>
        </Defs>
        {/* Grid */}
        {[0, 0.5, 1].map((t, i) => (
          <Line key={i} x1={PAD_L} y1={PAD_T + t * PLOT_H} x2={PAD_L + PLOT_W} y2={PAD_T + t * PLOT_H} stroke="#f1f5f9" strokeWidth="1" />
        ))}
        {/* Y labels */}
        {yLabels.map((v, i) => (
          <SvgText key={i} x={PAD_L - 4} y={PAD_T + [0, 0.5, 1][i] * PLOT_H + 4} textAnchor="end" fontSize="9" fill="#94a3b8">{v}</SvgText>
        ))}
        {/* Area */}
        {n > 1 && <Path d={areaPath} fill="url(#rptGrad)" />}
        {/* Line */}
        {n > 1 && <Path d={linePath} stroke={latestColor} strokeWidth="2.5" fill="none" strokeLinecap="round" />}
        {/* Points */}
        {pts.map((pt, i) => {
          const isLast = i === pts.length - 1;
          const c = getBpmColor(pt.bpm);
          return (
            <React.Fragment key={i}>
              {isLast && <Circle cx={pt.x} cy={pt.y} r={10} fill={c} fillOpacity="0.12" />}
              <Circle cx={pt.x} cy={pt.y} r={isLast ? 5 : 3.5} fill={isLast ? c : '#fff'} stroke={c} strokeWidth={isLast ? 0 : 2} />
            </React.Fragment>
          );
        })}
        {/* X labels */}
        {pts.map((pt, i) => {
          if (n > 5 && i % 2 !== 0 && i !== n - 1) return null;
          const d = new Date(pt.ts);
          return (
            <SvgText key={i} x={pt.x} y={PAD_T + PLOT_H + 18} textAnchor="middle" fontSize="9" fill="#94a3b8">
              {`${d.getDate()}/${d.getMonth() + 1}`}
            </SvgText>
          );
        })}
        {/* Normal range band label */}
        <SvgText x={PAD_L + PLOT_W + 2} y={PAD_T + PLOT_H * 0.1} fontSize="8" fill="#22c55e" fontWeight="600">OK</SvgText>
      </Svg>
    </View>
  );
};

type ReportRange = 'today' | 'week' | 'month';

export const ReportScreen = ({ route }: any) => {
  const { user } = useAuth();
  const targetUserId = route?.params?.userId || user?._id;
  const [report, setReport] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRange, setSelectedRange] = useState<ReportRange>('today');
  const [expandedMeals, setExpandedMeals] = useState(false);
  const [aiNotes, setAiNotes] = useState<string | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [heartHistory, setHeartHistory] = useState<HeartRateRecord[]>([]);

  // Load heart rate history from AsyncStorage
  useEffect(() => {
    AsyncStorage.getItem(HEART_RATE_STORAGE_KEY)
      .then(raw => { if (raw) setHeartHistory(JSON.parse(raw)); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchReport();
  }, [targetUserId, selectedRange]);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    setExpandedMeals(false);
    setAiNotes(null);
    try {
      const data = await getComprehensiveReport(selectedRange, targetUserId);
      console.log('[Report] Data received:', JSON.stringify(data, null, 2));
      console.log('[Report] symptomsByDate:', data.symptomsByDate);
      console.log('[Report] symptomsByDate length:', data.symptomsByDate?.length);
      setReport(data);
      
      // Fetch AI analysis for week/month
      if ((selectedRange === 'week' || selectedRange === 'month') && user?.medicalCondition) {
        fetchAIAnalysis(data, selectedRange as 'week' | 'month');
      }
    } catch (error) {
      console.error('[Report] Error:', error);
      const message =
        (error as any)?.message ||
        (error as any)?.response?.data?.error ||
        'Không thể tải báo cáo';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAIAnalysis = async (reportData: ReportSummary, range: 'week' | 'month') => {
    if (!user?.medicalCondition) return;
    
    setLoadingAI(true);
    try {
      const meals = reportData.meals || [];
      const exercises = reportData.exerciseStats?.exercises || [];
      const symptoms = reportData.symptomsByDate?.flatMap(day => day.symptoms) || [];
      
      // Backend will check database first and only call AI if needed
      const analysis = await analyzeReport(
        range,
        user.medicalCondition,
        {
          totalCaloriesIn: reportData.healthStats.totalCaloriesIn,
          totalCaloriesOut: reportData.healthStats.totalCaloriesOut,
          meals: meals.map(m => ({ foodName: m.foodName, calories: m.calories, date: m.date })),
          exercises: exercises.map(e => ({
            exerciseType: e.exerciseType,
            durationMinutes: e.durationMinutes,
            caloriesBurned: e.caloriesBurned,
          })),
          symptoms: symptoms.map(s => ({
            symptomName: s.symptomName,
            severity: s.severity,
            note: s.note,
          })),
        }
      );
      setAiNotes(analysis.notes);
    } catch (error) {
      console.error('[Report] AI Analysis Error:', error);
      // Don't show error, just don't display notes
    } finally {
      setLoadingAI(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Đang tải báo cáo..." />;
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchReport}>
            <Text style={styles.retryText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!report) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Không có dữ liệu báo cáo.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchReport}>
            <Text style={styles.retryText}>Tải lại</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const getRangeLabel = (range: ReportRange) => {
    switch (range) {
      case 'today':
        return 'Hôm nay';
      case 'week':
        return 'Tuần này';
      case 'month':
        return 'Tháng này';
      default:
        return 'Hôm nay';
    }
  };

  const handleExportPDF = async () => {
    setExportingPDF(true);
    try {
      const pdfUrl = await exportReportPDF(selectedRange, targetUserId);
      
      // Open URL in browser - PDF will be downloaded
      const canOpen = await Linking.canOpenURL(pdfUrl);
      if (canOpen) {
        await Linking.openURL(pdfUrl);
        showSuccess('Thành công', 'Đang tải báo cáo PDF...\nVui lòng kiểm tra thư mục Tải xuống');
      } else {
        showError('Lỗi', 'Không thể mở trình duyệt');
      }
    } catch (error: any) {
      console.error('[Export PDF] Error:', error);
      showError('Lỗi', error?.message || 'Không thể xuất báo cáo PDF');
    } finally {
      setExportingPDF(false);
    }
  };

  return (
    <View style={styles.container}>
      
      {/* Action Bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.exportButtonAction} onPress={handleExportPDF} disabled={exportingPDF}>
          {exportingPDF ? <ActivityIndicator size="small" color="#fff" /> : <Icon name="picture-as-pdf" size={20} color="#fff" />}
          <Text style={styles.exportButtonText}>Xuất báo cáo (PDF)</Text>
        </TouchableOpacity>
      </View>

      {/* Range Tabs */}
      <View style={styles.rangeTabs}>
        <TouchableOpacity
          style={[styles.rangeTab, selectedRange === 'today' && styles.rangeTabActive]}
          onPress={() => setSelectedRange('today')}
        >
          <Text style={[styles.rangeTabText, selectedRange === 'today' && styles.rangeTabTextActive]}>
            Ngày
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.rangeTab, selectedRange === 'week' && styles.rangeTabActive]}
          onPress={() => setSelectedRange('week')}
        >
          <Text style={[styles.rangeTabText, selectedRange === 'week' && styles.rangeTabTextActive]}>
            Tuần
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.rangeTab, selectedRange === 'month' && styles.rangeTabActive]}
          onPress={() => setSelectedRange('month')}
        >
          <Text style={[styles.rangeTabText, selectedRange === 'month' && styles.rangeTabTextActive]}>
            Tháng
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tuân thủ điều trị</Text>
        <View style={styles.statsRow}>
          <StatCard 
            value={report.medicationAdherence.total} 
            label="Tổng liều" 
            color={COLORS.primary}
          />
          <StatCard 
            value={report.medicationAdherence.taken} 
            label="Đã uống" 
            color={COLORS.success}
          />
          <StatCard 
            value={`${report.medicationAdherence.rate}%`} 
            label="Tỷ lệ" 
            color={COLORS.info}
          />
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {selectedRange === 'today' ? 'Bữa ăn' : 'Sức khỏe'}
          </Text>
          {selectedRange === 'today' && report.meals && report.meals.length > 0 && (
            <TouchableOpacity
              onPress={() => setExpandedMeals(!expandedMeals)}
              style={styles.expandButton}
            >
              <Icon
                name={expandedMeals ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                size={24}
                color={COLORS.primary}
              />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.healthStats}>
          <View style={styles.healthCard}>
            <Text style={styles.healthLabel}>Nạp vào</Text>
            <Text style={styles.healthValue}>{report.healthStats.totalCaloriesIn} kcal</Text>
          </View>
        </View>
        
        {selectedRange === 'today' && expandedMeals && report.meals && report.meals.length > 0 && (
          <View style={styles.mealsList}>
            {report.meals.map((meal, index) => (
              <View key={index} style={styles.mealItem}>
                <Text style={styles.mealName}>{meal.foodName}</Text>
                <Text style={styles.mealCalories}>{meal.calories} kcal</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sức khỏe tinh thần</Text>
        <Text style={styles.wellnessText}>
          {report.wellnessStats.sessionsCount} phiên tập • {report.wellnessStats.totalMinutes} phút
        </Text>
        
        {report.exerciseStats && report.exerciseStats.exercises.length > 0 && (
          <View style={styles.exerciseSection}>
            <Text style={styles.subsectionTitle}>Vận động</Text>
            {report.exerciseStats.exercises.slice(0, 5).map((exercise, index) => (
              <View key={index} style={styles.exerciseItem}>
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseType}>{exercise.exerciseType}</Text>
                  <Text style={styles.exerciseDetails}>
                    {exercise.durationMinutes} phút • {exercise.caloriesBurned} kcal
                  </Text>
                </View>
              </View>
            ))}
            {report.exerciseStats.exercises.length > 5 && (
              <Text style={styles.moreText}>
                +{report.exerciseStats.exercises.length - 5} hoạt động khác
              </Text>
            )}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Triệu chứng theo ngày</Text>
        {report.symptomsByDate && report.symptomsByDate.length > 0 ? (
          report.symptomsByDate.map((dayData, index) => {
            // Parse date string (YYYY-MM-DD) to Date object
            const [year, month, day] = dayData.date.split('-').map(Number);
            const dateObj = new Date(year, month - 1, day);
            
            return (
              <View key={index} style={styles.symptomDayCard}>
                <Text style={styles.symptomDate}>
                  {dateObj.toLocaleDateString('vi-VN', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
                {dayData.symptoms.map((symptom, sIndex) => (
                  <View key={sIndex} style={styles.symptomItem}>
                    <Text style={styles.symptomName}>{symptom.symptomName}</Text>
                    <View style={styles.symptomMeta}>
                      <Text style={styles.symptomSeverity}>Mức độ: {symptom.severity}/10</Text>
                      {symptom.note && (
                        <Text style={styles.symptomNote}>{symptom.note}</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            );
          })
        ) : (
          <Text style={styles.emptyText}>
            Chưa có dữ liệu triệu chứng {getRangeLabel(selectedRange).toLowerCase()}
          </Text>
        )}
      </View>

      {/* ===== NHỊP TIM CHART ===== */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleRow}>
            <Icon name="favorite" size={16} color="#ef4444" />
            <Text style={styles.sectionTitle}>Nhịp tim</Text>
          </View>
          {heartHistory.length > 0 && (
            <Text style={styles.hrCount}>{heartHistory.length} lần đo</Text>
          )}
        </View>

        {heartHistory.length === 0 ? (
          <View style={styles.hrEmpty}>
            <Icon name="favorite-border" size={32} color="#fca5a5" />
            <Text style={styles.hrEmptyTitle}>Chưa có dữ liệu nhịp tim</Text>
            <Text style={styles.hrEmptySub}>Dùng tính năng đo nhịp tim để xem biểu đồ phân tích tại đây</Text>
          </View>
        ) : (
          <>
            {/* Latest reading */}
            {(() => {
              const latest = heartHistory[0];
              const status = getBpmStatus(latest.bpm);
              const avg = Math.round(heartHistory.reduce((s, r) => s + r.bpm, 0) / heartHistory.length);
              const minBpm = Math.min(...heartHistory.map(r => r.bpm));
              const maxBpm = Math.max(...heartHistory.map(r => r.bpm));
              return (
                <>
                  {/* Top stats */}
                  <View style={styles.hrStatsRow}>
                    <View style={[styles.hrStatCard, { borderColor: status.color + '30', backgroundColor: status.bg + '50' }]}>
                      <Icon name="favorite" size={16} color={status.color} />
                      <Text style={[styles.hrStatNum, { color: status.color }]}>{latest.bpm}</Text>
                      <Text style={styles.hrStatUnit}>BPM</Text>
                      <Text style={[styles.hrStatLabel, { color: status.color }]}>{status.label}</Text>
                      <Text style={styles.hrStatSub}>Mới nhất</Text>
                    </View>
                    <View style={styles.hrMiniStats}>
                      <View style={styles.hrMiniRow}>
                        <Icon name="show-chart" size={13} color="#64748b" />
                        <Text style={styles.hrMiniLabel}>TB: <Text style={styles.hrMiniVal}>{avg} BPM</Text></Text>
                      </View>
                      <View style={styles.hrMiniRow}>
                        <Icon name="arrow-downward" size={13} color="#3b82f6" />
                        <Text style={styles.hrMiniLabel}>Thấp: <Text style={[styles.hrMiniVal, { color: '#3b82f6' }]}>{minBpm}</Text></Text>
                      </View>
                      <View style={styles.hrMiniRow}>
                        <Icon name="arrow-upward" size={13} color="#ef4444" />
                        <Text style={styles.hrMiniLabel}>Cao: <Text style={[styles.hrMiniVal, { color: '#ef4444' }]}>{maxBpm}</Text></Text>
                      </View>
                      <View style={styles.hrMiniRow}>
                        <Icon name="schedule" size={13} color="#64748b" />
                        <Text style={styles.hrMiniLabel}>
                          {new Date(latest.timestamp).toLocaleTimeString('vi', { hour: '2-digit', minute: '2-digit' })}
                          {' · '}{new Date(latest.timestamp).toLocaleDateString('vi', { day: '2-digit', month: '2-digit' })}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Chart */}
                  <Text style={styles.hrChartTitle}>Biểu đồ xu hướng ({Math.min(heartHistory.length, 10)} điểm gần nhất)</Text>
                  <HeartRateReportChart data={heartHistory} />

                  {/* Legend */}
                  <View style={styles.hrLegend}>
                    {[
                      { c: '#3b82f6', l: '< 60 Chậm' },
                      { c: '#22c55e', l: '60–100 Bình thường' },
                      { c: '#f59e0b', l: '101–140 Nhanh' },
                      { c: '#ef4444', l: '> 140 Rất nhanh' },
                    ].map((item, i) => (
                      <View key={i} style={styles.hrLegendItem}>
                        <View style={[styles.hrLegendDot, { backgroundColor: item.c }]} />
                        <Text style={styles.hrLegendText}>{item.l}</Text>
                      </View>
                    ))}
                  </View>

                  {/* History table */}
                  <Text style={styles.hrHistTitle}>Lịch sử {heartHistory.length} lần đo</Text>
                  {heartHistory.slice(0, 5).map((r, i) => {
                    const s = getBpmStatus(r.bpm);
                    return (
                      <View key={i} style={styles.hrHistRow}>
                        <Icon name="favorite" size={12} color={s.color} />
                        <Text style={[styles.hrHistBpm, { color: s.color }]}>{r.bpm} BPM</Text>
                        <View style={[styles.hrHistBadge, { backgroundColor: s.bg }]}>
                          <Text style={[styles.hrHistBadgeText, { color: s.color }]}>{s.label}</Text>
                        </View>
                        <Text style={styles.hrHistTime}>
                          {new Date(r.timestamp).toLocaleDateString('vi', { day: '2-digit', month: '2-digit' })}
                          {' '}{new Date(r.timestamp).toLocaleTimeString('vi', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    );
                  })}
                  {heartHistory.length > 5 && (
                    <Text style={styles.hrMore}>+ {heartHistory.length - 5} lần đo khác</Text>
                  )}

                  {/* Medical note for heart rate */}
                  <View style={styles.medDisclaimer}>
                    <Icon name="info-outline" size={13} color="#64748b" />
                    <Text style={styles.medDisclaimerText}>
                      Nhịp tim bình thường khi nghỉ ngơi: <Text style={{ fontWeight: '700' }}>60–100 BPM</Text> (WHO).
                      Kết quả đo bằng camera chỉ mang tính tham khảo, không thay thế thiết bị y tế lâm sàng.
                    </Text>
                  </View>
                </>
              );
            })()}
          </>
        )}
      </View>

      {/* Medication History */}
      {report.reminders && report.reminders.length > 0 && (() => {
        // Group reminders by medicationName
        const grouped: Record<string, { name: string; taken: number; skipped: number; pending: number; entries: any[] }> = {};
        report.reminders.forEach((r: any) => {
          const key = r.medicationName || 'Không rõ';
          if (!grouped[key]) {
            grouped[key] = { name: key, taken: 0, skipped: 0, pending: 0, entries: [] };
          }
          if (r.status === 'TAKEN') grouped[key].taken++;
          else if (r.status === 'SKIPPED') grouped[key].skipped++;
          else grouped[key].pending++;
          grouped[key].entries.push(r);
        });

        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💊 Lịch sử uống thuốc</Text>
            {Object.values(grouped).map((med, idx) => {
              const totalMed = med.taken + med.skipped + med.pending;
              const rate = totalMed > 0 ? Math.round((med.taken / totalMed) * 100) : 0;
              const rateColor = rate >= 80 ? '#10B981' : rate >= 50 ? '#F59E0B' : '#EF4444';
              return (
                <View key={idx} style={styles.medHistCard}>
                  <View style={styles.medHistHeader}>
                    <Text style={styles.medHistName} numberOfLines={1}>{med.name}</Text>
                    <View style={[styles.medHistRateBadge, { backgroundColor: rateColor + '20' }]}>
                      <Text style={[styles.medHistRateText, { color: rateColor }]}>{rate}%</Text>
                    </View>
                  </View>
                  <View style={styles.medHistStats}>
                    <View style={styles.medHistStat}>
                      <Text style={styles.medHistStatVal}>{med.taken}</Text>
                      <Text style={[styles.medHistStatLabel, { color: '#10B981' }]}>Đã uống</Text>
                    </View>
                    <View style={styles.medHistDivider} />
                    <View style={styles.medHistStat}>
                      <Text style={styles.medHistStatVal}>{med.skipped}</Text>
                      <Text style={[styles.medHistStatLabel, { color: '#F59E0B' }]}>Bỏ qua</Text>
                    </View>
                    <View style={styles.medHistDivider} />
                    <View style={styles.medHistStat}>
                      <Text style={styles.medHistStatVal}>{med.pending}</Text>
                      <Text style={[styles.medHistStatLabel, { color: '#6B7280' }]}>Chờ</Text>
                    </View>
                  </View>
                  {/* Show last 3 taken entries */}
                  {med.entries
                    .filter((e: any) => e.status === 'TAKEN' && e.takenAt)
                    .slice(0, 3)
                    .map((e: any, eIdx: number) => {
                      const taken = new Date(e.takenAt);
                      const scheduled = new Date(e.scheduledTime);
                      const diffMin = Math.round((taken.getTime() - scheduled.getTime()) / 60000);
                      const diffStr = diffMin <= 15 ? '✓ Đúng giờ' : `⏱ Trễ ${diffMin} phút`;
                      return (
                        <View key={eIdx} style={styles.medHistEntry}>
                          <Text style={styles.medHistEntryTime}>
                            {scheduled.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            {selectedRange !== 'today' && ` • ${scheduled.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}`}
                          </Text>
                          <Text style={[styles.medHistEntryStatus, { color: diffMin <= 15 ? '#10B981' : '#F59E0B' }]}>
                            {diffStr}
                          </Text>
                        </View>
                      );
                    })}
                </View>
              );
            })}
          </View>
        );
      })()}

      {/* AI Notes - Only for week and month */}
      {(selectedRange === 'week' || selectedRange === 'month') && (
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Icon name="auto-awesome" size={16} color="#8b5cf6" />
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Phân tích AI</Text>
          </View>
          <View style={styles.aiDisclaimerTop}>
            <Icon name="warning-amber" size={12} color="#f59e0b" />
            <Text style={styles.aiDisclaimerTopText}>
              Thông tin này do AI tạo ra dựa trên dữ liệu của bạn, chỉ mang tính tham khảo, không phải lời khuyên y tế.
            </Text>
          </View>
          {loadingAI ? (
            <View style={styles.aiLoadingContainer}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.aiLoadingText}>AI đang phân tích...</Text>
            </View>
          ) : aiNotes ? (
            <>
              <FormattedNotes text={aiNotes} />
              {/* Medical disclaimer */}
              <View style={styles.medDisclaimer}>
                <Icon name="local-hospital" size={13} color="#64748b" />
                <Text style={styles.medDisclaimerText}>
                  ⚠️ <Text style={{ fontWeight: '700' }}>Lưu ý y khoa:</Text> Các phân tích trên được tạo bởi AI dựa theo dữ liệu bạn nhập.{' '}
                  Không thay thế chẩn đoán từ bác sĩ hoặc chức năng của thiết bị y tế. Nếu có triệu chứng bất thường, hãy tham khảo bác sĩ ngay.
                </Text>
              </View>
            </>
          ) : (
            <Text style={styles.emptyText}>Chưa có lưu ý</Text>
          )}
        </View>
      )}
      </ScrollView>
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
  },
  exportButtonAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  exportButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  rangeTabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 8,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  rangeTab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: COLORS.background,
    marginHorizontal: 4,
  },
  rangeTabActive: {
    backgroundColor: COLORS.primaryLight,
  },
  rangeTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  rangeTabTextActive: {
    color: COLORS.primary,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    margin: 16,
    borderRadius: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  expandButton: {
    padding: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  healthStats: {
    flexDirection: 'row',
    gap: 12,
  },
  healthCard: {
    flex: 1,
    padding: 16,
    backgroundColor: COLORS.background,
    borderRadius: 12,
  },
  healthLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  healthValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  wellnessText: {
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 16,
  },
  exerciseSection: {
    marginTop: 16,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  exerciseItem: {
    padding: 12,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    marginBottom: 8,
  },
  exerciseInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseType: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  exerciseDetails: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  moreText: {
    fontSize: 12,
    color: COLORS.primary,
    textAlign: 'center',
    marginTop: 8,
  },
  symptomDayCard: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  symptomDate: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 12,
  },
  symptomItem: {
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
  },
  symptomName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  symptomMeta: {
    marginTop: 4,
  },
  symptomSeverity: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  symptomNote: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    padding: 16,
  },
  mealsList: {
    marginTop: 12,
    gap: 8,
  },
  mealItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.background,
    borderRadius: 8,
  },
  mealName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  mealCalories: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  aiLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  aiLoadingText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  aiNotesText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 22,
    textAlign: 'justify',
  },
  aiNotesBold: {
    fontWeight: 'bold',
    color: COLORS.text,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
  },
  retryText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  exportButton: {
    padding: 8,
  },
  // Medication History
  medHistCard: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  medHistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  medHistName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
    marginRight: 8,
  },
  medHistRateBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  medHistRateText: {
    fontSize: 13,
    fontWeight: '700',
  },
  medHistStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 10,
    marginBottom: 8,
  },
  medHistStat: {
    alignItems: 'center',
    flex: 1,
  },
  medHistStatVal: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  medHistStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  medHistDivider: {
    width: 1,
    height: 28,
    backgroundColor: COLORS.border || '#E5E7EB',
  },
  medHistEntry: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  medHistEntryTime: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  medHistEntryStatus: {
    fontSize: 13,
    fontWeight: '600',
  },

  // ======= Heart Rate Section =======
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  hrCount: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },
  hrEmpty: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  hrEmptyTitle: { fontSize: 14, fontWeight: '700', color: '#334155' },
  hrEmptySub: { fontSize: 12, color: '#94a3b8', textAlign: 'center' },

  hrStatsRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  hrStatCard: {
    width: 88,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    gap: 2,
  },
  hrStatNum: { fontSize: 28, fontWeight: '800', letterSpacing: -1, lineHeight: 30 },
  hrStatUnit: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  hrStatLabel: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  hrStatSub: { fontSize: 9, color: '#94a3b8', marginTop: 1 },
  hrMiniStats: { flex: 1, justifyContent: 'space-around', gap: 4 },
  hrMiniRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hrMiniLabel: { fontSize: 12, color: '#64748b' },
  hrMiniVal: { fontWeight: '700', color: '#0f172a' },

  hrChartTitle: { fontSize: 12, color: '#94a3b8', fontWeight: '500', marginBottom: 6 },

  hrLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10, marginBottom: 14 },
  hrLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  hrLegendDot: { width: 7, height: 7, borderRadius: 3.5 },
  hrLegendText: { fontSize: 10, color: '#94a3b8' },

  hrHistTitle: { fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 8 },
  hrHistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  hrHistBpm: { fontSize: 14, fontWeight: '700', width: 64 },
  hrHistBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  hrHistBadgeText: { fontSize: 11, fontWeight: '600' },
  hrHistTime: { flex: 1, textAlign: 'right', fontSize: 11, color: '#94a3b8' },
  hrMore: { fontSize: 12, color: COLORS.primary, textAlign: 'center', marginTop: 8 },

  // Medical disclaimer
  medDisclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  medDisclaimerText: { flex: 1, fontSize: 11, color: '#64748b', lineHeight: 16 },

  // AI disclaimer top
  aiDisclaimerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
    backgroundColor: '#fffbeb',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  aiDisclaimerTopText: { flex: 1, fontSize: 11, color: '#92400e', lineHeight: 15 },
});

// Component to format AI notes with bold text
const FormattedNotes: React.FC<{ text: string }> = ({ text }) => {
  // Split text by ** and create Text components with bold styling
  const parts = text.split(/(\*\*.*?\*\*)/g);
  
  return (
    <Text style={styles.aiNotesText}>
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          // Remove ** and make bold
          const boldText = part.slice(2, -2);
          return (
            <Text key={index} style={styles.aiNotesBold}>
              {boldText}
            </Text>
          );
        }
        return <Text key={index}>{part}</Text>;
      })}
    </Text>
  );
};




