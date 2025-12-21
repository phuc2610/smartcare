/**
 * ReportsAnalyticsScreen
 * Báo cáo & phân tích với insights, sections, export CTA
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen } from '../../ui/Screen';
import { AppHeader } from '../../components/AppHeader';
import { Text } from '../../ui/Text';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Loading } from '../../ui/Loading';
import { COLORS, SPACING } from '../../theme';
import { ReportSummary } from '../../types';
import { getComprehensiveReport } from '../../services/report.service';
import { showError as showErrorUtil } from '../../utils/alert';
import { logger } from '../../utils/logger';

const AnimatedCard = Animated.createAnimatedComponent(Card);

export const ReportsAnalyticsScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const patientId = route.params?.patientId;

  const [report, setReport] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState<'today' | 'week' | 'month'>('week');

  useEffect(() => {
    if (patientId) {
      fetchReport();
    }
  }, [patientId, selectedRange]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const data = await getComprehensiveReport(selectedRange, patientId);
      setReport(data);
    } catch (err: any) {
      logger.error('Fetch report error:', err);
      showErrorUtil('Lỗi', err.message || 'Không thể tải báo cáo');
    } finally {
      setLoading(false);
    }
  };


  // Calculate average symptom severity
  const avgSeverity = report?.symptomsByDate?.length
    ? report.symptomsByDate.reduce((sum, day) => {
        const dayAvg = day.symptoms.length
          ? day.symptoms.reduce((s, sym) => s + (sym.severity || 0), 0) / day.symptoms.length
          : 0;
        return sum + dayAvg;
      }, 0) / report.symptomsByDate.length
    : 0;

  if (loading) {
    return (
      <Screen>
        <AppHeader title="Báo cáo & phân tích" showBack onBack={() => navigation.goBack()} />
        <Loading message="Đang tải báo cáo..." />
      </Screen>
    );
  }

  return (
    <Screen scrollable>
      <AppHeader title="Báo cáo & phân tích" showBack onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Range Tabs */}
        <View style={styles.rangeTabs}>
          <TouchableOpacity
            style={[styles.rangeTab, selectedRange === 'today' && styles.rangeTabActive]}
            onPress={() => setSelectedRange('today')}
          >
            <Text variant="caption" style={[styles.rangeTabText, selectedRange === 'today' && styles.rangeTabTextActive]}>
              Ngày
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.rangeTab, selectedRange === 'week' && styles.rangeTabActive]}
            onPress={() => setSelectedRange('week')}
          >
            <Text variant="caption" style={[styles.rangeTabText, selectedRange === 'week' && styles.rangeTabTextActive]}>
              Tuần
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.rangeTab, selectedRange === 'month' && styles.rangeTabActive]}
            onPress={() => setSelectedRange('month')}
          >
            <Text variant="caption" style={[styles.rangeTabText, selectedRange === 'month' && styles.rangeTabTextActive]}>
              Tháng
            </Text>
          </TouchableOpacity>
        </View>
        {/* Insight Card */}
        <AnimatedCard entering={FadeInDown.delay(50)} style={styles.insightCard}>
          <Text variant="section" color="text" semibold style={styles.insightTitle}>
            Tuân thủ thuốc
          </Text>
          <Text variant="display" color="primary" semibold style={styles.insightValue}>
            {report?.medicationAdherence.rate || 0}%
          </Text>
          <Text variant="caption" color="textSecondary">
            {report?.medicationAdherence.taken || 0} / {report?.medicationAdherence.total || 0} đã uống
          </Text>
        </AnimatedCard>

        {/* Sections */}
        <View style={styles.section}>
          <Text variant="section" color="text" semibold style={styles.sectionTitle}>
            Thuốc
          </Text>
          <Card style={styles.sectionCard}>
            <View style={styles.statRow}>
              <Text variant="body" color="text">Tổng số lần</Text>
              <Text variant="body" color="text" semibold>{report?.medicationAdherence.total || 0}</Text>
            </View>
            <View style={styles.statRow}>
              <Text variant="body" color="text">Đã uống</Text>
              <Text variant="body" color="success" semibold>{report?.medicationAdherence.taken || 0}</Text>
            </View>
            <View style={styles.statRow}>
              <Text variant="body" color="text">Đã bỏ</Text>
              <Text variant="body" color="error" semibold>{report?.medicationAdherence.skipped || 0}</Text>
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          <Text variant="section" color="text" semibold style={styles.sectionTitle}>
            Dinh dưỡng
          </Text>
          <Card style={styles.sectionCard}>
            <View style={styles.statRow}>
              <Text variant="body" color="text">Calories nạp vào</Text>
              <Text variant="body" color="text" semibold>{report?.healthStats.totalCaloriesIn || 0} kcal</Text>
            </View>
            <View style={styles.statRow}>
              <Text variant="body" color="text">Calories đốt cháy</Text>
              <Text variant="body" color="text" semibold>{report?.healthStats.totalCaloriesOut || 0} kcal</Text>
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          <Text variant="section" color="text" semibold style={styles.sectionTitle}>
            Triệu chứng
          </Text>
          <Card style={styles.sectionCard}>
            <View style={styles.statRow}>
              <Text variant="body" color="text">Điểm trung bình</Text>
              <Text variant="body" color="text" semibold>
                {avgSeverity.toFixed(1)} / 10
              </Text>
            </View>
          </Card>
        </View>

      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING['3xl'],
  },
  insightCard: {
    marginBottom: SPACING.lg,
    alignItems: 'center',
  },
  insightTitle: {
    marginBottom: SPACING.sm,
  },
  insightValue: {
    marginBottom: SPACING.xs / 2,
  },
  section: {
    marginBottom: SPACING['2xl'],
  },
  sectionTitle: {
    marginBottom: SPACING.md,
  },
  sectionCard: {
    marginBottom: 0,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  rangeTabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    padding: 4,
    borderRadius: 12,
    marginBottom: SPACING.lg,
    gap: 4,
  },
  rangeTab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  rangeTabActive: {
    backgroundColor: COLORS.primary,
  },
  rangeTabText: {
    color: COLORS.textSecondary,
  },
  rangeTabTextActive: {
    color: '#fff',
  },
});

