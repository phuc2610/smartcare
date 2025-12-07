import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../../contexts/AuthContext';
import { getComprehensiveReport } from '../../services/report.service';
import { analyzeReport } from '../../services/ai.service';
import { ReportSummary } from '../../types';
import { COLORS } from '../../utils/constants';
import { StatCard } from '../../components/StatCard';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { AppHeader } from '../../components/AppHeader';

type ReportRange = 'today' | 'week' | 'month';

export const ReportScreen = ({ route }: any) => {
  const { user } = useAuth();
  const targetUserId = route?.params?.userId || user?._id;
  const [report, setReport] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState<ReportRange>('today');
  const [expandedMeals, setExpandedMeals] = useState(false);
  const [aiNotes, setAiNotes] = useState<string | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);


  useEffect(() => {
    fetchReport();
  }, [targetUserId, selectedRange]);

  const fetchReport = async () => {
    setLoading(true);
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
      Alert.alert('Lỗi', 'Không thể tải báo cáo');
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

  if (loading || !report) {
    return <LoadingSpinner message="Đang tải báo cáo..." />;
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

  return (
    <View style={styles.container}>
      <AppHeader title="Báo cáo tổng quan" />
      
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

      {/* AI Notes - Only for week and month */}
      {(selectedRange === 'week' || selectedRange === 'month') && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lưu ý</Text>
          {loadingAI ? (
            <View style={styles.aiLoadingContainer}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.aiLoadingText}>AI đang phân tích...</Text>
            </View>
          ) : aiNotes ? (
            <FormattedNotes text={aiNotes} />
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




