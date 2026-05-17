import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Animated, Platform, PermissionsAndroid, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Avatar } from '../../components/Avatar';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { getTodayReminders, updateReminderStatus, updateReminder, getMissedMedications, deleteReminder, deleteMedication, takeAllNow } from '../../services/medication.service';
import { getTodayHealthLogs, updateHealthLog, deleteHealthLog } from '../../services/health.service';
import { scheduleSessionGroupedNotifications, scheduleHealthLogNotifications, cancelNotifications } from '../../services/notification.service';
import { showError, showAlert } from '../../utils/alert';
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
import { useFallDetection } from '../../hooks/useFallDetection';
import { FallAlertModal } from '../../components/FallAlertModal';

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
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const [editingType, setEditingType] = useState<'medication' | 'health' | 'appointment'>('medication');
  const [filter, setFilter] = useState<'all' | 'medication' | 'meal' | 'exercise' | 'appointment'>('all');
  const [timeOfDay, setTimeOfDay] = useState<'all' | 'morning' | 'noon' | 'afternoon' | 'evening'>('all');
  const [missedReminderIds, setMissedReminderIds] = useState<Set<string>>(new Set());
  const [missedHealthLogIds, setMissedHealthLogIds] = useState<Set<string>>(new Set());

  // SOS state (M10)
  const [sosLoading, setSosLoading] = useState(false);
  const [sosSent, setSosSent] = useState(false);
  const sosPulseAnim = useRef(new Animated.Value(1)).current;

  // Fall Detection — Apple Watch style (V2: chạy nền)
  const { isMonitoring, fallDetected, startMonitoring, resetFallState, simulateFall, isBackgroundCapable } = useFallDetection();
  const [showFallAlert, setShowFallAlert] = useState(false);

  // Tự động bật Fall Detection khi vào Dashboard (chỉ cho patient)
  useEffect(() => {
    if (!readOnly && user?.role === 'PATIENT') {
      startMonitoring();
    }
  }, [readOnly, user?.role]);

  // Hiện modal khi phát hiện ngã
  useEffect(() => {
    if (fallDetected) {
      setShowFallAlert(true);
    }
  }, [fallDetected]);

  const handleFallAlertDismiss = () => {
    setShowFallAlert(false);
    resetFallState();
  };

  const handleFallSOSTriggered = () => {
    // SOS đã được gửi từ FallAlertModal
    console.log('[Dashboard] Fall SOS triggered automatically');
  };

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
      
      // Group pending reminders by session and time to avoid notification spam
      const pendingRems = remindersData.reminders.filter((r: any) => r.status === 'PENDING');
      const groupedReminders: Record<string, any[]> = {};
      
      pendingRems.forEach((r: any) => {
        const key = `${r.session || 'CUSTOM'}_${r.scheduledTime}`;
        if (!groupedReminders[key]) groupedReminders[key] = [];
        groupedReminders[key].push(r);
      });

      // Schedule grouped notifications — 1 notification per session
      for (const key of Object.keys(groupedReminders)) {
        try {
          const group = groupedReminders[key];
          await scheduleSessionGroupedNotifications(
            group[0].session || 'CUSTOM',
            group
          );
        } catch (err) {
          console.error('Failed to schedule grouped notifications:', err);
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
    const reminder = reminders.find(r => r._id === id);

    showAlert('warning', 'Xóa thuốc', `Bạn muốn xóa "${reminder?.medicationName || 'mục này'}"?`, [
      { text: 'Hủy', onPress: () => {}, style: 'cancel' },
      {
        text: 'Xóa toàn bộ thuốc',
        onPress: async () => {
          try {
            if (reminder?.medicationId) {
              await deleteMedication(reminder.medicationId);
            } else {
              await deleteReminder(id);
            }
            fetchData();
          } catch (error) {
            showError('Lỗi', 'Không thể xóa');
          }
        },
        style: 'destructive',
      },
    ]);
  };

  const handleCheckHealthLog = async (id: string) => {
    if (readOnly) return;
    try {
      const log = healthLogs.find(h => h._id === id);
      if (!log) return;
      const willBeCompleted = !log.isCompleted;

      const proceedUpdate = async () => {
        // Cancel notifications if health log will be completed
        if (willBeCompleted && log.notificationIds && log.notificationIds.length > 0) {
          await cancelNotifications(log.notificationIds);
        }
        await updateHealthLog(id, { isCompleted: willBeCompleted });
        fetchData();
      };

      if (willBeCompleted && (log.type === 'meal' || log.type === 'exercise')) {
        let scheduledDateTime = new Date();
        if (log.scheduledDate && log.scheduledTime) {
          scheduledDateTime = new Date(`${log.scheduledDate}T${log.scheduledTime}`);
        } else if (log.scheduledTime) {
          const dateStr = typeof log.date === 'string' ? log.date.split('T')[0] : new Date(log.date).toISOString().split('T')[0];
          scheduledDateTime = new Date(`${dateStr}T${log.scheduledTime}`);
        }

        const now = new Date();
        const diffMinutes = (now.getTime() - scheduledDateTime.getTime()) / 60000;
        if (Math.abs(diffMinutes) > 30) {
          const isLate = diffMinutes > 30;
          const { showConfirm } = require('../../utils/alert');
          showConfirm(
            'Cảnh báo',
            `Bạn đang ghi nhận ${isLate ? 'trễ' : 'sớm'} hơn kế hoạch. Bạn có chắc đã hoàn thành thực tế?`,
            async () => {
              await proceedUpdate();
            }
          );
          return;
        }
      }

      await proceedUpdate();
    } catch (error) {
      console.error('Failed to update health log:', error);
      showError('Lỗi', 'Không thể cập nhật');
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

  const handleCheckAppointment = async (id: string) => {
    if (readOnly) return;
    try {
      const appointment = appointments.find(a => a._id === id);
      if (!appointment) return;
      const willBeCompleted = !appointment.isCompleted;
      const { updateAppointment } = require('../../services/appointment.service');
      await updateAppointment(id, { isCompleted: willBeCompleted });
      fetchData();
    } catch (error) {
      console.error('Failed to update appointment:', error);
      showError('Lỗi', 'Không thể cập nhật');
    }
  };

  const handleEditAppointment = (id: string) => {
    if (readOnly) return;
    const appointment = appointments.find(a => a._id === id);
    if (appointment) {
      setEditingTask(appointment);
      setEditingType('appointment');
    }
  };

  const handleSaveAppointment = async (data: any) => {
    if (!editingTask || editingType !== 'appointment') return;
    try {
      const { updateAppointment } = require('../../services/appointment.service');
      await updateAppointment(editingTask._id, data);
      setEditingTask(null);
      fetchData();
    } catch (error) {
      console.error('Failed to update appointment:', error);
      throw error;
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    if (readOnly) return;
    const { showConfirm } = require('../../utils/alert');
    showConfirm(
      'Xác nhận',
      'Bạn có chắc muốn xóa lịch hẹn này?',
      async () => {
        try {
          const { deleteAppointment } = require('../../services/appointment.service');
          await deleteAppointment(id);
          fetchData();
        } catch (error) {
          console.error('Failed to delete appointment:', error);
          showError('Lỗi', 'Không thể xóa');
        }
      }
    );
  };

  const pendingReminders = reminders.filter(r => r.status !== ReminderStatus.TAKEN);
  const completedReminders = reminders.filter(r => r.status === ReminderStatus.TAKEN);
  const pendingHealthLogs = healthLogs.filter(h => !h.isCompleted);
  const completedHealthLogs = healthLogs.filter(h => h.isCompleted);

  const medicationCount = reminders.length;
  const mealCount = healthLogs.filter(h => h.type === 'meal').length;
  const exerciseCount = healthLogs.filter(h => h.type === 'exercise').length;
  const appointmentCount = appointments.length;

  // Group pending reminders by session
  const groupRemindersBySession = () => {
    const groups: { [key: string]: Reminder[] } = {
      MORNING: [],
      NOON: [],
      EVENING: [],
      CUSTOM: [],
    };
    
    pendingReminders.forEach(r => {
      if (r.session && groups[r.session]) {
        groups[r.session].push(r);
      } else {
        // Fallback or custom
        groups['CUSTOM'].push(r);
      }
    });

    return [
      { session: 'MORNING', label: 'Sáng', icon: '☀️', reminders: groups['MORNING'] },
      { session: 'NOON', label: 'Trưa', icon: '🌤️', reminders: groups['NOON'] },
      { session: 'EVENING', label: 'Tối', icon: '🌙', reminders: groups['EVENING'] },
    ].filter(g => g.reminders.length >= 2); // Only show group if there are 2 or more medications
  };

  const pendingRemindersBySession = groupRemindersBySession();

  const handleTakeAll = async (reminderIds: string[]) => {
    if (readOnly) return;
    try {
      // Cancel notifications for all these reminders
      for (const id of reminderIds) {
        const reminder = reminders.find(r => r._id === id);
        if (reminder?.notificationIds && reminder.notificationIds.length > 0) {
          await cancelNotifications(reminder.notificationIds);
        }
      }
      await takeAllNow(reminderIds);
      fetchData();
    } catch (error) {
      console.error('Failed to take all reminders:', error);
      showError('Lỗi', 'Không thể cập nhật trạng thái');
    }
  };

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

  // Time-of-day filter helper
  const getTimeOfDayForHour = (hour: number): 'morning' | 'noon' | 'afternoon' | 'evening' => {
    if (hour >= 5 && hour < 11) return 'morning';
    if (hour >= 11 && hour < 14) return 'noon';
    if (hour >= 14 && hour < 18) return 'afternoon';
    return 'evening';
  };

  const filterByTimeOfDay = <T extends any>(items: T[], getTime: (item: T) => Date | string | null): T[] => {
    if (timeOfDay === 'all') return items;
    return items.filter(item => {
      const time = getTime(item);
      if (!time) return true;
      const date = typeof time === 'string' ? new Date(time) : time;
      const hour = date.getHours();
      return getTimeOfDayForHour(hour) === timeOfDay;
    });
  };

  const preFilteredReminders = getFilteredReminders();
  const preFilteredHealthLogs = getFilteredHealthLogs();
  const preFilteredAppointments = getFilteredAppointments();

  const filteredReminders = {
    pending: filterByTimeOfDay(preFilteredReminders.pending, (r: any) => r.scheduledTime),
    completed: filterByTimeOfDay(preFilteredReminders.completed, (r: any) => r.scheduledTime),
  };
  const filteredHealthLogs = {
    pending: filterByTimeOfDay(preFilteredHealthLogs.pending, (h: any) => h.scheduledTime),
    completed: filterByTimeOfDay(preFilteredHealthLogs.completed, (h: any) => h.scheduledTime),
  };
  const filteredAppointments = filterByTimeOfDay(preFilteredAppointments, (a: any) => a.appointmentTime ? `2000-01-01T${a.appointmentTime}` : null);

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
    showAlert(
      'error',
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
                    const Geolocation = require('@react-native-community/geolocation');
                    const pos = await new Promise<any>((resolve, reject) => {
                      Geolocation.getCurrentPosition(
                        (position: any) => resolve(position),
                        (error: any) => reject(error),
                        { enableHighAccuracy: false, timeout: 5000, maximumAge: 10000 }
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
                showAlert('success', 'Đã gửi SOS', 'Tín hiệu SOS đã được gửi đến bác sĩ của bạn. Hãy giữ bình tĩnh và chờ phản hồi.');
                // Reset after 30s
                setTimeout(() => setSosSent(false), 30000);
              } else {
                showError('Lỗi', result.error || 'Không thể gửi SOS. Hãy thử lại.');
              }
            } catch (err) {
              showError('Lỗi', 'Không thể gửi SOS. Kiểm tra kết nối mạng.');
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
      {/* Hero Banner */}
      {!readOnly && (
        <>
          <View style={styles.heroBanner}>
            <View style={styles.bannerContent}>
              <View style={styles.bannerTextArea}>
                <Text variant="caption" style={styles.bannerLabel}>SmartCare</Text>
                <Text variant="title" style={styles.bannerTitle}>Lịch uống thuốc</Text>
                <Text variant="caption" style={styles.bannerSub}>Quản lý sức khỏe mỗi ngày</Text>
              </View>
              <Image
                source={require('../../assets/doctor_banner.png')}
                style={styles.bannerImage}
                resizeMode="contain"
              />
            </View>
            {/* Decorative circles */}
            <View style={styles.bannerCircle1} />
            <View style={styles.bannerCircle2} />
          </View>

          {/* Pill Stats - overlapping banner bottom */}
          <View style={styles.pillStatsRow}>
            <View style={[styles.pillStat, { backgroundColor: COLORS.pillGreen }]}>
              <Text style={[styles.pillStatValue, { color: COLORS.pillGreenText }]}>
                {adherenceRate !== null ? `${adherenceRate}%` : '--'}
              </Text>
              <Text style={[styles.pillStatLabel, { color: COLORS.pillGreenText }]}>Tuân thủ</Text>
            </View>
            <View style={[styles.pillStat, { backgroundColor: COLORS.pillYellow }]}>
              <Text style={[styles.pillStatValue, { color: COLORS.pillYellowText }]}>
                {pendingTasksCount}
              </Text>
              <Text style={[styles.pillStatLabel, { color: COLORS.pillYellowText }]}>Việc hôm nay</Text>
            </View>
            <View style={[styles.pillStat, { backgroundColor: COLORS.pillGray }]}>
              <Text style={[styles.pillStatValue, { color: COLORS.pillGrayText }]}>
                {appointmentCount}
              </Text>
              <Text style={[styles.pillStatLabel, { color: COLORS.pillGrayText }]}>Lịch hẹn</Text>
            </View>
          </View>
        </>
      )}

      {/* SOS Emergency Button */}
      {!readOnly && (
        <View style={styles.sosContainer}>
          <Animated.View style={{ transform: [{ scale: sosPulseAnim }] }}>
            <TouchableOpacity
              onPress={handleSOS}
              disabled={sosLoading || sosSent}
              activeOpacity={0.8}
              style={[
                styles.sosButton,
                sosSent && styles.sosButtonSent,
                sosLoading && styles.sosButtonLoading,
              ]}
            >
              <View style={styles.sosIconWrap}>
                <Text style={styles.sosIconText}>SOS</Text>
              </View>
              <View style={styles.sosTextWrap}>
                <Text variant="body" style={styles.sosTitle}>
                  {sosSent ? 'Đã gửi SOS' : sosLoading ? 'Đang gửi...' : 'SOS Khẩn Cấp'}
                </Text>
                <Text variant="caption" style={styles.sosSubtitle}>
                  {sosSent ? 'Bác sĩ đã nhận được tín hiệu' : 'Nhấn để gửi cảnh báo đến bác sĩ'}
                </Text>
              </View>
              <Icon name="chevron-right" size={24} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          </Animated.View>

          {/* Fall Detection Status Indicator */}
          <View style={styles.fallDetectionRow}>
            <View style={styles.fallDetectionStatus}>
              <View style={[
                styles.fallDetectionDot,
                { backgroundColor: isMonitoring ? '#22C55E' : '#9CA3AF' }
              ]} />
              <Text variant="caption" style={styles.fallDetectionText}>
                {isMonitoring 
                  ? `Phát hiện té ngã: Đang bảo vệ${isBackgroundCapable ? ' (chạy nền)' : ''}`
                  : 'Phát hiện té ngã: Tắt'}
              </Text>
            </View>
            {__DEV__ && (
              <TouchableOpacity onPress={simulateFall} style={styles.testFallBtn}>
                <Text style={styles.testFallText}>Thử</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Health Tracking Shortcut */}
      {!readOnly && (
        <TouchableOpacity
          style={styles.healthShortcut}
          onPress={() => navigation.navigate('HealthTracking')}
          activeOpacity={0.7}
        >
          <View style={styles.healthShortcutIcon}>
            <Icon name="monitor-heart" size={22} color={COLORS.primary} />
          </View>
          <View style={styles.healthShortcutText}>
            <Text variant="body" semibold color="text">Theo dõi sức khỏe</Text>
            <Text variant="caption" color="textSecondary">Nhập vận động, ăn uống hôm nay</Text>
          </View>
          <Icon name="chevron-right" size={22} color={COLORS.textSecondary} />
        </TouchableOpacity>
      )}

      {/* Filter Chips */}
      {!readOnly && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterScrollContent}>
          {([
            { key: 'all' as const, label: 'Tất cả' },
            { key: 'medication' as const, label: `${medicationCount} thuốc` },
            { key: 'meal' as const, label: `${mealCount} bữa ăn` },
            { key: 'exercise' as const, label: `${exerciseCount} vận động` },
            { key: 'appointment' as const, label: `${appointmentCount} lịch hẹn` },
          ]).map(chip => (
            <TouchableOpacity key={chip.key} onPress={() => setFilter(chip.key)} activeOpacity={0.7}>
              <Chip label={chip.label} variant={filter === chip.key ? 'primary' : 'default'} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Time of Day Tabs */}
      {!readOnly && (
        <View style={styles.timeTabsContainer}>
          {([
            { key: 'all' as const, label: 'Tất cả', icon: '📋' },
            { key: 'morning' as const, label: 'Sáng', icon: '☀️' },
            { key: 'noon' as const, label: 'Trưa', icon: '🌤️' },
            { key: 'afternoon' as const, label: 'Chiều', icon: '⛅' },
            { key: 'evening' as const, label: 'Tối', icon: '🌙' },
          ]).map(tab => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setTimeOfDay(tab.key)}
              activeOpacity={0.7}
              style={[styles.timeTab, timeOfDay === tab.key && styles.timeTabActive]}
            >
              <Text style={styles.timeTabIcon}>{tab.icon}</Text>
              <Text style={[styles.timeTabLabel, timeOfDay === tab.key && styles.timeTabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
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

          {/* Take All Now Banners */}
          {!readOnly && (filter === 'all' || filter === 'medication') && pendingRemindersBySession.map(group => (
            <Card key={group.session} style={styles.takeAllCard}>
              <View style={styles.takeAllContent}>
                <View style={styles.takeAllInfo}>
                  <Text style={styles.takeAllIcon}>{group.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text variant="body" semibold>
                      {group.reminders.length} thuốc buổi {group.label}
                    </Text>
                    <Text variant="caption" color="textSecondary" numberOfLines={1}>
                      {group.reminders.map(r => r.medicationName).join(', ')}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity 
                  style={styles.takeAllButton}
                  onPress={() => handleTakeAll(group.reminders.map(r => r._id))}
                >
                  <Icon name="check-circle" size={20} color="#fff" />
                  <Text style={styles.takeAllButtonText}>Uống ngay</Text>
                </TouchableOpacity>
              </View>
            </Card>
          ))}
          
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
                <TaskItem
                  key={appointment._id}
                  type="appointment"
                  item={appointment}
                  completed={appointment.isCompleted}
                  onCheck={() => handleCheckAppointment(appointment._id)}
                  onPress={() => handleEditAppointment(appointment._id)}
                  onDelete={() => handleDeleteAppointment(appointment._id)}
                  readOnly={readOnly}
                />
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
        onSave={editingType === 'medication' ? handleSaveReminder : editingType === 'health' ? handleSaveHealthLog : handleSaveAppointment}
        task={editingTask}
        type={editingType}
      />

      {/* Fall Detection Modal — Apple Watch Style */}
      <FallAlertModal
        visible={showFallAlert}
        onDismiss={handleFallAlertDismiss}
        onTriggerSOS={handleFallSOSTriggered}
      />
    </Screen>
  );
};

// Task Item Component
interface TaskItemProps {
  type: 'medication' | 'health' | 'appointment';
  item: any;
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
  const isOverdue = isMissed && !completed;

  const getTitle = () => {
    let title = '';
    if (type === 'medication') {
      title = (item as Reminder).medicationName;
    } else if (type === 'appointment') {
      title = item.doctorName || 'Lịch hẹn';
    } else {
      const healthLog = item as HealthLog;
      if (healthLog.type === 'meal') {
        title = healthLog.details.foodName || 'Bữa ăn';
      } else if (healthLog.type === 'exercise') {
        title = healthLog.details.exerciseType || 'Vận động';
      } else {
        title = 'Hoạt động';
      }
    }
    return isOverdue ? `Bỏ lỡ ${title}` : title;
  };

  const getTimeStr = () => {
    if (type === 'medication') {
      return new Date((item as Reminder).scheduledTime).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    if (type === 'appointment') {
      return item.appointmentTime || '--:--';
    }
    const healthLog = item as HealthLog;
    if (healthLog.scheduledTime) {
      if (healthLog.scheduledTime.includes('T')) {
         return new Date(healthLog.scheduledTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      }
      return healthLog.scheduledTime;
    }
    return '--:--';
  };

  const getSubtitle = () => {
    if (type === 'medication') {
      const reminder = item as Reminder;
      const sessionLabels: Record<string, string> = { MORNING: 'Buổi sáng', NOON: 'Buổi trưa', EVENING: 'Buổi tối', CUSTOM: 'Tùy chỉnh' };
      const sessionStr = (reminder as any).session ? sessionLabels[(reminder as any).session] : 'Tùy chỉnh';
      const statusStr = completed ? 'Đã uống' : (isOverdue ? 'Chưa uống' : 'Sắp tới');
      return `${sessionStr} · ${statusStr}`;
    }
    if (type === 'appointment') {
      return `${item.doctorSpecialty || 'Khám bệnh'} · ${item.hospitalName || ''}`;
    }
    const healthLog = item as HealthLog;
    if (healthLog.type === 'meal') {
      return `${healthLog.details.calories || 0} kcal · ${completed ? 'Đã ăn' : 'Chưa ăn'}`;
    } else if (healthLog.type === 'exercise') {
      return `${healthLog.details.durationMinutes || 0} phút · ${completed ? 'Đã tập' : 'Chưa tập'}`;
    }
    return '';
  };

  const getIconName = () => {
    if (type === 'appointment') return 'event';
    const time = getTimeStr();
    if (time >= '05:00' && time <= '10:59') return 'wb-sunny';
    return 'schedule';
  };

  const getIconColor = () => {
    if (completed) return COLORS.success;
    if (isOverdue) return COLORS.error;
    return '#64748B'; // slate-500
  };

  const timeStr = getTimeStr();

  return (
    <TouchableOpacity
      style={[
        styles.newTaskItem,
        completed && styles.newTaskItemCompleted,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <View style={styles.newLeftCol}>
        <View style={[
          styles.newIconWrap,
          isOverdue ? styles.newIconWrapMissed : (completed ? styles.newIconWrapCompleted : styles.newIconWrapPending)
        ]}>
          <Icon name={getIconName()} size={20} color={getIconColor()} />
        </View>
        <Text style={[styles.newTimeText, isOverdue && styles.newTimeTextMissed]}>{timeStr}</Text>
      </View>

      <View style={styles.newRightCol}>
        <Text 
          variant="body" 
          semibold 
          style={[styles.newTitle, completed && styles.newTitleCompleted, isOverdue && styles.newTitleMissed]}
          numberOfLines={1}
        >
          {getTitle()}
        </Text>
        <Text variant="caption" style={styles.newSubtitle}>
          {getSubtitle()}
        </Text>
      </View>

      <View style={styles.newActionRow}>
        {!readOnly && (
          <TouchableOpacity onPress={onCheck} style={styles.newActionBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            {completed ? (
              <Icon name="check-circle" size={26} color={COLORS.success} />
            ) : (
              <Icon name="radio-button-unchecked" size={26} color={isOverdue ? COLORS.error : '#CBD5E1'} />
            )}
          </TouchableOpacity>
        )}
        {readOnly && completed && (
          <View style={styles.newActionBtn}>
            <Icon name="check-circle" size={26} color={COLORS.success} />
          </View>
        )}
        {!completed && !readOnly && onDelete && (
          <TouchableOpacity onPress={onDelete} style={[styles.newActionBtn, { marginLeft: 8 }]} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Icon name="delete-outline" size={22} color="#EF4444" />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // ===== Hero Banner =====
  heroBanner: {
    backgroundColor: COLORS.primary,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    borderRadius: RADIUS.xl,
    paddingVertical: SPACING['2xl'],
    paddingHorizontal: SPACING.xl,
    overflow: 'hidden',
    minHeight: 160,
    ...SHADOWS.md,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  bannerTextArea: {
    flex: 1,
    paddingRight: SPACING.md,
  },
  bannerLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  bannerTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    marginTop: 6,
    lineHeight: 30,
  },
  bannerSub: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    marginTop: 4,
  },
  bannerImage: {
    width: 120,
    height: 120,
    borderRadius: 16,
  },
  bannerCircle1: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -20,
    right: -20,
  },
  bannerCircle2: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: -10,
    left: 30,
  },

  // ===== Pill Stats =====
  pillStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: SPACING['2xl'],
    marginTop: -20,
    gap: SPACING.sm,
    zIndex: 10,
  },
  pillStat: {
    flex: 1,
    borderRadius: RADIUS.xl,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    alignItems: 'center',
    ...SHADOWS.card,
  },
  pillStatValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  pillStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },

  // ===== SOS Button =====
  sosContainer: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
  },
  sosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.xl,
    ...SHADOWS.card,
  },
  sosButtonSent: {
    backgroundColor: '#22C55E',
  },
  sosButtonLoading: {
    backgroundColor: '#9CA3AF',
  },
  sosIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  sosIconText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  sosTextWrap: {
    flex: 1,
  },
  sosTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  sosSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 2,
  },

  // ===== Fall Detection Indicator =====
  fallDetectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  fallDetectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fallDetectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  fallDetectionText: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  testFallBtn: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  testFallText: {
    color: '#92400E',
    fontSize: 11,
    fontWeight: '600',
  },

  // ===== Filter Chips =====
  filterScroll: {
    marginTop: SPACING.lg,
  },
  filterScrollContent: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },

  // ===== Time Tabs =====
  timeTabsContainer: {
    flexDirection: 'row',
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    padding: SPACING.xs,
  },
  timeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    gap: 4,
  },
  timeTabActive: {
    backgroundColor: COLORS.surface,
    ...SHADOWS.soft,
  },
  timeTabIcon: {
    fontSize: 14,
  },
  timeTabLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  timeTabLabelActive: {
    color: COLORS.text,
    fontWeight: '600',
  },

  // ===== Plan Card =====
  planCard: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
    borderRadius: RADIUS.xl,
  },
  planTitle: {
    marginBottom: SPACING.lg,
    paddingHorizontal: 4,
    fontSize: 18,
    fontWeight: '700',
  },

  // ===== Task Items =====
  taskSection: {
    gap: 12,
  },
  newTaskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9', // slate-100
    ...SHADOWS.soft,
  },
  newTaskItemCompleted: {
    opacity: 0.6,
  },
  newLeftCol: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    width: 44,
  },
  newIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  newIconWrapMissed: {
    borderColor: COLORS.error,
    backgroundColor: '#FEF2F2', // very light red
  },
  newIconWrapCompleted: {
    borderColor: COLORS.success,
    backgroundColor: '#F0FDF4', // very light green
  },
  newIconWrapPending: {
    borderColor: '#E2E8F0', // slate-200
    backgroundColor: '#F8FAFC',
  },
  newTimeText: {
    fontSize: 12,
    color: '#64748B', // slate-500
    fontWeight: '500',
  },
  newTimeTextMissed: {
    color: COLORS.error,
  },
  newRightCol: {
    flex: 1,
    justifyContent: 'center',
  },
  newTitle: {
    fontSize: 16,
    color: '#0F172A',
    marginBottom: 2,
  },
  newTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  newTitleMissed: {
    // optional styling for missed title
  },
  newSubtitle: {
    fontSize: 13,
    color: '#64748B',
  },
  newActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  newActionBtn: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ===== Sections =====
  section: {
    marginTop: SPACING.md,
    marginBottom: 24,
  },
  taskContent: {
    flex: 1,
    minWidth: 0,
  },
  taskTitle: {
    marginBottom: SPACING.xs / 2,
    flexShrink: 1,
  },
  taskSubtitle: {},
  takeAllCard: { marginBottom: 16, backgroundColor: '#E0F2F1', borderColor: '#B2DFDB', borderWidth: 1 },
  takeAllContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12 },
  takeAllInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, paddingRight: 12 },
  takeAllIcon: { fontSize: 24 },
  takeAllButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  takeAllButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
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
  healthShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    ...SHADOWS.card,
  },
  healthShortcutIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  healthShortcutText: {
    flex: 1,
  },
});

