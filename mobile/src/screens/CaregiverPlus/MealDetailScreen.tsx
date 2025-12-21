/**
 * MealDetailScreen
 * Theo dõi bữa ăn chi tiết với timeline và week history
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
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
import { getTodayHealthLogs, getHealthSummary } from '../../services/health.service';
import { HealthLog } from '../../types';
import { logger } from '../../utils/logger';

const AnimatedCard = Animated.createAnimatedComponent(Card);

interface MealItem {
  _id: string;
  foodName: string;
  calories?: number;
  time: Date;
  date: string;
}

export const MealDetailScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const patientId = route.params?.patientId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [todayMeals, setTodayMeals] = useState<MealItem[]>([]);
  const [weekMeals, setWeekMeals] = useState<MealItem[]>([]);
  const [totalCalories, setTotalCalories] = useState(0);
  const [avgCalories, setAvgCalories] = useState(0);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (patientId) {
      fetchData();
    } else {
      setError('Không tìm thấy ID bệnh nhân');
      setLoading(false);
    }
  }, [patientId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get today's meals
      const todayData = await getTodayHealthLogs(patientId);
      const todayMealLogs = todayData.healthLogs.filter((log: HealthLog) => log.type === 'meal');
      
      const todayMealsList: MealItem[] = todayMealLogs.map((log: HealthLog) => {
        const mealDate = log.date || log.scheduledDate || today;
        const mealTime = log.scheduledTime 
          ? (typeof log.scheduledTime === 'string' 
              ? new Date(`${mealDate}T${log.scheduledTime}`)
              : new Date(log.scheduledTime))
          : new Date(mealDate);
        
        return {
          _id: log._id,
          foodName: log.details?.foodName || 'Bữa ăn',
          calories: log.details?.calories || 0,
          time: mealTime,
          date: mealDate,
        };
      });

      // Get week's meals
      const weekData = await getHealthSummary('7d', patientId);
      const weekMealLogs = weekData.logs.filter((log: HealthLog) => log.type === 'meal');
      
      const weekMealsList: MealItem[] = weekMealLogs.map((log: HealthLog) => {
        const mealDate = log.date || log.scheduledDate || '';
        const mealTime = log.scheduledTime 
          ? (typeof log.scheduledTime === 'string' 
              ? new Date(`${mealDate}T${log.scheduledTime}`)
              : new Date(log.scheduledTime))
          : new Date(mealDate);
        
        return {
          _id: log._id,
          foodName: log.details?.foodName || 'Bữa ăn',
          calories: log.details?.calories || 0,
          time: mealTime,
          date: mealDate,
        };
      });

      // Calculate stats
      const todayTotal = todayMealsList.reduce((sum, meal) => sum + (meal.calories || 0), 0);
      const weekTotal = weekMealsList.reduce((sum, meal) => sum + (meal.calories || 0), 0);
      const weekAvg = weekMealsList.length > 0 ? Math.round(weekTotal / 7) : 0;

      setTodayMeals(todayMealsList);
      setWeekMeals(weekMealsList);
      setTotalCalories(todayTotal);
      setAvgCalories(weekAvg);
    } catch (err: any) {
      setError(err.message || 'Không thể tải dữ liệu bữa ăn');
      logger.error('Fetch meal detail error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPeriodLabel = (hour: number) => {
    if (hour >= 5 && hour < 11) return 'Sáng';
    if (hour >= 11 && hour < 14) return 'Trưa';
    if (hour >= 14 && hour < 19) return 'Chiều';
    return 'Tối';
  };

  const getPeriodIcon = (hour: number) => {
    if (hour >= 5 && hour < 11) return 'wb-sunny';
    if (hour >= 11 && hour < 14) return 'brightness-high';
    if (hour >= 14 && hour < 19) return 'brightness-3';
    return 'nights-stay';
  };

  const groupedTodayMeals = todayMeals.reduce((acc, meal) => {
    const period = getPeriodLabel(meal.time.getHours());
    if (!acc[period]) {
      acc[period] = [];
    }
    acc[period].push(meal);
    return acc;
  }, {} as Record<string, MealItem[]>);

  const periods = ['Sáng', 'Trưa', 'Chiều', 'Tối'];

  if (loading && todayMeals.length === 0) {
    return (
      <Screen>
        <AppHeader title="Bữa ăn" showBack onBack={() => navigation.goBack()} />
        <Loading message="Đang tải dữ liệu bữa ăn..." />
      </Screen>
    );
  }

  if (error && todayMeals.length === 0) {
    return (
      <Screen>
        <AppHeader title="Bữa ăn" showBack onBack={() => navigation.goBack()} />
        <EmptyState
          icon="⚠️"
          title="Đã xảy ra lỗi"
          message={error}
          actionLabel="Thử lại"
          onAction={fetchData}
        />
      </Screen>
    );
  }

  return (
    <Screen scrollable>
      <AppHeader title="Bữa ăn" showBack onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary */}
        <AnimatedCard entering={FadeInDown.delay(50)} style={styles.summaryCard}>
          <Text variant="section" color="text" semibold style={styles.summaryTitle}>
            Tổng quan
          </Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryStat}>
              <Text variant="display" color="secondary" semibold>
                {totalCalories}
              </Text>
              <Text variant="caption" color="textSecondary">
                Calo hôm nay
              </Text>
            </View>
            <View style={styles.summaryStat}>
              <Text variant="display" color="secondary" semibold>
                {avgCalories}
              </Text>
              <Text variant="caption" color="textSecondary">
                Trung bình/ngày
              </Text>
            </View>
            <View style={styles.summaryStat}>
              <Text variant="display" color="secondary" semibold>
                {todayMeals.length}
              </Text>
              <Text variant="caption" color="textSecondary">
                Bữa ăn
              </Text>
            </View>
          </View>
        </AnimatedCard>

        {/* Today Timeline */}
        <View style={styles.section}>
          <Text variant="section" color="text" semibold style={styles.sectionTitle}>
            Hôm nay
          </Text>
          {todayMeals.length === 0 ? (
            <Card style={styles.emptyCard}>
              <EmptyState
                icon="🍽️"
                title="Chưa có bữa ăn"
                message="Chưa có bữa ăn nào được ghi nhận cho hôm nay"
              />
            </Card>
          ) : (
            periods
              .map((period, periodIndex) => {
                const items = groupedTodayMeals[period] || [];
                if (items.length === 0) return null;

                const periodHour = period === 'Sáng' ? 8 : period === 'Trưa' ? 12 : period === 'Chiều' ? 15 : 20;
                const periodIcon = getPeriodIcon(periodHour);

                return (
                  <AnimatedCard
                    key={period}
                    entering={FadeInDown.delay(100 + periodIndex * 50)}
                    style={styles.timelineCard}
                  >
                    <View style={styles.timelineHeader}>
                      <View style={styles.timelineHeaderLeft}>
                        <Icon
                          name={periodIcon}
                          size={20}
                          color={COLORS.secondary}
                        />
                        <Text variant="body" color="text" semibold>
                          {period || ''}
                        </Text>
                      </View>
                    </View>

                    {items.map((item, itemIndex) => {
                      const foodName = item?.foodName || 'Bữa ăn';
                      const calories = item?.calories || 0;
                      const timeStr = item?.time && item.time instanceof Date
                        ? item.time.toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '';

                      return (
                        <View
                          key={item?._id || itemIndex}
                          style={[
                            styles.timelineItem,
                            itemIndex < items.length - 1 && styles.timelineItemBorder,
                          ]}
                        >
                          <View style={styles.timelineItemLeft}>
                            <Text variant="body" color="text" semibold>
                              {foodName}
                            </Text>
                            <Text variant="caption" color="textSecondary">
                              {calories > 0 ? `${calories} cal` : 'Chưa có calo'}{timeStr ? ` • ${timeStr}` : ''}
                            </Text>
                          </View>
                          {calories > 0 && (
                            <View style={styles.calorieBadge}>
                              <Text variant="caption" color="secondary" semibold>
                                {calories} cal
                              </Text>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </AnimatedCard>
                );
              })
              .filter(Boolean)
          )}
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
  summaryCard: {
    marginBottom: SPACING.lg,
  },
  summaryTitle: {
    marginBottom: SPACING.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  summaryStat: {
    flex: 1,
    alignItems: 'center',
  },
  section: {
    marginBottom: SPACING['2xl'],
  },
  sectionTitle: {
    marginBottom: SPACING.md,
  },
  emptyCard: {
    marginBottom: 0,
  },
  timelineCard: {
    marginBottom: SPACING.md,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  timelineHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  timelineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  timelineItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  timelineItemLeft: {
    flex: 1,
    gap: SPACING.xs / 2,
  },
  calorieBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs / 2,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.secondary + '20',
  },
});

