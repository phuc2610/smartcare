/**
 * NotificationsScreen
 * Màn hình thông báo về task trễ hẹn và yêu cầu xác nhận liên kết
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen } from '../../ui/Screen';
import { AppHeader } from '../../components/AppHeader';
import { Text } from '../../ui/Text';
import { Card } from '../../ui/Card';
import { Chip } from '../../ui/Chip';
import { Button } from '../../ui/Button';
import { Loading } from '../../ui/Loading';
import { EmptyState } from '../../ui/EmptyState';
import { Avatar } from '../../components/Avatar';
import { COLORS, SPACING, RADIUS } from '../../theme';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types';
import { getMissedMedications } from '../../services/medication.service';
import { getTodayHealthLogs } from '../../services/health.service';
import { getCaregiverRequests, respondToRequest } from '../../services/caregiver.service';
import { updateReminderStatus } from '../../services/medication.service';
import { ReminderStatus } from '../../types';
import { updateHealthLog } from '../../services/health.service';
import { Reminder, HealthLog } from '../../types';
import { showSuccess, showError as showErrorUtil } from '../../utils/alert';
import { logger } from '../../utils/logger';

const AnimatedCard = Animated.createAnimatedComponent(Card);

interface MissedTask {
  id: string;
  type: 'medication' | 'meal' | 'exercise';
  title: string;
  subtitle: string;
  scheduledTime: Date;
  item: Reminder | HealthLog;
}

interface CaregiverRequest {
  _id: string;
  caregiverId: string;
  caregiverName: string;
  caregiverPhone: string;
  caregiverAvatar?: string;
  status: string;
  requestedAt: string;
}

export const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [missedTasks, setMissedTasks] = useState<MissedTask[]>([]);
  const [caregiverRequests, setCaregiverRequests] = useState<CaregiverRequest[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      if (!user?._id) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      setLoading(true);

      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      if (user?.role === UserRole.PATIENT) {
        // Fetch missed tasks
        const [missedMedicationsData, healthLogsData] = await Promise.all([
          getMissedMedications(user._id),
          getTodayHealthLogs(user._id),
        ]);

        const missed: MissedTask[] = [];

        // Process missed medications
        missedMedicationsData.missedReminders.forEach((reminder: Reminder) => {
          const scheduledTime = new Date(reminder.scheduledTime);
          if (scheduledTime <= oneHourAgo && reminder.status === ReminderStatus.PENDING) {
            missed.push({
              id: reminder._id,
              type: 'medication',
              title: reminder.medicationName,
              subtitle: `${new Date(reminder.scheduledTime).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
              })} • ${reminder.dosage} ${reminder.unit}`,
              scheduledTime,
              item: reminder,
            });
          }
        });

        // Process missed health logs (meal and exercise)
        healthLogsData.healthLogs.forEach((log: HealthLog) => {
          if (log.scheduledDate && log.scheduledTime && !log.isCompleted) {
            const scheduledDateTime = new Date(`${log.scheduledDate}T${log.scheduledTime}`);
            if (scheduledDateTime <= oneHourAgo) {
              missed.push({
                id: log._id,
                type: log.type === 'meal' ? 'meal' : 'exercise',
                title: log.type === 'meal' 
                  ? (log.details.foodName || 'Bữa ăn')
                  : (log.details.exerciseType || 'Vận động'),
                subtitle: log.type === 'meal'
                  ? `${log.scheduledTime} • ${log.details.calories || 0} kcal`
                  : `${log.scheduledTime} • ${log.details.durationMinutes || 0} phút`,
                scheduledTime: scheduledDateTime,
                item: log,
              });
            }
          }
        });

        // Sort by scheduled time (oldest first)
        missed.sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());
        setMissedTasks(missed);

        // Fetch caregiver requests
        try {
          const requestsData = await getCaregiverRequests();
          setCaregiverRequests(requestsData.requests);
        } catch (err) {
          // Ignore if not available
          logger.error('Fetch caregiver requests error:', err);
        }
      }
    } catch (err: any) {
      const status = err?.status || err?.response?.status;
      let errorMessage =
        err?.message ||
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        'Không thể tải thông báo';

      if (status === 429) {
        errorMessage = 'Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút.';
      }

      // Use warn/log instead of console.error to avoid redbox for handled errors
      logger.warn(
        'Fetch notifications error',
        JSON.stringify(
          {
            message: errorMessage,
            status,
            data: err?.response?.data,
          },
          null,
          2
        )
      );
      showErrorUtil('Lỗi', errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const handleCompleteMissedTask = async (task: MissedTask) => {
    try {
      setProcessingId(task.id);
      
      if (task.type === 'medication') {
        const reminder = task.item as Reminder;
        await updateReminderStatus(reminder._id, ReminderStatus.TAKEN);
      } else {
        const healthLog = task.item as HealthLog;
        await updateHealthLog(healthLog._id, { isCompleted: true });
      }
      
      showSuccess('Thành công', 'Đã đánh dấu hoàn thành');
      await fetchNotifications();
    } catch (err: any) {
      showErrorUtil('Lỗi', err.message || 'Không thể cập nhật task');
    } finally {
      setProcessingId(null);
    }
  };

  const handleNavigateToTask = (task: MissedTask) => {
    if (task.type === 'medication') {
      navigation.navigate('DashboardMain');
    } else {
      navigation.navigate('Tracking');
    }
  };

  const handleRespondToRequest = async (requestId: string, action: 'accept' | 'reject') => {
    try {
      setProcessingId(requestId);
      const result = await respondToRequest(requestId, action);
      
      if (action === 'accept') {
        showSuccess('Thành công', result.message || 'Đã chấp nhận yêu cầu liên kết');
      } else {
        showSuccess('Thành công', result.message || 'Đã từ chối yêu cầu liên kết');
      }
      
      await fetchNotifications();
    } catch (err: any) {
      showErrorUtil('Lỗi', err.message || 'Không thể xử lý yêu cầu');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading && missedTasks.length === 0 && caregiverRequests.length === 0) {
    return (
      <Screen>
        <AppHeader title="Thông báo" showBack onBack={() => navigation.goBack()} />
        <Loading message="Đang tải thông báo..." />
      </Screen>
    );
  }

  const totalNotifications = missedTasks.length + caregiverRequests.length;

  return (
    <Screen scrollable>
      <AppHeader title="Thông báo" showBack onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Caregiver Requests Section */}
        {user?.role === UserRole.PATIENT && caregiverRequests.length > 0 && (
          <View style={styles.section}>
            <Text variant="section" color="text" semibold style={styles.sectionTitle}>
              Yêu cầu liên kết
            </Text>
            {caregiverRequests.map((request, index) => (
              <AnimatedCard
                key={request._id}
                entering={FadeInDown.delay(50 + index * 30)}
                style={styles.requestCard}
              >
                <View style={styles.requestHeader}>
                  <Avatar
                    name={request.caregiverName}
                    size={48}
                    avatarUrl={request.caregiverAvatar}
                  />
                  <View style={styles.requestInfo}>
                    <Text variant="body" color="text" semibold>
                      {request.caregiverName}
                    </Text>
                    <Text variant="caption" color="textSecondary">
                      {request.caregiverPhone}
                    </Text>
                    <Text variant="caption" color="textSecondary" style={styles.requestTime}>
                      {new Date(request.requestedAt).toLocaleString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                </View>

                <Text variant="bodySmall" color="text" style={styles.requestMessage}>
                  Muốn được liên kết để theo dõi sức khỏe của bạn
                </Text>

                <View style={styles.requestActions}>
                  <Button
                    title="Từ chối"
                    onPress={() => handleRespondToRequest(request._id, 'reject')}
                    variant="outline"
                    size="medium"
                    disabled={processingId === request._id}
                    loading={processingId === request._id}
                    style={[styles.actionButton, styles.rejectButton]}
                  />
                  <Button
                    title="Chấp nhận"
                    onPress={() => handleRespondToRequest(request._id, 'accept')}
                    variant="primary"
                    size="medium"
                    disabled={processingId === request._id}
                    loading={processingId === request._id}
                    style={styles.actionButton}
                  />
                </View>
              </AnimatedCard>
            ))}
          </View>
        )}

        {/* Missed Tasks Section */}
        {missedTasks.length > 0 && (
          <View style={styles.section}>
            <Text variant="section" color="text" semibold style={styles.sectionTitle}>
              Task trễ hẹn ({missedTasks.length})
            </Text>
            {missedTasks.map((task, index) => (
              <AnimatedCard
                key={task.id}
                entering={FadeInDown.delay(100 + index * 30)}
                style={[styles.taskCard, styles.missedTaskCard]}
                onPress={() => handleNavigateToTask(task)}
              >
                <View style={styles.taskHeader}>
                  <View style={styles.taskIconContainer}>
                    <Text variant="title" style={styles.taskIcon}>
                      {task.type === 'medication' ? '💊' : task.type === 'meal' ? '🍽️' : '🏃'}
                    </Text>
                  </View>
                  <View style={styles.taskInfo}>
                    <Text variant="body" color="error" semibold>
                      {task.title}
                    </Text>
                    <Text variant="caption" color="textSecondary">
                      {task.subtitle}
                    </Text>
                    <Text variant="caption" color="error" style={styles.missedTime}>
                      Trễ: {task.scheduledTime.toLocaleString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.completeButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleCompleteMissedTask(task);
                    }}
                    disabled={processingId === task.id}
                  >
                    {processingId === task.id ? (
                      <Icon name="hourglass-empty" size={20} color={COLORS.textSecondary} />
                    ) : (
                      <Icon name="check-circle" size={24} color={COLORS.success} />
                    )}
                  </TouchableOpacity>
                </View>
              </AnimatedCard>
            ))}
          </View>
        )}

        {/* Empty State */}
        {totalNotifications === 0 && (
          <EmptyState
            icon="🔔"
            title="Không có thông báo"
            message="Tất cả đều ổn định. Không có task trễ hẹn hoặc yêu cầu liên kết nào."
          />
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
  section: {
    marginBottom: SPACING['2xl'],
  },
  sectionTitle: {
    marginBottom: SPACING.md,
  },
  requestCard: {
    marginBottom: SPACING.md,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.md,
  },
  requestInfo: {
    flex: 1,
    gap: SPACING.xs / 2,
  },
  requestTime: {
    marginTop: SPACING.xs / 2,
  },
  requestMessage: {
    marginBottom: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  requestActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  actionButton: {
    flex: 1,
  },
  rejectButton: {
    borderColor: COLORS.error,
  },
  taskCard: {
    marginBottom: SPACING.md,
  },
  missedTaskCard: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  taskIconContainer: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.error + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskIcon: {
    fontSize: 24,
  },
  taskInfo: {
    flex: 1,
    gap: SPACING.xs / 2,
  },
  missedTime: {
    marginTop: SPACING.xs / 2,
  },
  completeButton: {
    padding: SPACING.xs,
  },
});

