/**
 * AlertsCenterScreen
 * Cảnh báo & thông báo với tabs, alert cards, và actions
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
import { Loading } from '../../ui/Loading';
import { EmptyState } from '../../ui/EmptyState';
import { COLORS, SPACING, RADIUS } from '../../theme';
import { getAlerts, markAlertAsRead } from '../../services/caregiverPlus.service';
import { Alert } from '../../types';
import { showSuccess, showError as showErrorUtil } from '../../utils/alert';
import { logger } from '../../utils/logger';

const AnimatedCard = Animated.createAnimatedComponent(Card);

export const AlertsCenterScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const patientId = route.params?.patientId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    fetchAlerts();
  }, [patientId]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      setError(null);
      // Get symptoms (no filter needed)
      const data = await getAlerts(patientId);
      setAlerts(data.alerts);
    } catch (err: any) {
      setError(err.message || 'Không thể tải cảnh báo');
      logger.error('Fetch alerts error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (alertId: string) => {
    try {
      await markAlertAsRead(alertId);
      setAlerts(prev => prev.map(a => a._id === alertId ? { ...a, isRead: true } : a));
      showSuccess('Thành công', 'Đã đánh dấu đã xem');
    } catch (err: any) {
      showErrorUtil('Lỗi', err.message || 'Không thể cập nhật trạng thái');
    }
  };

  const handleCall = (phone?: string) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    } else {
      showErrorUtil('Thông báo', 'Số điện thoại chưa có sẵn');
    }
  };

  const handleViewDetail = (alert: Alert) => {
    if (alert.actionUrl) {
      // Navigate based on actionUrl
      // For example: 'medication', 'symptom', 'appointment'
      if (alert.actionUrl.includes('medication')) {
        navigation.navigate('MedicationDetail', { patientId: alert.patientId });
      } else if (alert.actionUrl.includes('appointment')) {
        navigation.navigate('Appointments', { patientId: alert.patientId });
      }
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      default:
        return 'info';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error':
        return COLORS.error;
      case 'warning':
        return COLORS.warning;
      default:
        return COLORS.info;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'medication':
        return 'Thuốc';
      case 'symptom':
        return 'Triệu chứng';
      case 'appointment':
        return 'Lịch hẹn';
      case 'sos':
        return 'SOS';
      case 'fall':
        return 'Ngã';
      default:
        return type;
    }
  };

  // All alerts are symptoms, no filtering needed
  const filteredAlerts = alerts;

  if (loading && alerts.length === 0) {
    return (
      <Screen>
        <AppHeader title="Cảnh báo & thông báo" showBack onBack={() => navigation.goBack()} />
        <Loading message="Đang tải cảnh báo..." />
      </Screen>
    );
  }

  if (error && alerts.length === 0) {
    return (
      <Screen>
        <AppHeader title="Cảnh báo & thông báo" showBack onBack={() => navigation.goBack()} />
        <EmptyState
          icon="⚠️"
          title="Đã xảy ra lỗi"
          message={error}
          actionLabel="Thử lại"
          onAction={fetchAlerts}
        />
      </Screen>
    );
  }

  return (
    <Screen scrollable>
      <AppHeader title="Cảnh báo & thông báo" showBack onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Alerts List */}
        {filteredAlerts.length === 0 ? (
          <EmptyState
            icon="🔔"
            title="Không có cảnh báo"
            message="Chưa có triệu chứng nào được ghi nhận"
          />
        ) : (
          <View style={styles.alertsList}>
            {filteredAlerts.map((alert, index) => (
              <AnimatedCard
                key={alert._id}
                entering={FadeInDown.delay(50 + index * 30)}
                style={[
                  styles.alertCard,
                  !alert.isRead && styles.alertCardUnread,
                ]}
              >
                <View style={styles.alertHeader}>
                  <View style={styles.alertHeaderLeft}>
                    <View
                      style={[
                        styles.severityIcon,
                        { backgroundColor: getSeverityColor(alert.severity) + '20' },
                      ]}
                    >
                      <Icon
                        name={getSeverityIcon(alert.severity)}
                        size={20}
                        color={getSeverityColor(alert.severity)}
                      />
                    </View>
                    <View style={styles.alertHeaderInfo}>
                      <View style={styles.alertTitleRow}>
                        <Text variant="body" color="text" semibold>
                          {alert.title}
                        </Text>
                        {!alert.isRead && (
                          <View style={styles.unreadDot} />
                        )}
                      </View>
                      <Text variant="caption" color="textSecondary">
                        {alert.patientName} • {getTypeLabel(alert.type)}
                      </Text>
                    </View>
                  </View>
                  <Chip
                    label={alert.severity === 'error' ? 'Nghiêm trọng' : alert.severity === 'warning' ? 'Cảnh báo' : 'Thông tin'}
                    variant={alert.severity === 'error' ? 'error' : alert.severity === 'warning' ? 'warning' : 'default'}
                    style={styles.severityChip}
                  />
                </View>

                <Text variant="bodySmall" color="text" style={styles.alertMessage}>
                  {alert.message}
                </Text>

                <Text variant="caption" color="textSecondary" style={styles.alertTime}>
                  {new Date(alert.timestamp).toLocaleString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>

                <View style={styles.alertActions}>
                  {!alert.isRead && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleMarkAsRead(alert._id)}
                    >
                      <Icon name="check-circle" size={18} color={COLORS.success} />
                      <Text variant="caption" color="success" semibold>
                        Đã xem
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleCall()}
                  >
                    <Icon name="phone" size={18} color={COLORS.primary} />
                    <Text variant="caption" color="primary" semibold>
                      Gọi
                    </Text>
                  </TouchableOpacity>
                  {alert.actionUrl && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleViewDetail(alert)}
                    >
                      <Icon name="arrow-forward" size={18} color={COLORS.secondary} />
                      <Text variant="caption" color="secondary" semibold>
                        Chi tiết
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </AnimatedCard>
            ))}
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
  alertsList: {
    gap: SPACING.md,
  },
  alertCard: {
    marginBottom: 0,
  },
  alertCardUnread: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  alertHeaderLeft: {
    flexDirection: 'row',
    flex: 1,
    gap: SPACING.sm,
  },
  severityIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertHeaderInfo: {
    flex: 1,
    gap: SPACING.xs / 2,
  },
  alertTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  severityChip: {
    marginLeft: 0,
  },
  alertMessage: {
    marginBottom: SPACING.xs,
    lineHeight: 20,
  },
  alertTime: {
    marginBottom: SPACING.md,
  },
  alertActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs / 2,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
});

