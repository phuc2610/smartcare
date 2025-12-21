/**
 * CaregiverRequestsScreen
 * Màn hình để người bệnh xem và xác nhận các yêu cầu liên kết từ người thân
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
import { Button } from '../../ui/Button';
import { Loading } from '../../ui/Loading';
import { EmptyState } from '../../ui/EmptyState';
import { Avatar } from '../../components/Avatar';
import { COLORS, SPACING, RADIUS } from '../../theme';
import { getCaregiverRequests, respondToRequest } from '../../services/caregiver.service';
import { showSuccess, showError as showErrorUtil } from '../../utils/alert';
import { logger } from '../../utils/logger';

const AnimatedCard = Animated.createAnimatedComponent(Card);

interface CaregiverRequest {
  _id: string;
  caregiverId: string;
  caregiverName: string;
  caregiverPhone: string;
  caregiverAvatar?: string;
  status: string;
  requestedAt: string;
}

export const CaregiverRequestsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState<CaregiverRequest[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const data = await getCaregiverRequests();
      setRequests(data.requests);
    } catch (err: any) {
      logger.error('Fetch caregiver requests error:', err);
      showErrorUtil('Lỗi', err.message || 'Không thể tải yêu cầu liên kết');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchRequests();
  };

  const handleRespond = async (requestId: string, action: 'accept' | 'reject') => {
    try {
      setProcessingId(requestId);
      const result = await respondToRequest(requestId, action);
      
      if (action === 'accept') {
        showSuccess('Thành công', result.message || 'Đã chấp nhận yêu cầu liên kết');
      } else {
        showSuccess('Thành công', result.message || 'Đã từ chối yêu cầu liên kết');
      }
      
      // Refresh list
      await fetchRequests();
      
      // Navigate back if accepted
      if (action === 'accept') {
        setTimeout(() => {
          navigation.goBack();
        }, 1500);
      }
    } catch (err: any) {
      showErrorUtil('Lỗi', err.message || 'Không thể xử lý yêu cầu');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading && requests.length === 0) {
    return (
      <Screen>
        <AppHeader title="Yêu cầu liên kết" showBack onBack={() => navigation.goBack()} />
        <Loading message="Đang tải yêu cầu..." />
      </Screen>
    );
  }

  return (
    <Screen scrollable>
      <AppHeader title="Yêu cầu liên kết" showBack onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {requests.length === 0 ? (
          <EmptyState
            icon="📭"
            title="Không có yêu cầu"
            message="Chưa có yêu cầu liên kết nào từ người thân"
          />
        ) : (
          <View style={styles.requestsList}>
            {requests.map((request, index) => (
              <AnimatedCard
                key={request._id}
                entering={FadeInDown.delay(50 + index * 30)}
                style={styles.requestCard}
              >
                <View style={styles.requestHeader}>
                  <Avatar
                    name={request.caregiverName}
                    size={56}
                    avatarUrl={request.caregiverAvatar}
                  />
                  <View style={styles.requestInfo}>
                    <Text variant="section" color="text" semibold>
                      {request.caregiverName}
                    </Text>
                    <Text variant="bodySmall" color="textSecondary">
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
                    onPress={() => handleRespond(request._id, 'reject')}
                    variant="outline"
                    size="medium"
                    disabled={processingId === request._id}
                    loading={processingId === request._id}
                    style={[styles.actionButton, styles.rejectButton]}
                  />
                  <Button
                    title="Chấp nhận"
                    onPress={() => handleRespond(request._id, 'accept')}
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
  requestsList: {
    gap: SPACING.md,
  },
  requestCard: {
    marginBottom: 0,
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
});


