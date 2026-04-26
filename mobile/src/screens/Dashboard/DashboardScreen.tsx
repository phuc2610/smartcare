import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert, Animated, Platform, PermissionsAndroid } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Avatar } from '../../components/Avatar';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { getTodayReminders, updateReminderStatus, updateReminder, getMissedMedications, deleteReminder } from '../../services/medication.service';
import { getTodayHealthLogs, updateHealthLog, deleteHealthLog } from '../../services/health.service';
import { scheduleReminderNotifications, scheduleHealthLogNotifications, cancelNotifications } from '../../services/notification.service';
import { getAppointments, Appointment } from '../../services/appointment.service';
import { Reminder, ReminderStatus, HealthLog } from '../../types';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../theme';
import { Text } from '../../ui/Text';
import { Card } from '../../ui/Card';
import { Chip } from '../../ui/Chip';
import { Screen } from '../../ui/Screen';
import { RecommendationList } from '../../components/RecommendationList';
import { Loading } from '../../ui/Loading';
import { EmptyState } from '../../ui/EmptyState';
import { EditTaskModal } from '../../components/EditTaskModal';

interface DashboardScreenProps {
  targetUserId?: string;
  readOnly?: boolean;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  targetUserId,
  readOnly = false,
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
  const [missedReminderIds, setMissedReminderIds] = useState<Set<string>>(new Set());
  const [missedHealthLogIds, setMissedHealthLogIds] = useState<Set<string>>(new Set());

  // SOS state (M10)
  const [sosLoading, setSosLoading] = useState(false);
  const [sosSent, setSosSent] = useState(false);
  const sosPulseAnim = useRef(new Animated.Value(1)).current;

  const effectiveUserId = targetUserId || user?._id;

  const fetchData = async () => {
    if (!effectiveUserId) return;
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      const [remindersData, healthLogsData, appointmentsData, missedMedicationsData] = await Promise.all([
        getTodayReminders(effectiveUserId),
        getTodayHealthLogs(effectiveUserId),
        getAppointments({ upcoming: true }),
        getMissedMedications(effectiveUserId).catch(() => ({ missedReminders: [] })),
      ]);
      
      setReminders(remindersData.reminders);
      setHealthLogs(healthLogsData.healthLogs);
      
      // Schedule notifications for pending reminders
      for (const reminder of remindersData.reminders) {
        if (reminder.status === 'PENDING') {
          try {
            const notificationIds = await scheduleReminderNotifications(reminder);
            // Note: In a real app, you might want to save notificationIds to backend
          } catch (err) {
            console.error('Failed to schedule reminder notifications:', err);
          }
        }
      }
      
      // Schedule notifications for pending health logs
      for (const healthLog of healthLogsData.healthLogs) {
        if (!healthLog.isCompleted && healthLog.scheduledDate && healthLog.scheduledTime) {
          try {
            const notificationIds = await scheduleHealthLogNotifications(healthLog);
            // Note: In a real app, you might want to save notificationIds to backend
          } catch (err) {
            console.error('Failed to schedule health log notifications:', err);
          }
        }
      }
      
      // Identify missed reminders
      const missedReminderSet = new Set<string>();
      missedMedicationsData.missedReminders.forEach((reminder: Reminder) => {
        const scheduledTime = new Date(reminder.scheduledTime);
        if (scheduledTime <= oneHourAgo && reminder.status === ReminderStatus.PENDING) {
          missedReminderSet.add(reminder._id);
        }
      });
      setMissedReminderIds(missedReminderSet);
      
      // Identify missed health logs
      const missedHealthLogSet = new Set<string>();
      healthLogsData.healthLogs.forEach((log: HealthLog) => {
        if (log.scheduledDate && log.scheduledTime && !log.isCompleted) {
          const scheduledDateTime = new Date(`${log.scheduledDate}T${log.scheduledTime}`);
          if (scheduledDateTime <= oneHourAgo) {
            missedHealthLogSet.add(log._id);
          }
        }
      });
      setMissedHealthLogIds(missedHealthLogSet);
      
      // Hiển thị tất cả lịch hẹn sắp tới (không lọc theo ngày hôm nay)
      // để bệnh nhân thấy cả lịch hẹn bác sĩ đặt cho ngày tương lai
      const todayAppointments = appointmentsData.appointments.filter(apt => !apt.isCompleted);
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
      const reminder = reminders.find(r => r._id === id);
      // Cancel notifications if reminder has notificationIds
      if (reminder?.notificationIds && reminder.notificationIds.length > 0) {
        await cancelNotifications(reminder.notificationIds);
      }
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
    const { showConfirm, showError } = require('../../utils/alert');
    showConfirm(
      'Xác nhận',
      'Bạn có chắc muốn xóa mục này?',
      async () => {
        try {
          await deleteReminder(id);
          fetchData();
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
      const willBeCompleted = !log.isCompleted;
      // Cancel notifications if health log will be completed
      if (willBeCompleted && log.notificationIds && log.notificationIds.length > 0) {
        await cancelNotifications(log.notificationIds);
      }
      await updateHealthLog(id, { isCompleted: willBeCompleted });
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

  const takenCount = reminders.filter(r => r.status === ReminderStatus.TAKEN).length;
  const adherenceRate = reminders.length > 0 ? Math.round((takenCount / reminders.length) * 100) : null;
  const pendingTasksCount =
    pendingReminders.length +
    pendingHealthLogs.length +
    appointments.length;

  if (loading) {
    return <Loading message="Đang tải..." />;
  }

  // SOS pulse animation
  const startSOSPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(sosPulseAnim, { toValue: 1.08, duration: 600, useNativeDriver: true }),
        Animated.timing(sosPulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  };

  // Start pulse animation on mount
  if (!sosLoading && !sosSent) {
    startSOSPulse();
  }

  const handleSOS = () => {
    Alert.alert(
      '🆘 Gửi SOS Khẩn Cấp',
      'Bạn chắc chắn muốn gửi tín hiệu SOS đến tất cả bác sĩ đang theo dõi? \n\nHành động này chỉ dùng trong trường hợp khẩn cấp.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: '🆘 Gửi SOS Ngay',
          style: 'destructive',
          onPress: async () => {
            setSosLoading(true);
            try {
              let location: { latitude: number; longitude: number } | undefined;

              // Try to get GPS location
              try {
                if (Platform.OS === 'android') {
                  const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                    {
                      title: 'Vị trí GPS',
                      message: 'SmartCare cần vị trí của bạn để gửi kèm tín hiệu SOS',
                      buttonPositive: 'Cho phép',
                      buttonNegative: 'Từ chối',
                    }
                  );
                  if (granted === PermissionsAndroid.RESULTS.GRANTED) {
                    const Geolocation = require('react-native-geolocation-service').default;
                    const pos = await new Promise<any>((resolve, reject) => {
                      Geolocation.getCurrentPosition(
                        (position: any) => resolve(position),
                        (error: any) => reject(error),
                        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
                      );
                    });
                    location = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
                  }
                }
              } catch (geoErr) {
                // GPS failed - still send SOS without location
                console.log('GPS unavailable, sending SOS without location');
              }

              const { sendSOS } = require('../../services/sos.service');
              const result = await sendSOS(location);

              if (result.ok) {
                setSosSent(true);
                Alert.alert('✅ Đã gửi', 'Tín hiệu SOS đã được gửi đến bác sĩ của bạn. Hãy giữ bình tĩnh và chờ phản hồi.');
                // Reset after 30s
                setTimeout(() => setSosSent(false), 30000);
              } else {
                Alert.alert('Lỗi', result.error || 'Không thể gửi SOS. Hãy thử lại.');
              }
            } catch (err) {
              Alert.alert('Lỗi', 'Không thể gửi SOS. Kiểm tra kết nối mạng.');
            } finally {
              setSosLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Screen scrollable scrollViewProps={{ refreshControl: <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} /> }}>
      {/* Personalized Header */}
      {!readOnly && (
        <>
          <View style={styles.hero}>
            <View style={styles.heroTop}>
              <Avatar name={user?.name || 'U'} size={56} avatarUrl={user?.avatar} />
              <View style={styles.heroInfo}>
                <Text variant="body" color="surface" style={styles.heroLabel}>
                  Hôm nay
                </Text>
                <Text variant="display" color="surface" style={styles.heroName}>
                  {user?.name || 'Bệnh nhân'}
                </Text>
                {user?.medicalCondition && user.medicalCondition !== 'Normal' && (
                  <View style={styles.conditionBadge}>
                    <Text style={styles.conditionText}>{user.medicalCondition}</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.heroStats}>
              <View style={styles.statBox}>
                <Text variant="title" color="surface" semibold>
                  {adherenceRate !== null ? `${adherenceRate}%` : '--'}
                </Text>
                <Text variant="caption" color="surface" style={styles.statLabel}>
                  Tuân thủ thuốc
                </Text>
              </View>
              <View style={styles.statBox}>
                <Text variant="title" color="surface" semibold>
                  {pendingTasksCount}
                </Text>
                <Text variant="caption" color="surface" style={styles.statLabel}>
                  Việc hôm nay
                </Text>
              </View>
              <View style={styles.statBox}>
                <Text variant="title" color="surface" semibold>
                  {appointmentCount}
                </Text>
                <Text variant="caption" color="surface" style={styles.statLabel}>
                  Lịch hẹn
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.statusChip}>
            <TouchableOpacity onPress={() => setFilter('all')} activeOpacity={0.7}>
              <Chip
                label="Tất cả"
                variant={filter === 'all' ? 'primary' : 'default'}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setFilter('medication')} activeOpacity={0.7}>
              <Chip
                label={`${medicationCount} thuốc`}
                variant={filter === 'medication' ? 'primary' : 'default'}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setFilter('meal')} activeOpacity={0.7}>
              <Chip
                label={`${mealCount} bữa ăn`}
                variant={filter === 'meal' ? 'primary' : 'default'}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setFilter('exercise')} activeOpacity={0.7}>
              <Chip
                label={`${exerciseCount} vận động`}
                variant={filter === 'exercise' ? 'primary' : 'default'}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setFilter('appointment')} activeOpacity={0.7}>
              <Chip
                label={`${appointmentCount} lịch hẹn`}
                variant={filter === 'appointment' ? 'primary' : 'default'}
              />
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* SOS Emergency Button (M10) */}
      {!readOnly && (
        <View style={styles.sosContainer}>
          <Animated.View style={{ transform: [{ scale: sosPulseAnim }] }}>
            <TouchableOpacity
              onPress={handleSOS}
              disabled={sosLoading || sosSent}
              activeOpacity={0.7}
              style={[
                styles.sosButton,
                sosSent && styles.sosButtonSent,
                sosLoading && styles.sosButtonLoading,
              ]}
            >
              <Text variant="title" style={styles.sosIcon}>
                {sosSent ? '✅' : sosLoading ? '⏳' : '🆘'}
              </Text>
              <View>
                <Text variant="body" style={styles.sosTitle}>
                  {sosSent ? 'Đã gửi SOS' : sosLoading ? 'Đang gửi...' : 'SOS Khẩn Cấp'}
                </Text>
                <Text variant="caption" style={styles.sosSubtitle}>
                  {sosSent ? 'Bác sĩ đã nhận được tín hiệu' : 'Nhấn để gửi cảnh báo đến bác sĩ'}
                </Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}

      {/* Health Tips */}
      <RecommendationList />

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
                      isMissed={missedReminderIds.has(item._id)}
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
                        isMissed={missedHealthLogIds.has(item._id)}
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
                        isMissed={missedHealthLogIds.has(item._id)}
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
  isMissed?: boolean;
}

const TaskItem: React.FC<TaskItemProps> = ({
  type,
  item,
  completed = false,
  onCheck,
  onPress,
  onDelete,
  readOnly = false,
  isMissed = false,
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
      const sessionLabels: Record<string, string> = { MORNING: '☀️ Sáng', NOON: '🌤️ Trưa', EVENING: '🌙 Tối' };
      const mealLabels: Record<string, string> = { BEFORE_MEAL: '🍽️ Trước ăn', AFTER_MEAL: '✅ Sau ăn no' };
      const sessionStr = (reminder as any).session && sessionLabels[(reminder as any).session] ? ` • ${sessionLabels[(reminder as any).session]}` : '';
      const mealStr = (reminder as any).mealTiming && mealLabels[(reminder as any).mealTiming] ? ` • ${mealLabels[(reminder as any).mealTiming]}` : '';
      return `${time} • ${reminder.dosage} ${reminder.unit}${sessionStr}${mealStr}`;
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

  const isOverdue = isMissed && !completed;

  return (
    <View style={[
      styles.taskItem,
      completed && styles.taskItemCompleted,
      isOverdue && styles.taskItemMissed,
    ]}>
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
            <Icon 
              name="radio-button-unchecked" 
              size={24} 
              color={isOverdue ? COLORS.error : COLORS.textSecondary} 
            />
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
        <View style={styles.taskTitleRow}>
          <Text
            variant="body"
            color={isOverdue ? 'error' : completed ? 'textSecondary' : 'text'}
            style={[styles.taskTitle, completed && styles.taskTitleCompleted]}
          >
            {getTitle()}
          </Text>
          {isOverdue && (
            <Chip label="Trễ hẹn" variant="error" style={styles.missedBadge} />
          )}
        </View>
        <Text 
          variant="caption" 
          color={isOverdue ? 'error' : 'textSecondary'} 
          style={styles.taskSubtitle}
        >
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
  hero: {
    backgroundColor: COLORS.primary,
    marginHorizontal: 0,
    marginTop: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    padding: SPACING.lg,
    ...SHADOWS.md,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  heroInfo: {
    flex: 1,
  },
  heroLabel: {
    opacity: 0.85,
  },
  heroName: {
    marginTop: 2,
  },
  heroStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.lg,
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: SPACING.md,
    borderRadius: 14,
  },
  statLabel: {
    marginTop: 4,
  },
  conditionBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
  },
  conditionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  statusChip: {
    flexDirection: 'row',
    gap: SPACING.sm,
    flexWrap: 'wrap',
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
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
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs / 2,
  },
  missedBadge: {
    marginLeft: 0,
  },
  taskItemMissed: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error,
    backgroundColor: COLORS.error + '08',
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
  // SOS Emergency Styles (M10)
  sosContainer: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
  },
  sosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: '#DC2626',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.lg,
    ...SHADOWS.md,
    shadowColor: '#DC2626',
    elevation: 8,
  },
  sosButtonSent: {
    backgroundColor: '#16A34A',
    shadowColor: '#16A34A',
  },
  sosButtonLoading: {
    backgroundColor: '#9CA3AF',
    shadowColor: '#9CA3AF',
  },
  sosIcon: {
    fontSize: 32,
  },
  sosTitle: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  sosSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    marginTop: 2,
  },
});
