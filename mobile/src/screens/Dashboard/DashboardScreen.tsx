import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../../contexts/AuthContext';
import { getTodayReminders, updateReminderStatus, updateReminder } from '../../services/medication.service';
import { getTodayHealthLogs, updateHealthLog, deleteHealthLog } from '../../services/health.service';
import { Reminder, ReminderStatus, HealthLog } from '../../types';
import { COLORS } from '../../utils/constants';
import { SOSButton } from '../../components/SOSButton';
import { RecommendationList } from '../../components/RecommendationList';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { EmptyState } from '../../components/EmptyState';
import { EditTaskModal } from '../../components/EditTaskModal';

interface DashboardScreenProps {
  targetUserId?: string;
  readOnly?: boolean;
  hideSOS?: boolean;
}

type TabType = 'medication' | 'health';

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  targetUserId,
  readOnly = false,
  hideSOS = false,
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('medication');
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [healthLogs, setHealthLogs] = useState<HealthLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingTask, setEditingTask] = useState<Reminder | HealthLog | null>(null);
  const [editingType, setEditingType] = useState<'medication' | 'health'>('medication');

  const effectiveUserId = targetUserId || user?._id;

  const fetchData = async () => {
    if (!effectiveUserId) return;
    try {
      if (activeTab === 'medication') {
        const data = await getTodayReminders(effectiveUserId);
        setReminders(data.reminders);
      } else {
        const data = await getTodayHealthLogs(effectiveUserId);
        setHealthLogs(data.healthLogs);
      }
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
  }, [effectiveUserId, activeTab]);

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
      fetchData();
    } catch (error) {
      console.error('Failed to update reminder:', error);
      throw error;
    }
  };

  const handleDeleteReminder = async (id: string) => {
    if (readOnly) return;
    Alert.alert(
      'Xác nhận',
      'Bạn có chắc muốn xóa mục này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              // TODO: Implement delete reminder
              Alert.alert('Thông báo', 'Chức năng xóa sẽ được thêm sau');
            } catch (error) {
              console.error('Failed to delete reminder:', error);
              Alert.alert('Lỗi', 'Không thể xóa');
            }
          },
        },
      ]
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
    Alert.alert(
      'Xác nhận',
      'Bạn có chắc muốn xóa mục này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteHealthLog(id);
              fetchData();
            } catch (error) {
              console.error('Failed to delete health log:', error);
              Alert.alert('Lỗi', 'Không thể xóa');
            }
          },
        },
      ]
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

  if (loading) {
    return <LoadingSpinner message="Đang tải..." />;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchData} />}
      >
        {!readOnly && (
          <View style={styles.header}>
            <Text style={styles.greeting}>Chào bạn, 👋</Text>
            <Text style={styles.subtitle}>Chúc bạn một ngày khỏe mạnh!</Text>
          </View>
        )}

        {!hideSOS && <SOSButton />}
        {!hideSOS && <RecommendationList />}

        {/* Tabs */}
        {!readOnly && (
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'medication' && styles.tabActive]}
              onPress={() => setActiveTab('medication')}
            >
              <Text style={[styles.tabText, activeTab === 'medication' && styles.tabTextActive]}>
                💊 Thuốc
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'health' && styles.tabActive]}
              onPress={() => setActiveTab('health')}
            >
              <Text style={[styles.tabText, activeTab === 'health' && styles.tabTextActive]}>
                🍽️ Bữa ăn & Vận động
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'medication' ? (
          <>
            {reminders.length === 0 ? (
              <EmptyState
                icon="✅"
                title="Hôm nay không có lịch uống thuốc"
                message="Bạn đã hoàn thành tất cả các liều thuốc hôm nay!"
              />
            ) : (
              <>
                {pendingReminders.length > 0 && (
                  <View style={styles.list}>
                    {pendingReminders.map(item => (
                      <MedicationItem
                        key={item._id}
                        item={item}
                        onCheck={handleCheckReminder}
                        onEdit={handleEditReminder}
                        onDelete={handleDeleteReminder}
                        readOnly={readOnly}
                      />
                    ))}
                  </View>
                )}

                {completedReminders.length > 0 && (
                  <View style={styles.list}>
                    {completedReminders.map(item => (
                      <MedicationItem
                        key={item._id}
                        item={item}
                        onCheck={handleCheckReminder}
                        onEdit={handleEditReminder}
                        onDelete={handleDeleteReminder}
                        readOnly={true}
                      />
                    ))}
                  </View>
                )}
              </>
            )}
          </>
        ) : (
          <>
            {healthLogs.length === 0 ? (
              <EmptyState
                icon="📋"
                title="Chưa có bữa ăn hoặc vận động hôm nay"
                message="Hãy thêm bữa ăn hoặc vận động để theo dõi!"
              />
            ) : (
              <>
                {pendingHealthLogs.length > 0 && (
                  <View style={styles.list}>
                    {pendingHealthLogs.map(item => (
                      <HealthLogItem
                        key={item._id}
                        item={item}
                        onCheck={handleCheckHealthLog}
                        onEdit={handleEditHealthLog}
                        onDelete={handleDeleteHealthLog}
                        readOnly={readOnly}
                      />
                    ))}
                  </View>
                )}

                {completedHealthLogs.length > 0 && (
                  <View style={styles.list}>
                    {completedHealthLogs.map(item => (
                      <HealthLogItem
                        key={item._id}
                        item={item}
                        onCheck={handleCheckHealthLog}
                        onEdit={handleEditHealthLog}
                        onDelete={handleDeleteHealthLog}
                        readOnly={true}
                      />
                    ))}
                  </View>
                )}
              </>
            )}
          </>
        )}
      </ScrollView>

      <EditTaskModal
        visible={editingTask !== null}
        onClose={() => setEditingTask(null)}
        onSave={editingType === 'medication' ? handleSaveReminder : handleSaveHealthLog}
        task={editingTask}
        type={editingType}
      />
    </View>
  );
};

const MedicationItem: React.FC<{
  item: Reminder;
  onCheck: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  readOnly?: boolean;
}> = ({ item, onCheck, onEdit, onDelete, readOnly }) => {
  const isTaken = item.status === ReminderStatus.TAKEN;
  const time = new Date(item.scheduledTime).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View style={styles.item}>
      <View style={styles.itemIcon}>
        <Text style={styles.itemIconText}>💊</Text>
      </View>
      <View style={styles.itemContent}>
        <View style={styles.itemHeader}>
          <Text style={styles.time}>{time}</Text>
          <View style={styles.tag}>
            <Text style={styles.tagText}>Uống thuốc</Text>
          </View>
        </View>
        <Text style={[styles.itemName, isTaken && styles.itemNameTaken]}>
          {item.medicationName}
        </Text>
        <Text style={styles.itemSubtext}>
          {item.dosage} {item.unit}
        </Text>
      </View>
      <View style={styles.itemActions}>
        {isTaken ? (
          <View style={styles.checkIcon}>
            <Text style={styles.checkText}>✓</Text>
          </View>
        ) : readOnly ? (
          <View style={styles.checkIconDisabled}>
            <Text style={styles.checkTextDisabled}>○</Text>
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => onCheck(item._id)}
            >
              <Icon name="check-circle" size={24} color={COLORS.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => onEdit(item._id)}
            >
              <Icon name="edit" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => onDelete(item._id)}
            >
              <Icon name="delete" size={20} color={COLORS.error} />
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
};

const HealthLogItem: React.FC<{
  item: HealthLog;
  onCheck: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  readOnly?: boolean;
}> = ({ item, onCheck, onEdit, onDelete, readOnly }) => {
  const isCompleted = item.isCompleted || false;
  const time = item.scheduledTime
    ? item.scheduledTime
    : new Date(item.date).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      });

  const getTitle = () => {
    if (item.type === 'meal') {
      return item.details.foodName || 'Bữa ăn';
    } else if (item.type === 'exercise') {
      return item.details.exerciseType || 'Vận động';
    }
    return '';
  };

  const getSubtext = () => {
    if (item.type === 'meal') {
      return `${item.details.calories || 0} kcal`;
    } else if (item.type === 'exercise') {
      return `${item.details.durationMinutes || 0} phút • ${item.details.caloriesBurned || 0} kcal`;
    }
    return '';
  };

  const getIcon = () => {
    return item.type === 'meal' ? '🍽️' : '🏃';
  };

  const getTag = () => {
    return item.type === 'meal' ? 'Bữa ăn' : 'Vận động';
  };

  return (
    <View style={styles.item}>
      <View style={styles.itemIcon}>
        <Text style={styles.itemIconText}>{getIcon()}</Text>
      </View>
      <View style={styles.itemContent}>
        <View style={styles.itemHeader}>
          <Text style={styles.time}>{time}</Text>
          <View style={styles.tag}>
            <Text style={styles.tagText}>{getTag()}</Text>
          </View>
        </View>
        <Text style={[styles.itemName, isCompleted && styles.itemNameTaken]}>
          {getTitle()}
        </Text>
        <Text style={styles.itemSubtext}>{getSubtext()}</Text>
      </View>
      <View style={styles.itemActions}>
        {isCompleted ? (
          <View style={styles.checkIcon}>
            <Text style={styles.checkText}>✓</Text>
          </View>
        ) : readOnly ? (
          <View style={styles.checkIconDisabled}>
            <Text style={styles.checkTextDisabled}>○</Text>
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => onCheck(item._id)}
            >
              <Icon name="check-circle" size={24} color={COLORS.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => onEdit(item._id)}
            >
              <Icon name="edit" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => onDelete(item._id)}
            >
              <Icon name="delete" size={20} color={COLORS.error} />
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 8,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: COLORS.background,
    marginHorizontal: 4,
  },
  tabActive: {
    backgroundColor: COLORS.primaryLight,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 16,
    marginBottom: 8,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  list: {
    paddingHorizontal: 16,
  },
  item: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemIconText: {
    fontSize: 24,
  },
  itemContent: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  time: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  tag: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  itemNameTaken: {
    textDecorationLine: 'line-through',
    color: COLORS.textSecondary,
  },
  itemSubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
  checkButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  checkIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.success + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    color: COLORS.success,
    fontSize: 24,
    fontWeight: 'bold',
  },
  checkIconDisabled: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.5,
  },
  checkTextDisabled: {
    color: COLORS.textSecondary,
    fontSize: 24,
  },
});
