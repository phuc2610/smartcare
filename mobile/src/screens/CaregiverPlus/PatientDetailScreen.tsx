/**
 * PatientDetailScreen
 * Chi tiết bệnh nhân với hero card, sections, và quick actions
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
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
import { getPatientDetail } from '../../services/caregiverPlus.service';
import { getTodayHealthLogs } from '../../services/health.service';
import { PatientSummary } from '../../types';
import { showError as showErrorUtil } from '../../utils/alert';
import { logger } from '../../utils/logger';

const AnimatedCard = Animated.createAnimatedComponent(Card);

export const PatientDetailScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const patientId = route.params?.patientId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [patient, setPatient] = useState<PatientSummary | null>(null);
  const [todayMealsCount, setTodayMealsCount] = useState<number>(0);

  useEffect(() => {
    if (patientId) {
      fetchPatient();
    } else {
      setError('Không tìm thấy ID bệnh nhân');
      setLoading(false);
    }
  }, [patientId]);

  const fetchPatient = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch patient data
      const patientData = await getPatientDetail(patientId);
      setPatient(patientData);
      
      // Fetch today's health logs (meals and exercises)
      try {
        const healthLogsData = await getTodayHealthLogs(patientId);
        // Count today's meals
        const meals = healthLogsData.healthLogs.filter((log: any) => log.type === 'meal');
        setTodayMealsCount(meals.length);
      } catch (healthErr: any) {
        logger.error('Fetch today health logs error:', healthErr);
        // If health logs fail, set count to 0 but don't fail the whole request
        setTodayMealsCount(0);
      }
    } catch (err: any) {
      setError(err.message || 'Không thể tải thông tin bệnh nhân');
      logger.error('Fetch patient detail error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCall = () => {
    if (!patient) return;
    
    // Get phone from patient object
    const phone = patient.phone;
    
    if (!phone) {
      showErrorUtil('Thông báo', 'Số điện thoại của bệnh nhân chưa có sẵn');
      return;
    }

    // Open phone dialer
    Linking.openURL(`tel:${phone}`).catch((err) => {
      logger.error('Failed to open phone dialer:', err);
      showErrorUtil('Lỗi', 'Không thể mở ứng dụng gọi điện');
    });
  };

  const handleMessage = () => {
    if (!patient || !patientId) return;
    
    // Navigate to chat detail screen with patient info
    navigation.navigate('ChatDetail', {
      otherUserId: patientId,
      otherUserName: patient.name,
      otherUserAvatar: patient.avatar,
    });
  };

  const handleCreateReminder = () => {
    navigation.navigate('PatientTasks', { 
      patientId,
      patientName: patient?.name || 'Bệnh nhân',
    });
  };

  const handleViewReport = () => {
    navigation.navigate('ReportsAnalytics', { patientId });
  };

  if (loading) {
    return (
      <Screen>
        <AppHeader title="Chi tiết bệnh nhân" showBack onBack={() => navigation.goBack()} />
        <Loading message="Đang tải thông tin..." />
      </Screen>
    );
  }

  if (error || !patient) {
    return (
      <Screen>
        <AppHeader title="Chi tiết bệnh nhân" showBack onBack={() => navigation.goBack()} />
        <EmptyState
          icon="⚠️"
          title="Đã xảy ra lỗi"
          message={error || 'Không tìm thấy thông tin bệnh nhân'}
          actionLabel="Thử lại"
          onAction={fetchPatient}
        />
      </Screen>
    );
  }

  const statusVariant = patient.needsAttention ? 'warning' : 'success';
  const statusText = patient.needsAttention ? 'Cần chú ý' : 'Ổn định';
  const lastSync = patient.lastUpdate
    ? new Date(patient.lastUpdate).toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Chưa có';

  return (
    <Screen scrollable>
      <AppHeader title="Chi tiết bệnh nhân" showBack onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Card */}
        <AnimatedCard entering={FadeInDown.delay(50)} style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <Avatar name={patient.name} size={64} avatarUrl={patient.avatar} />
            <View style={styles.heroInfo}>
              <Text variant="title" color="text" semibold>
                {patient.name}
              </Text>
              {patient.age && (
                <Text variant="bodySmall" color="textSecondary">
                  {patient.age} tuổi
                </Text>
              )}
            </View>
          </View>

          <View style={styles.statusRow}>
            <Chip label={statusText} variant={statusVariant} />
            <Text variant="caption" color="textSecondary">
              Đồng bộ: {lastSync}
            </Text>
          </View>

          {patient.medicalCondition && patient.medicalCondition !== 'Normal' && (
            <View style={styles.conditionRow}>
              <Text variant="bodySmall" color="textSecondary">
                Tình trạng:
              </Text>
              <Chip label={patient.medicalCondition} variant="secondary" style={styles.conditionChip} />
            </View>
          )}

          {patient.adherenceRate !== undefined && (
            <View style={styles.adherenceRow}>
              <Text variant="bodySmall" color="textSecondary">
                Tuân thủ thuốc: {patient.adherenceRate}%
              </Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${patient.adherenceRate}%` },
                  ]}
                />
              </View>
            </View>
          )}
        </AnimatedCard>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionButton} onPress={handleCall}>
            <View style={[styles.actionIcon, { backgroundColor: COLORS.success + '20' }]}>
              <Icon name="phone" size={24} color={COLORS.success} />
            </View>
            <Text variant="caption" color="text" semibold>
              Gọi
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleMessage}>
            <View style={[styles.actionIcon, { backgroundColor: COLORS.primary + '20' }]}>
              <Icon name="message" size={24} color={COLORS.primary} />
            </View>
            <Text variant="caption" color="text" semibold>
              Nhắn
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleCreateReminder}>
            <View style={[styles.actionIcon, { backgroundColor: COLORS.secondary + '20' }]}>
              <Icon name="notifications" size={24} color={COLORS.secondary} />
            </View>
            <Text variant="caption" color="text" semibold>
              Tạo nhắc
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleViewReport}>
            <View style={[styles.actionIcon, { backgroundColor: COLORS.info + '20' }]}>
              <Icon name="assessment" size={24} color={COLORS.info} />
            </View>
            <Text variant="caption" color="text" semibold>
              Báo cáo
            </Text>
          </TouchableOpacity>
        </View>

        {/* Today Section */}
        <View style={styles.section}>
          <Text variant="section" color="text" semibold style={styles.sectionTitle}>
            Hôm nay
          </Text>
          <Card style={styles.sectionCard}>
            <View style={styles.todayItem}>
              <Icon name="medication" size={20} color={COLORS.primary} />
              <Text variant="body" color="text">
                Thuốc
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('MedicationDetail', { patientId })}
                style={styles.detailButton}
              >
                <Text variant="caption" color="primary" semibold>
                  Chi tiết
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.todayItem}>
              <Icon name="restaurant" size={20} color={COLORS.secondary} />
              <Text variant="body" color="text">
                Bữa ăn
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('MealDetail', { patientId })}
                style={styles.detailButton}
              >
                <Text variant="caption" color="primary" semibold>
                  Chi tiết
                </Text>
              </TouchableOpacity>
            </View>
          </Card>
        </View>

        {/* Recent Alerts */}
        <View style={styles.section}>
          <Text variant="section" color="text" semibold style={styles.sectionTitle}>
            Cảnh báo gần đây
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('AlertsCenter', { patientId })}
          >
            <Card style={styles.sectionCard}>
              <View style={styles.alertPreview}>
                <Icon name="warning" size={24} color={COLORS.warning} />
                <View style={styles.alertPreviewInfo}>
                  <Text variant="body" color="text" semibold>
                    Xem tất cả cảnh báo
                  </Text>
                  <Text variant="caption" color="textSecondary">
                    {patient.recentAlerts || 0} cảnh báo chưa đọc
                  </Text>
                </View>
                <Icon name="chevron-right" size={24} color={COLORS.textSecondary} />
              </View>
            </Card>
          </TouchableOpacity>
        </View>

        {/* Upcoming Appointments */}
        <View style={styles.section}>
          <Text variant="section" color="text" semibold style={styles.sectionTitle}>
            Lịch hẹn sắp tới
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('CaregiverAppointments', { patientId })}
          >
            <Card style={styles.sectionCard}>
              <View style={styles.appointmentPreview}>
                <Icon name="event" size={24} color={COLORS.primary} />
                <View style={styles.appointmentPreviewInfo}>
                  <Text variant="body" color="text" semibold>
                    Xem lịch hẹn
                  </Text>
                  <Text variant="caption" color="textSecondary">
                    Không có lịch hẹn sắp tới
                  </Text>
                </View>
                <Icon name="chevron-right" size={24} color={COLORS.textSecondary} />
              </View>
            </Card>
          </TouchableOpacity>
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
  heroCard: {
    marginBottom: SPACING.lg,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  heroInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  conditionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
    gap: SPACING.sm,
  },
  conditionChip: {
    marginLeft: 0,
  },
  adherenceRow: {
    marginTop: SPACING.sm,
    gap: SPACING.xs,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING['2xl'],
    gap: SPACING.sm,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    gap: SPACING.xs,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: SPACING['2xl'],
  },
  sectionTitle: {
    marginBottom: SPACING.md,
  },
  sectionCard: {
    marginBottom: 0,
  },
  todayItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surface,
  },
  alertPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  alertPreviewInfo: {
    flex: 1,
    gap: SPACING.xs / 2,
  },
  appointmentPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  appointmentPreviewInfo: {
    flex: 1,
    gap: SPACING.xs / 2,
  },
});

