import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { getTodayReminders, updateReminderStatus, updateReminder } from '../../services/medication.service';
import { getTodayHealthLogs, updateHealthLog, deleteHealthLog } from '../../services/health.service';
import { getAppointments, Appointment } from '../../services/appointment.service';
import { Reminder, ReminderStatus, HealthLog } from '../../types';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../theme';
import { Text } from '../../ui/Text';
import { Card } from '../../ui/Card';
import { Chip } from '../../ui/Chip';
import { Screen } from '../../ui/Screen';
import { SOSButton } from '../../components/SOSButton';
import { RecommendationList } from '../../components/RecommendationList';
import { Loading } from '../../ui/Loading';
import { EmptyState } from '../../ui/EmptyState';
import { EditTaskModal } from '../../components/EditTaskModal';

interface DashboardScreenProps {
  targetUserId?: string;
  readOnly?: boolean;
  hideSOS?: boolean;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  targetUserId,
  readOnly = false,
  hideSOS = false,
}) => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [healthLogs, setHealthLogs] = useState<HealthLog[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingTask, setEditingTask] = useState<Reminder | HealthLog | null>(null);
  const [editingType, setEditingType] = useState<'medication' | 'health'>('medication');
  const [filter, setFilter] = useState<'all' | 'medication' | 'meal' | 'exercise' | 'appointment'>('all');

  const effectiveUserId = targetUserId || user?._id;

  const fetchData = async () => {
    if (!effectiveUserId) return;
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
      
      const [remindersData, healthLogsData, appointmentsData] = await Promise.all([
        getTodayReminders(effectiveUserId),
        getTodayHealthLogs(effectiveUserId),
        getAppointments({ upcoming: true }),
      ]);
      setReminders(remindersData.reminders);
      setHealthLogs(healthLogsData.healthLogs);
      // Filter appointments for today
      const todayAppointments = appointmentsData.appointments.filter(apt => {
        const aptDate = new Date(apt.appointmentDate);
        return aptDate >= startOfDay && aptDate <= endOfDay && !apt.isCompleted;
      });
      setAppointments(todayAppointments);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [effectiveUserId]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleCheckReminder = async (id: string) => {
    if (readOnly) return;
    try {
      await updateReminderStatus(id, ReminderStatus.TAKEN);
      fetchData();
    } catch (error) {
      console.error('Failed to update reminder:', error);
    }
  };

  const handleEditReminder = (id: string) => {
    if (readOnly) return;
    const reminder = reminders.find(r => r._id === id);
    if (reminder) {
      setEditingTask(reminder);
      setEditingType('medication');
    }
  };

  const handleSaveReminder = async (data: { scheduledTime: string; dosage: string; unit: string }) => {
    if (!editingTask || editingType !== 'medication') return;
    try {
      await updateReminder(editingTask._id, data);
      setEditingTask(null);
      fetchData();
    } catch (error) {
      console.error('Failed to update reminder:', error);
      throw error;
    }
  };

  const handleDeleteReminder = async (id: string) => {
    if (readOnly) return;
    const { showConfirm, showInfo, showError } = require('../../utils/alert');
    showConfirm(
      'Xác nhận',
      'Bạn có chắc muốn xóa mục này?',
      async () => {
        try {
          // TODO: Implement delete reminder
          showInfo('Thông báo', 'Chức năng xóa sẽ được thêm sau');
        } catch (error) {
          console.error('Failed to delete reminder:', error);
          showError('Lỗi', 'Không thể xóa');
        }
      }
    );
  };

  const handleCheckHealthLog = async (id: string) => {
    if (readOnly) return;
    try {
      const log = healthLogs.find(h => h._id === id);
      if (!log) return;
      await updateHealthLog(id, { isCompleted: !log.isCompleted });
      fetchData();
    } catch (error) {
      console.error('Failed to update health log:', error);
      Alert.alert('Lỗi', 'Không thể cập nhật');
    }
  };

  const handleDeleteHealthLog = async (id: string) => {
    if (readOnly) return;
    const { showConfirm, showError } = require('../../utils/alert');
    showConfirm(
      'Xác nhận',
      'Bạn có chắc muốn xóa mục này?',
      async () => {
        try {
          await deleteHealthLog(id);
          fetchData();
        } catch (error) {
          console.error('Failed to delete health log:', error);
          showError('Lỗi', 'Không thể xóa');
        }
      }
    );
  };

  const handleEditHealthLog = (id: string) => {
    if (readOnly) return;
    const healthLog = healthLogs.find(h => h._id === id);
    if (healthLog) {
      setEditingTask(healthLog);
      setEditingType('health');
    }
  };

  const handleSaveHealthLog = async (data: any) => {
    if (!editingTask || editingType !== 'health') return;
    try {
      await updateHealthLog(editingTask._id, data);
      setEditingTask(null);
      fetchData();
    } catch (error) {
      console.error('Failed to update health log:', error);
      throw error;
    }
  };

  const pendingReminders = reminders.filter(r => r.status !== ReminderStatus.TAKEN);
  const completedReminders = reminders.filter(r => r.status === ReminderStatus.TAKEN);
  const pendingHealthLogs = healthLogs.filter(h => !h.isCompleted);
  const completedHealthLogs = healthLogs.filter(h => h.isCompleted);

  const medicationCount = reminders.length;
  const mealCount = healthLogs.filter(h => h.type === 'meal').length;
  const exerciseCount = healthLogs.filter(h => h.type === 'exercise').length;
  const appointmentCount = appointments.length;

  // Filter tasks based on selected filter
  const getFilteredReminders = () => {
    if (filter === 'all' || filter === 'medication') {
      return { pending: pendingReminders, completed: completedReminders };
    }
    return { pending: [], completed: [] };
  };

  const getFilteredHealthLogs = () => {
    if (filter === 'all') {
      return {
        pending: pendingHealthLogs,
        completed: completedHealthLogs,
      };
    }
    if (filter === 'meal') {
      return {
        pending: pendingHealthLogs.filter(h => h.type === 'meal'),
        completed: completedHealthLogs.filter(h => h.type === 'meal'),
      };
    }
    if (filter === 'exercise') {
      return {
        pending: pendingHealthLogs.filter(h => h.type === 'exercise'),
        completed: completedHealthLogs.filter(h => h.type === 'exercise'),
      };
    }
    return { pending: [], completed: [] };
  };

  const getFilteredAppointments = () => {
    if (filter === 'all' || filter === 'appointment') {
      return appointments;
    }
    return [];
  };

  const filteredReminders = getFilteredReminders();
  const filteredHealthLogs = getFilteredHealthLogs();
  const filteredAppointments = getFilteredAppointments();

  const hasAnyTasks = () => {
    return (
      filteredReminders.pending.length > 0 ||
      filteredReminders.completed.length > 0 ||
      filteredHealthLogs.pending.length > 0 ||
      filteredHealthLogs.completed.length > 0 ||
      filteredAppointments.length > 0
    );
  };

  if (loading) {
    return <Loading message="Đang tải..." />;
  }

  return (
    <Screen scrollable scrollViewProps={{ refreshControl: <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} /> }}>
      {/* Personalized Header */}
      {!readOnly && (
        <View style={styles.header}>
          <View>
            <Text variant="display" color="text" style={styles.greeting}>
              Chào {user?.name?.split(' ')[0] || 'bạn'}, 👋
            </Text>
            <View style={styles.statusChip}>
              <TouchableOpacity
                onPress={() => setFilter('all')}
                activeOpacity={0.7}
              >
                <Chip
                  label="Tất cả"
                  variant={filter === 'all' ? 'primary' : 'default'}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setFilter('medication')}
                activeOpacity={0.7}
              >
                <Chip
                  label={`${medicationCount} thuốc`}
                  variant={filter === 'medication' ? 'primary' : 'default'}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setFilter('meal')}
                activeOpacity={0.7}
              >
                <Chip
                  label={`${mealCount} bữa ăn`}
                  variant={filter === 'meal' ? 'primary' : 'default'}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setFilter('exercise')}
                activeOpacity={0.7}
              >
                <Chip
                  label={`${exerciseCount} vận động`}
                  variant={filter === 'exercise' ? 'primary' : 'default'}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setFilter('appointment')}
                activeOpacity={0.7}
              >
                <Chip
                  label={`${appointmentCount} lịch hẹn`}
                  variant={filter === 'appointment' ? 'primary' : 'default'}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Health Tips */}
      {!hideSOS && <RecommendationList />}

      {/* Today Plan Checklist */}
      {!readOnly && (
        <Card style={styles.planCard}>
          <Text variant="section" color="text" style={styles.planTitle}>
            Kế hoạch hôm nay
          </Text>
          
          {/* Medication Tasks */}
          {(filter === 'all' || filter === 'medication') && (
            <>
              {filteredReminders.pending.length > 0 || filteredReminders.completed.length > 0 ? (
                <View style={styles.taskSection}>
                  {filteredReminders.pending.map(item => (
                    <TaskItem
                      key={item._id}
                      type="medication"
                      item={item}
                      onCheck={() => handleCheckReminder(item._id)}
                      onPress={() => handleEditReminder(item._id)}
                      onDelete={() => handleDeleteReminder(item._id)}
                      readOnly={readOnly}
                    />
                  ))}
                  {filteredReminders.completed.map(item => (
                    <TaskItem
                      key={item._id}
                      type="medication"
                      item={item}
                      completed
                      readOnly={true}
                    />
                  ))}
      </View>
              ) : filter === 'medication' ? (
        <EmptyState 
                  icon="💊"
                  title="Không có thuốc hôm nay"
                  message="Chưa có lịch uống thuốc nào được lên kế hoạch."
                />
              ) : null}
            </>
          )}

          {/* Health Log Tasks - Meal */}
          {(filter === 'all' || filter === 'meal') && (
        <>
              {filteredHealthLogs.pending.filter(h => h.type === 'meal').length > 0 ||
              filteredHealthLogs.completed.filter(h => h.type === 'meal').length > 0 ? (
                <View style={styles.taskSection}>
                  {filteredHealthLogs.pending
                    .filter(h => h.type === 'meal')
                    .map(item => (
                      <TaskItem
                        key={item._id}
                        type="health"
                        item={item}
                        onCheck={() => handleCheckHealthLog(item._id)}
                        onPress={() => handleEditHealthLog(item._id)}
                        onDelete={() => handleDeleteHealthLog(item._id)}
                        readOnly={readOnly}
                      />
              ))}
                  {filteredHealthLogs.completed
                    .filter(h => h.type === 'meal')
                    .map(item => (
                      <TaskItem
                        key={item._id}
                        type="health"
                        item={item}
                        completed
                        readOnly={true}
                      />
                    ))}
            </View>
              ) : filter === 'meal' ? (
                <EmptyState
                  icon="🍽️"
                  title="Không có bữa ăn hôm nay"
                  message="Chưa có bữa ăn nào được lên kế hoạch."
                />
              ) : null}
            </>
          )}

          {/* Health Log Tasks - Exercise */}
          {(filter === 'all' || filter === 'exercise') && (
            <>
              {filteredHealthLogs.pending.filter(h => h.type === 'exercise').length > 0 ||
              filteredHealthLogs.completed.filter(h => h.type === 'exercise').length > 0 ? (
                <View style={styles.taskSection}>
                  {filteredHealthLogs.pending
                    .filter(h => h.type === 'exercise')
                    .map(item => (
                      <TaskItem
                        key={item._id}
                        type="health"
                        item={item}
                        onCheck={() => handleCheckHealthLog(item._id)}
                        onPress={() => handleEditHealthLog(item._id)}
                        onDelete={() => handleDeleteHealthLog(item._id)}
                        readOnly={readOnly}
                      />
                    ))}
                  {filteredHealthLogs.completed
                    .filter(h => h.type === 'exercise')
                    .map(item => (
                      <TaskItem
                        key={item._id}
                        type="health"
                        item={item}
                        completed
                        readOnly={true}
                      />
                ))}
              </View>
              ) : filter === 'exercise' ? (
                <EmptyState
                  icon="🏃"
                  title="Không có vận động hôm nay"
                  message="Chưa có hoạt động vận động nào được lên kế hoạch."
                />
              ) : null}
        </>
      )}

      {/* Appointments Section */}
      {(filter === 'all' || filter === 'appointment') && (
        <View style={styles.section}>
          {filteredAppointments.length > 0 ? (
            <>
              {filteredAppointments.map(appointment => (
                <Card key={appointment._id} style={styles.taskCard}>
                  <View style={styles.taskContent}>
                    <View style={styles.taskInfo}>
                      <View style={styles.taskHeader}>
                        <View style={styles.iconContainer}>
                          <Icon name="event" size={20} color={COLORS.primary} />
                        </View>
                        <Text variant="body" color="text" semibold style={styles.taskTitle}>
                          {appointment.doctorName}
                        </Text>
                      </View>
                      {appointment.doctorSpecialty && (
                        <Text variant="caption" color="textSecondary" style={styles.taskSubtitle}>
                          {appointment.doctorSpecialty}
                        </Text>
                      )}
                      {appointment.hospitalName && (
                        <Text variant="caption" color="textSecondary" style={styles.taskSubtitle}>
                          {appointment.hospitalName}
                        </Text>
                      )}
                      <View style={styles.taskMeta}>
                        <View style={styles.iconContainerSmall}>
                          <Icon name="schedule" size={14} color={COLORS.textSecondary} />
                        </View>
                        <Text variant="caption" color="textSecondary" style={styles.taskMetaText}>
                          {new Date(appointment.appointmentDate).toLocaleDateString('vi-VN', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                          {appointment.appointmentTime && ` • ${appointment.appointmentTime}`}
                        </Text>
                      </View>
                      {appointment.notes && (
                        <Text variant="caption" color="textSecondary" style={styles.taskNotes}>
                          {appointment.notes}
                        </Text>
                      )}
                    </View>
                  </View>
                </Card>
              ))}
            </>
          ) : filter === 'appointment' ? (
            <EmptyState
              icon="📅"
              title="Không có lịch hẹn hôm nay"
              message="Chưa có lịch tái khám nào được lên kế hoạch."
            />
          ) : null}
        </View>
      )}

          {filter === 'all' && !hasAnyTasks() && (
            <EmptyState
              icon="✅"
              title="Không có nhiệm vụ hôm nay"
              message="Bạn đã hoàn thành tất cả hoặc chưa có lịch trình nào."
            />
          )}
        </Card>
      )}

      {/* SOS Button */}
      {!hideSOS && <SOSButton />}

      {/* Edit Task Modal */}
      <EditTaskModal
        visible={editingTask !== null}
        onClose={() => setEditingTask(null)}
        onSave={editingType === 'medication' ? handleSaveReminder : handleSaveHealthLog}
        task={editingTask}
        type={editingType}
      />
    </Screen>
  );
};

// Task Item Component
interface TaskItemProps {
  type: 'medication' | 'health';
  item: Reminder | HealthLog;
  completed?: boolean;
  onCheck?: () => void;
  onPress?: () => void;
  onDelete?: () => void;
  readOnly?: boolean;
}

const TaskItem: React.FC<TaskItemProps> = ({
  type,
  item,
  completed = false,
  onCheck,
  onPress,
  onDelete,
  readOnly = false,
}) => {
  const getIcon = () => {
    if (type === 'medication') return '💊';
    if ('type' in item) {
      return item.type === 'meal' ? '🍽️' : '🏃';
    }
    return '📋';
  };

  const getTitle = () => {
    if (type === 'medication') {
      return (item as Reminder).medicationName;
    }
    const healthLog = item as HealthLog;
    if (healthLog.type === 'meal') {
      return healthLog.details.foodName || 'Bữa ăn';
    } else if (healthLog.type === 'exercise') {
      return healthLog.details.exerciseType || 'Vận động';
    }
    return '';
  };

  const getSubtitle = () => {
    if (type === 'medication') {
      const reminder = item as Reminder;
      const time = new Date(reminder.scheduledTime).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      });
      return `${time} • ${reminder.dosage} ${reminder.unit}`;
    }
    const healthLog = item as HealthLog;
    if (healthLog.type === 'meal') {
      let timeStr = '';
      if (healthLog.scheduledTime) {
        // scheduledTime is already in "HH:mm" format
        timeStr = `${healthLog.scheduledTime} • `;
      }
      return `${timeStr}${healthLog.details.calories || 0} kcal`;
    } else if (healthLog.type === 'exercise') {
      let timeStr = '';
      if (healthLog.scheduledTime) {
        const time = new Date(healthLog.scheduledTime).toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
        });
        timeStr = `${time} • `;
      }
      return `${timeStr}${healthLog.details.durationMinutes || 0} phút • ${healthLog.details.caloriesBurned || 0} kcal`;
    }
    return '';
  };

  return (
    <View style={[styles.taskItem, completed && styles.taskItemCompleted]}>
      {/* Checkbox */}
      {!readOnly && (
        <TouchableOpacity
          onPress={onCheck}
          style={styles.checkboxContainer}
          activeOpacity={0.7}
        >
          {completed ? (
            <Icon name="check-circle" size={24} color={COLORS.success} />
          ) : (
            <Icon name="radio-button-unchecked" size={24} color={COLORS.textSecondary} />
          )}
        </TouchableOpacity>
      )}
      {readOnly && completed && (
        <View style={styles.checkboxContainer}>
          <Icon name="check-circle" size={24} color={COLORS.success} />
        </View>
      )}
      {readOnly && !completed && (
        <View style={styles.checkboxContainer}>
          <Icon name="radio-button-unchecked" size={24} color={COLORS.border} />
        </View>
      )}

      {/* Icon */}
      <View style={styles.taskIcon}>
        <Text variant="title">{getIcon()}</Text>
      </View>

      {/* Content - Clickable to view details */}
      <TouchableOpacity
        style={styles.taskContent}
        onPress={onPress}
        activeOpacity={0.7}
        disabled={!onPress}
      >
        <Text
          variant="body"
          color={completed ? 'textSecondary' : 'text'}
          style={[styles.taskTitle, completed && styles.taskTitleCompleted]}
        >
          {getTitle()}
        </Text>
        <Text variant="caption" color="textSecondary" style={styles.taskSubtitle}>
          {getSubtitle()}
        </Text>
      </TouchableOpacity>

      {/* Actions - Only delete button */}
      {!completed && !readOnly && onDelete && (
        <TouchableOpacity onPress={onDelete} style={styles.taskActionButton}>
          <Icon name="delete" size={18} color={COLORS.error} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  greeting: {
    marginBottom: SPACING.md,
  },
  statusChip: {
    flexDirection: 'row',
    gap: SPACING.sm,
    flexWrap: 'wrap',
  },
  planCard: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
  },
  planTitle: {
    marginBottom: SPACING.lg,
  },
  taskSection: {
    gap: SPACING.sm,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  taskItemCompleted: {
    opacity: 0.5,
  },
  checkboxContainer: {
    marginRight: SPACING.sm,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    marginBottom: SPACING.xs / 2,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
  },
  taskSubtitle: {
    // Typography handled by Text component
  },
  taskActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  taskActionButton: {
    padding: SPACING.xs,
  },
  taskCheck: {
    marginLeft: SPACING.sm,
  },
  section: {
    marginTop: SPACING.md,
  },
  taskCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  taskInfo: {
    flex: 1,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  iconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainerSmall: {
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  taskMetaText: {
    marginLeft: SPACING.xs / 2,
  },
  taskNotes: {
    marginTop: SPACING.xs,
    fontStyle: 'italic',
  },
});
