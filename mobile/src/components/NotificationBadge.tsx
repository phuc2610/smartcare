/**
 * NotificationBadge Component
 * Badge hiển thị số lượng thông báo chưa đọc
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
import { getMissedMedications } from '../services/medication.service';
import { getTodayHealthLogs } from '../services/health.service';
import { getCaregiverRequests } from '../services/caregiver.service';
import { Reminder, ReminderStatus, HealthLog } from '../types';
import { COLORS, SPACING, RADIUS } from '../theme';

export const NotificationBadge: React.FC = () => {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (user?.role === UserRole.PATIENT) {
      fetchNotificationCount();
    }
  }, [user]);

  const fetchNotificationCount = async () => {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const [missedMedicationsData, healthLogsData, requestsData] = await Promise.all([
        getMissedMedications(user?._id).catch(() => ({ missedReminders: [] })),
        getTodayHealthLogs(user?._id).catch(() => ({ healthLogs: [] })),
        getCaregiverRequests().catch(() => ({ requests: [] })),
      ]);

      let totalCount = 0;

      // Count missed medications
      missedMedicationsData.missedReminders.forEach((reminder: Reminder) => {
        const scheduledTime = new Date(reminder.scheduledTime);
        if (scheduledTime <= oneHourAgo && reminder.status === ReminderStatus.PENDING) {
          totalCount++;
        }
      });

      // Count missed health logs
      healthLogsData.healthLogs.forEach((log: HealthLog) => {
        if (log.scheduledDate && log.scheduledTime && !log.isCompleted) {
          const scheduledDateTime = new Date(`${log.scheduledDate}T${log.scheduledTime}`);
          if (scheduledDateTime <= oneHourAgo) {
            totalCount++;
          }
        }
      });

      // Count caregiver requests
      totalCount += requestsData.requests.length;

      setCount(totalCount);
    } catch (error) {
      // Silently fail
    }
  };

  if (count === 0) return null;

  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.error,
    borderRadius: RADIUS.full,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 14,
  },
});


