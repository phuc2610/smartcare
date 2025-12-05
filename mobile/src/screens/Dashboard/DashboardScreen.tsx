import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { getTodayReminders, updateReminderStatus } from '../../services/medication.service';
import { Reminder, ReminderStatus } from '../../types';
import { COLORS } from '../../utils/constants';
import { SOSButton } from '../../components/SOSButton';
import { RecommendationList } from '../../components/RecommendationList';
import { VoiceCommandButton } from '../../components/VoiceCommandButton';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { EmptyState } from '../../components/EmptyState';

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
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const effectiveUserId = targetUserId || user?._id;

  const fetchReminders = async () => {
    if (!effectiveUserId) return;
    try {
      const data = await getTodayReminders(effectiveUserId);
      setReminders(data.reminders);
    } catch (error) {
      console.error('Failed to fetch reminders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReminders();
  }, [effectiveUserId]);

  const handleCheck = async (id: string) => {
    if (readOnly) return;
    try {
      await updateReminderStatus(id, ReminderStatus.TAKEN);
      fetchReminders();
    } catch (error) {
      console.error('Failed to update reminder:', error);
    }
  };

  const handleVoiceMarkTaken = () => {
    if (readOnly) return;
    const pending = reminders.find(r => r.status === ReminderStatus.PENDING);
    if (pending) {
      handleCheck(pending._id);
    }
  };

  const pendingReminders = reminders.filter(r => r.status !== ReminderStatus.TAKEN);
  const completedReminders = reminders.filter(r => r.status === ReminderStatus.TAKEN);

  if (loading) {
    return <LoadingSpinner message="Đang tải lịch uống thuốc..." />;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchReminders} />}
      >
      {!readOnly && (
        <View style={styles.header}>
          <Text style={styles.greeting}>Chào bạn, 👋</Text>
          <Text style={styles.subtitle}>Chúc bạn một ngày khỏe mạnh!</Text>
        </View>
      )}

      {!readOnly && <VoiceCommandButton onMarkTaken={handleVoiceMarkTaken} />}

      {!hideSOS && <SOSButton />}

      {!hideSOS && <RecommendationList />}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hôm nay ({pendingReminders.length} thuốc)</Text>
      </View>

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
                  onCheck={handleCheck}
                  readOnly={readOnly}
                />
              ))}
            </View>
          )}

          {completedReminders.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Đã hoàn thành</Text>
              <View style={styles.list}>
                {completedReminders.map(item => (
                  <MedicationItem key={item._id} item={item} onCheck={() => {}} readOnly={true} />
                ))}
              </View>
            </View>
          )}
        </>
      )}
      </ScrollView>
    </View>
  );
};

const MedicationItem: React.FC<{
  item: Reminder;
  onCheck: (id: string) => void;
  readOnly?: boolean;
}> = ({ item, onCheck, readOnly }) => {
  const isTaken = item.status === ReminderStatus.TAKEN;
  const time = new Date(item.scheduledTime).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View style={styles.item}>
      <View style={styles.itemContent}>
        <Text style={styles.time}>{time}</Text>
        <Text style={[styles.medName, isTaken && styles.medNameTaken]}>{item.medicationName}</Text>
        <Text style={styles.dosage}>
          {item.dosage} {item.unit}
        </Text>
      </View>
      {isTaken ? (
        <View style={styles.checkIcon}>
          <Text style={styles.checkText}>✓</Text>
        </View>
      ) : readOnly ? (
        <View style={styles.checkIconDisabled}>
          <Text style={styles.checkTextDisabled}>○</Text>
        </View>
      ) : (
        <TouchableOpacity style={styles.checkButton} onPress={() => onCheck(item._id)}>
          <Text style={styles.checkButtonText}>✓</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemContent: {
    flex: 1,
  },
  time: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 4,
  },
  medName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  medNameTaken: {
    textDecorationLine: 'line-through',
    color: COLORS.textSecondary,
  },
  dosage: {
    fontSize: 14,
    color: COLORS.textSecondary,
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





