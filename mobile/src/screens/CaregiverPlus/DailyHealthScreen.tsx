/**
 * DailyHealthScreen
 * Theo dõi sức khỏe hàng ngày với date selector, summary tiles, mini visualizations
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
import { Loading } from '../../ui/Loading';
import { EmptyState } from '../../ui/EmptyState';
import { COLORS, SPACING, RADIUS } from '../../theme';
import { getDailyHealthSummary } from '../../services/caregiverPlus.service';
import { DailyHealthSummary } from '../../types';
import { logger } from '../../utils/logger';

const AnimatedCard = Animated.createAnimatedComponent(Card);

export const DailyHealthScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const patientId = route.params?.patientId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [summary, setSummary] = useState<DailyHealthSummary | null>(null);

  useEffect(() => {
    if (patientId) {
      fetchSummary();
    }
  }, [patientId, selectedDate]);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getDailyHealthSummary(patientId, selectedDate);
      setSummary(data);
    } catch (err: any) {
      setError(err.message || 'Không thể tải dữ liệu sức khỏe');
      logger.error('Fetch daily health error:', err);
    } finally {
      setLoading(false);
    }
  };

  const changeDate = (days: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
    });
  };

  const getMoodIcon = (mood?: string) => {
    switch (mood) {
      case 'good':
        return 'sentiment-satisfied';
      case 'bad':
        return 'sentiment-dissatisfied';
      default:
        return 'sentiment-neutral';
    }
  };

  const getMoodColor = (mood?: string) => {
    switch (mood) {
      case 'good':
        return COLORS.success;
      case 'bad':
        return COLORS.error;
      default:
        return COLORS.textSecondary;
    }
  };

  // Mini bar chart for calories (simple visualization)
  const renderCalorieBar = () => {
    const maxCalories = 2000; // Typical daily target
    const percentage = Math.min((summary?.calories || 0) / maxCalories * 100, 100);
    return (
      <View style={styles.barChart}>
        <View style={styles.barBackground}>
          <View style={[styles.barFill, { width: `${percentage}%` }]} />
        </View>
        <Text variant="caption" color="textSecondary">
          {summary?.calories || 0} / {maxCalories} kcal
        </Text>
      </View>
    );
  };

  if (loading && !summary) {
    return (
      <Screen>
        <AppHeader title="Sức khỏe hàng ngày" showBack onBack={() => navigation.goBack()} />
        <Loading message="Đang tải dữ liệu..." />
      </Screen>
    );
  }

  return (
    <Screen scrollable>
      <AppHeader title="Sức khỏe hàng ngày" showBack onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Date Selector */}
        <Card style={styles.dateCard}>
          <View style={styles.dateSelector}>
            <TouchableOpacity onPress={() => changeDate(-1)} style={styles.dateButton}>
              <Icon name="chevron-left" size={24} color={COLORS.primary} />
            </TouchableOpacity>
            <View style={styles.dateDisplay}>
              <Text variant="body" color="text" semibold>
                {formatDate(selectedDate)}
              </Text>
            </View>
            <TouchableOpacity onPress={() => changeDate(1)} style={styles.dateButton}>
              <Icon name="chevron-right" size={24} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </Card>

        {/* Summary Tiles */}
        <View style={styles.summaryGrid}>
          <AnimatedCard entering={FadeInDown.delay(50)} style={styles.summaryTile}>
            <Icon name="restaurant" size={32} color={COLORS.secondary} />
            <Text variant="title" color="text" semibold style={styles.tileValue}>
              {summary?.calories || 0}
            </Text>
            <Text variant="caption" color="textSecondary">
              Calories
            </Text>
            {renderCalorieBar()}
          </AnimatedCard>

          <AnimatedCard entering={FadeInDown.delay(100)} style={styles.summaryTile}>
            <Icon name="fitness-center" size={32} color={COLORS.primary} />
            <Text variant="title" color="text" semibold style={styles.tileValue}>
              {summary?.exerciseMinutes || 0}
            </Text>
            <Text variant="caption" color="textSecondary">
              Phút vận động
            </Text>
            <View style={styles.miniBar}>
              <View
                style={[
                  styles.miniBarFill,
                  { width: `${Math.min((summary?.exerciseMinutes || 0) / 60 * 100, 100)}%` },
                ]}
              />
            </View>
          </AnimatedCard>

          <AnimatedCard entering={FadeInDown.delay(150)} style={styles.summaryTile}>
            <Icon name="favorite" size={32} color={COLORS.error} />
            <Text variant="title" color="text" semibold style={styles.tileValue}>
              {summary?.symptomScore || 0}
            </Text>
            <Text variant="caption" color="textSecondary">
              Điểm triệu chứng
            </Text>
            <View style={styles.miniBar}>
              <View
                style={[
                  styles.miniBarFill,
                  {
                    width: `${Math.min((summary?.symptomScore || 0) / 10 * 100, 100)}%`,
                    backgroundColor: summary?.symptomScore && summary.symptomScore > 5 ? COLORS.error : COLORS.success,
                  },
                ]}
              />
            </View>
          </AnimatedCard>

          {summary?.mood && (
            <AnimatedCard entering={FadeInDown.delay(200)} style={styles.summaryTile}>
              <Icon
                name={getMoodIcon(summary.mood)}
                size={32}
                color={getMoodColor(summary.mood)}
              />
              <Text variant="title" color="text" semibold style={styles.tileValue}>
                {summary.mood === 'good' ? 'Tốt' : summary.mood === 'bad' ? 'Kém' : 'Bình thường'}
              </Text>
              <Text variant="caption" color="textSecondary">
                Tâm trạng
              </Text>
            </AnimatedCard>
          )}
        </View>

        {error && (
          <Card style={styles.errorCard}>
            <EmptyState
              icon="⚠️"
              title="Đã xảy ra lỗi"
              message={error}
              actionLabel="Thử lại"
              onAction={fetchSummary}
            />
          </Card>
        )}
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
  dateCard: {
    marginBottom: SPACING.lg,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateButton: {
    padding: SPACING.sm,
  },
  dateDisplay: {
    flex: 1,
    alignItems: 'center',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  summaryTile: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    marginBottom: 0,
  },
  tileValue: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs / 2,
  },
  barChart: {
    width: '100%',
    marginTop: SPACING.sm,
    gap: SPACING.xs / 2,
  },
  barBackground: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: COLORS.secondary,
    borderRadius: RADIUS.full,
  },
  miniBar: {
    width: '100%',
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    marginTop: SPACING.xs / 2,
  },
  miniBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
  },
  errorCard: {
    marginBottom: 0,
  },
});

