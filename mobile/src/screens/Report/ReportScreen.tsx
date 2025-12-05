import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { getComprehensiveReport } from '../../services/report.service';
import { ReportSummary } from '../../types';
import { COLORS } from '../../utils/constants';
import { StatCard } from '../../components/StatCard';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { AppHeader } from '../../components/AppHeader';

export const ReportScreen = ({ route }: any) => {
  const { user } = useAuth();
  const targetUserId = route?.params?.userId || user?._id;
  const [report, setReport] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReport();
  }, [targetUserId]);

  const fetchReport = async () => {
    try {
      const data = await getComprehensiveReport('30d', targetUserId);
      setReport(data);
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể tải báo cáo');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !report) {
    return <LoadingSpinner message="Đang tải báo cáo..." />;
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Báo cáo tổng quan" />
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
        <Text style={styles.sectionTitle}>Sức khỏe & Lối sống</Text>
        <View style={styles.healthStats}>
          <View style={styles.healthCard}>
            <Text style={styles.healthLabel}>Nạp vào</Text>
            <Text style={styles.healthValue}>{report.healthStats.totalCaloriesIn} kcal</Text>
          </View>
          <View style={styles.healthCard}>
            <Text style={styles.healthLabel}>Tiêu hao</Text>
            <Text style={styles.healthValue}>{report.healthStats.totalCaloriesOut} kcal</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sức khỏe tinh thần</Text>
        <Text style={styles.wellnessText}>
          {report.wellnessStats.sessionsCount} phiên tập • {report.wellnessStats.totalMinutes} phút
        </Text>
      </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
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
  },
});





