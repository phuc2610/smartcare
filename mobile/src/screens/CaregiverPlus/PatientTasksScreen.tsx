/**
 * PatientTasksScreen
 * Hiển thị các task của bệnh nhân để người thân có thể gửi thông báo
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
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
import { getPatientTasks, sendTaskNotification } from '../../services/caregiverPlus.service';
import { Reminder, HealthLog, ReminderStatus } from '../../types';
import { showSuccess, showError } from '../../utils/alert';
import { logger } from '../../utils/logger';

const AnimatedCard = Animated.createAnimatedComponent(Card);

interface TaskItem {
  _id: string;
  type: 'medication' | 'health';
  title: string;
  description?: string;
  scheduledTime: Date;
  data: Reminder | HealthLog;
}

export const PatientTasksScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const patientId = route.params?.patientId;
  const patientName = route.params?.patientName || 'Bệnh nhân';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [sendingNotification, setSendingNotification] = useState<string | null>(null);

  useEffect(() => {
    if (patientId) {
      fetchTasks();
    }
  }, [patientId]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const data = await getPatientTasks(patientId);
      
      // Combine reminders and health logs into tasks
      const taskList: TaskItem[] = [];
      
      // Add medication reminders (only pending/not completed)
      data.reminders.forEach((reminder: Reminder) => {
        if (reminder.status !== ReminderStatus.TAKEN && reminder.status !== ReminderStatus.SKIPPED) {
          taskList.push({
            _id: reminder._id,
            type: 'medication',
            title: reminder.medicationName,
            description: `${reminder.dosage} ${reminder.unit || ''}`.trim(),
            scheduledTime: new Date(reminder.scheduledTime),
            data: reminder,
          });
        }
      });
      
      // Add health logs (only not completed, exclude symptoms)
      data.healthLogs.forEach((log: HealthLog) => {
        // Skip symptoms - they are handled in alerts
        if (log.type === 'symptom') {
          return;
        }
        
        if (!log.isCompleted) {
          // Try to get scheduled date/time, fallback to date if scheduledDate doesn't exist
          let scheduledDateTime: Date | null = null;
          
          if (log.scheduledDate && log.scheduledTime) {
            // scheduledTime might be a string "HH:mm" or a Date
            const timeStr = typeof log.scheduledTime === 'string' 
              ? log.scheduledTime 
              : new Date(log.scheduledTime).toTimeString().slice(0, 5);
            scheduledDateTime = new Date(`${log.scheduledDate}T${timeStr}`);
          } else if (log.scheduledDate) {
            // Only scheduledDate, use current time or default
            scheduledDateTime = new Date(log.scheduledDate);
          } else if (log.date) {
            // Fallback to date field
            scheduledDateTime = new Date(log.date);
          }
          
          if (scheduledDateTime && !isNaN(scheduledDateTime.getTime())) {
            const taskTitle = log.type === 'meal' ? 'Bữa ăn' : 'Tập thể dục';
            
            taskList.push({
              _id: log._id,
              type: 'health',
              title: taskTitle,
              description: log.type === 'meal' 
                ? log.details?.foodName || 'Bữa ăn'
                : log.details?.exerciseType || 'Tập thể dục',
              scheduledTime: scheduledDateTime,
              data: log,
            });
          }
        }
      });
      
      // Sort by scheduled time
      taskList.sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());
      
      setTasks(taskList);
    } catch (err: any) {
      logger.error('Fetch patient tasks error:', err);
      showError('Lỗi', err.message || 'Không thể tải danh sách task');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSendNotification = async (task: TaskItem) => {
    try {
      setSendingNotification(task._id);
      await sendTaskNotification(patientId, task._id, task.type);
      showSuccess('Thành công', `Đã gửi thông báo đến ${patientName}`);
    } catch (err: any) {
      logger.error('Send notification error:', err);
      showError('Lỗi', err.message || 'Không thể gửi thông báo');
    } finally {
      setSendingNotification(null);
    }
  };

  const formatTime = (date: Date) => {
    if (!date || isNaN(date.getTime())) {
      return '--:--';
    }
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date) => {
    if (!date || isNaN(date.getTime())) {
      return 'Ngày không hợp lệ';
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const taskDate = new Date(date);
    taskDate.setHours(0, 0, 0, 0);
    
    const diffTime = taskDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Hôm nay';
    } else if (diffDays === 1) {
      return 'Ngày mai';
    } else if (diffDays === -1) {
      return 'Hôm qua';
    } else if (diffDays > 1 && diffDays <= 7) {
      return taskDate.toLocaleDateString('vi-VN', { weekday: 'long' });
    } else {
      return taskDate.toLocaleDateString('vi-VN', { 
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    }
  };

  const getTaskIcon = (type: string) => {
    if (type === 'medication') return 'medication';
    if (type === 'meal') return 'restaurant';
    if (type === 'exercise') return 'fitness-center';
    return 'favorite';
  };

  const getTaskColor = (type: string) => {
    if (type === 'medication') return COLORS.primary;
    if (type === 'meal') return COLORS.secondary;
    if (type === 'exercise') return COLORS.success;
    return COLORS.error;
  };

  if (loading) {
    return (
      <Screen>
        <AppHeader title="Tạo nhắc" showBack onBack={() => navigation.goBack()} />
        <Loading message="Đang tải tasks..." />
      </Screen>
    );
  }

  return (
    <Screen scrollable>
      <AppHeader title="Tạo nhắc" showBack onBack={() => navigation.goBack()} />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchTasks} />
        }
        showsVerticalScrollIndicator={false}
      >
        {tasks.length === 0 ? (
          <EmptyState
            icon="📋"
            title="Không có task nào"
            message={`${patientName} không có task nào chưa hoàn thành`}
          />
        ) : (
          <>
            <View style={styles.header}>
              <Text variant="section" color="text" semibold>
                Tasks của {patientName}
              </Text>
              <Text variant="caption" color="textSecondary">
                {tasks.length} task chưa hoàn thành
              </Text>
            </View>

            {tasks.map((task, index) => {
              const taskType = task.type === 'health' ? (task.data as HealthLog).type : 'medication';
              const iconName = getTaskIcon(taskType);
              const iconColor = getTaskColor(taskType);
              const isSending = sendingNotification === task._id;

              return (
                <AnimatedCard
                  key={task._id}
                  entering={FadeInDown.delay(index * 50)}
                  style={styles.taskCard}
                >
                  <View style={styles.taskContent}>
                    <View style={[styles.taskIcon, { backgroundColor: iconColor + '20' }]}>
                      <Icon name={iconName} size={24} color={iconColor} />
                    </View>
                    
                    <View style={styles.taskInfo}>
                      <Text variant="body" color="text" semibold>
                        {task.title}
                      </Text>
                      {task.description && (
                        <Text variant="caption" color="textSecondary" style={styles.taskDescription}>
                          {task.description}
                        </Text>
                      )}
                      <View style={styles.taskMeta}>
                        <Icon name="schedule" size={14} color={COLORS.textSecondary} />
                        <Text variant="caption" color="textSecondary">
                          {task.scheduledTime && !isNaN(task.scheduledTime.getTime())
                            ? task.scheduledTime.toLocaleString('vi-VN', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'Ngày giờ không hợp lệ'}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.notifyButton,
                        isSending && styles.notifyButtonDisabled,
                      ]}
                      onPress={() => handleSendNotification(task)}
                      disabled={isSending}
                    >
                      {isSending ? (
                        <Icon name="hourglass-empty" size={20} color={COLORS.textSecondary} />
                      ) : (
                        <Icon name="notifications-active" size={20} color={COLORS.warning} />
                      )}
                    </TouchableOpacity>
                  </View>
                </AnimatedCard>
              );
            })}
          </>
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
  header: {
    marginBottom: SPACING.lg,
    gap: SPACING.xs,
  },
  taskCard: {
    marginBottom: SPACING.md,
  },
  taskContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  taskIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskInfo: {
    flex: 1,
    gap: SPACING.xs / 2,
  },
  taskDescription: {
    marginTop: SPACING.xs / 2,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs / 2,
    marginTop: SPACING.xs / 2,
  },
  notifyButton: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.warning + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifyButtonDisabled: {
    opacity: 0.5,
  },
});

