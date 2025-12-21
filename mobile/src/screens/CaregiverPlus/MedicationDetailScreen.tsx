/**
 * MedicationDetailScreen
 * Theo dõi thuốc chi tiết với timeline, week history, và adherence
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
import { Chip } from '../../ui/Chip';
import { Loading } from '../../ui/Loading';
import { EmptyState } from '../../ui/EmptyState';
import { COLORS, SPACING, RADIUS } from '../../theme';
import {
  getMedicationTimeline,
  getMedicationWeekHistory,
  getMedicationAdherence,
} from '../../services/caregiverPlus.service';
import { MedicationTimelineItem, MedicationWeekHistory } from '../../types';
import { logger } from '../../utils/logger';

const AnimatedCard = Animated.createAnimatedComponent(Card);

export const MedicationDetailScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const patientId = route.params?.patientId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<MedicationTimelineItem[]>([]);
  const [weekHistory, setWeekHistory] = useState<MedicationWeekHistory[]>([]);
  const [adherence, setAdherence] = useState({ rate: 0, total: 0, taken: 0, skipped: 0 });

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

      const [timelineData, historyData, adherenceData] = await Promise.all([
        getMedicationTimeline(patientId, today),
        getMedicationWeekHistory(patientId),
        getMedicationAdherence(patientId),
      ]);

      setTimeline(timelineData.timeline);
      setWeekHistory(historyData.history);
      setAdherence(adherenceData);
    } catch (err: any) {
      setError(err.message || 'Không thể tải dữ liệu thuốc');
      logger.error('Fetch medication detail error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case 'morning':
        return 'Sáng';
      case 'noon':
        return 'Trưa';
      case 'evening':
        return 'Chiều';
      case 'night':
        return 'Tối';
      default:
        return period;
    }
  };

  const getPeriodIcon = (period: string) => {
    switch (period) {
      case 'morning':
        return 'wb-sunny';
      case 'noon':
        return 'brightness-high';
      case 'evening':
        return 'brightness-3';
      case 'night':
        return 'nights-stay';
      default:
        return 'schedule';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'TAKEN':
        return 'check-circle';
      case 'SKIPPED':
        return 'cancel';
      default:
        return 'radio-button-unchecked';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'TAKEN':
        return COLORS.success;
      case 'SKIPPED':
        return COLORS.error;
      default:
        return COLORS.textSecondary;
    }
  };

  const groupedTimeline = timeline.reduce((acc, item) => {
    if (!acc[item.period]) {
      acc[item.period] = [];
    }
    acc[item.period].push(item);
    return acc;
  }, {} as Record<string, MedicationTimelineItem[]>);

  const periods = ['morning', 'noon', 'evening', 'night'];

  if (loading && timeline.length === 0) {
    return (
      <Screen>
        <AppHeader title="Lịch uống thuốc" showBack onBack={() => navigation.goBack()} />
        <Loading message="Đang tải lịch thuốc..." />
      </Screen>
    );
  }

  if (error && timeline.length === 0) {
    return (
      <Screen>
        <AppHeader title="Lịch uống thuốc" showBack onBack={() => navigation.goBack()} />
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
      <AppHeader title="Lịch uống thuốc" showBack onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Adherence Summary */}
        <AnimatedCard entering={FadeInDown.delay(50)} style={styles.summaryCard}>
          <Text variant="section" color="text" semibold style={styles.summaryTitle}>
            Tuân thủ thuốc
          </Text>
          <View style={styles.adherenceRow}>
            <View style={styles.adherenceStat}>
              <Text variant="display" color="primary" semibold>
                {adherence.rate}%
              </Text>
              <Text variant="caption" color="textSecondary">
                Tỷ lệ tuân thủ
              </Text>
            </View>
            <View style={styles.adherenceStats}>
              <View style={styles.statItem}>
                <Text variant="title" color="text" semibold>
                  {adherence.taken}
                </Text>
                <Text variant="caption" color="textSecondary">
                  Đã uống
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text variant="title" color="text" semibold>
                  {adherence.skipped}
                </Text>
                <Text variant="caption" color="textSecondary">
                  Đã bỏ
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text variant="title" color="text" semibold>
                  {adherence.total}
                </Text>
                <Text variant="caption" color="textSecondary">
                  Tổng cộng
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${adherence.rate}%` },
              ]}
            />
          </View>
        </AnimatedCard>

        {/* Today Timeline */}
        <View style={styles.section}>
          <Text variant="section" color="text" semibold style={styles.sectionTitle}>
            Hôm nay
          </Text>
          {timeline.length === 0 ? (
            <Card style={styles.emptyCard}>
              <EmptyState
                icon="💊"
                title="Chưa có lịch thuốc"
                message="Chưa có lịch uống thuốc nào được lên kế hoạch cho hôm nay"
              />
            </Card>
          ) : (
            periods.map((period, periodIndex) => {
              const items = groupedTimeline[period] || [];
              if (items.length === 0) return null;

              return (
                <AnimatedCard
                  key={period}
                  entering={FadeInDown.delay(100 + periodIndex * 50)}
                  style={styles.timelineCard}
                >
                  <View style={styles.timelineHeader}>
                    <View style={styles.timelineHeaderLeft}>
                      <Icon
                        name={getPeriodIcon(period)}
                        size={20}
                        color={COLORS.primary}
                      />
                      <Text variant="body" color="text" semibold>
                        {getPeriodLabel(period)}
                      </Text>
                    </View>
                  </View>

                  {items.map((item, itemIndex) => (
                    <View
                      key={item._id}
                      style={[
                        styles.timelineItem,
                        itemIndex < items.length - 1 && styles.timelineItemBorder,
                      ]}
                    >
                      <View style={styles.timelineItemLeft}>
                        <Text variant="body" color="text" semibold>
                          {item.medicationName}
                        </Text>
                        <Text variant="caption" color="textSecondary">
                          {item.dosage} {item.unit} • {new Date(item.scheduledTime).toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </View>
                      <Icon
                        name={getStatusIcon(item.status)}
                        size={24}
                        color={getStatusColor(item.status)}
                      />
                    </View>
                  ))}
                </AnimatedCard>
              );
            })
          )}
        </View>

        {/* Week History */}
        {weekHistory.length > 0 && (
          <View style={styles.section}>
            <Text variant="section" color="text" semibold style={styles.sectionTitle}>
              Lịch sử tuần này
            </Text>
            <Card style={styles.historyCard}>
              {weekHistory.map((day, index) => (
                <View
                  key={day.date}
                  style={[
                    styles.historyItem,
                    index < weekHistory.length - 1 && styles.historyItemBorder,
                  ]}
                >
                  <View style={styles.historyItemLeft}>
                    <Text variant="body" color="text" semibold>
                      {new Date(day.date).toLocaleDateString('vi-VN', {
                        weekday: 'short',
                        day: '2-digit',
                        month: '2-digit',
                      })}
                    </Text>
                    <Text variant="caption" color="textSecondary">
                      {day.taken}/{day.total} đã uống
                    </Text>
                  </View>
                  <View style={styles.historyItemRight}>
                    <Text variant="body" color="primary" semibold>
                      {day.adherenceRate}%
                    </Text>
                    <View style={styles.miniProgressBar}>
                      <View
                        style={[
                          styles.miniProgressFill,
                          { width: `${day.adherenceRate}%` },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              ))}
            </Card>
          </View>
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
  summaryCard: {
    marginBottom: SPACING.lg,
  },
  summaryTitle: {
    marginBottom: SPACING.md,
  },
  adherenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  adherenceStat: {
    alignItems: 'flex-start',
  },
  adherenceStats: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  statItem: {
    alignItems: 'center',
  },
  progressBar: {
    height: 10,
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
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
  historyCard: {
    marginBottom: 0,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  historyItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  historyItemLeft: {
    flex: 1,
    gap: SPACING.xs / 2,
  },
  historyItemRight: {
    alignItems: 'flex-end',
    gap: SPACING.xs / 2,
    minWidth: 80,
  },
  miniProgressBar: {
    width: 60,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
  },
});

