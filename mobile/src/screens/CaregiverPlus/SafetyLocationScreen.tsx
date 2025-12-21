/**
 * SafetyLocationScreen
 * Vị trí & an toàn với location card, safety status, map CTA
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
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
import { COLORS, SPACING } from '../../theme';
import { getLocationStatus } from '../../services/caregiverPlus.service';
import { LocationStatus } from '../../types';
import { showError as showErrorUtil } from '../../utils/alert';
import { logger } from '../../utils/logger';

const AnimatedCard = Animated.createAnimatedComponent(Card);

export const SafetyLocationScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const patientId = route.params?.patientId;

  const [loading, setLoading] = useState(true);
  const [locationStatus, setLocationStatus] = useState<LocationStatus | null>(null);

  useEffect(() => {
    if (patientId) {
      fetchLocation();
    }
  }, [patientId]);

  const fetchLocation = async () => {
    try {
      setLoading(true);
      const data = await getLocationStatus(patientId);
      setLocationStatus(data);
    } catch (err: any) {
      logger.error('Fetch location error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getSafetyVariant = (status: string) => {
    switch (status) {
      case 'safe':
        return 'success';
      case 'warning':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getSafetyLabel = (status: string) => {
    switch (status) {
      case 'safe':
        return 'An toàn';
      case 'warning':
        return 'Cảnh báo';
      default:
        return 'Không xác định';
    }
  };

  const handleOpenMap = () => {
    // TODO: Navigate to map screen if exists
    showErrorUtil('Thông báo', 'Tính năng bản đồ đang được phát triển');
  };

  const handleSetupGeofence = () => {
    showErrorUtil('Thông báo', 'Tính năng vùng an toàn đang được phát triển');
  };

  if (loading) {
    return (
      <Screen>
        <AppHeader title="Vị trí & an toàn" showBack onBack={() => navigation.goBack()} />
        <Loading message="Đang tải vị trí..." />
      </Screen>
    );
  }

  return (
    <Screen scrollable>
      <AppHeader title="Vị trí & an toàn" showBack onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Safety Status */}
        <AnimatedCard entering={FadeInDown.delay(50)} style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Icon name="location-on" size={32} color={COLORS.primary} />
            <View style={styles.statusInfo}>
              <Text variant="section" color="text" semibold>
                Trạng thái an toàn
              </Text>
              <Chip
                label={getSafetyLabel(locationStatus?.safetyStatus || 'unknown')}
                variant={getSafetyVariant(locationStatus?.safetyStatus || 'unknown')}
                style={styles.statusChip}
              />
            </View>
          </View>
        </AnimatedCard>

        {/* Last Known Location */}
        {locationStatus?.lastKnownLocation ? (
          <AnimatedCard entering={FadeInDown.delay(100)} style={styles.locationCard}>
            <Text variant="section" color="text" semibold style={styles.cardTitle}>
              Vị trí gần nhất
            </Text>
            <View style={styles.locationInfo}>
              <Text variant="body" color="text">
                Vĩ độ: {locationStatus.lastKnownLocation.latitude.toFixed(6)}
              </Text>
              <Text variant="body" color="text">
                Kinh độ: {locationStatus.lastKnownLocation.longitude.toFixed(6)}
              </Text>
              {locationStatus.lastUpdateTime && (
                <Text variant="caption" color="textSecondary" style={styles.updateTime}>
                  Cập nhật: {new Date(locationStatus.lastUpdateTime).toLocaleString('vi-VN')}
                </Text>
              )}
            </View>
          </AnimatedCard>
        ) : (
          <Card style={styles.locationCard}>
            <EmptyState
              icon="📍"
              title="Chưa có vị trí"
              message="Chưa có dữ liệu vị trí từ bệnh nhân"
            />
          </Card>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            title="Mở bản đồ"
            onPress={handleOpenMap}
            variant="primary"
            size="large"
            leftIcon={<Icon name="map" size={20} color="#fff" />}
            style={styles.actionButton}
          />
          <Button
            title="Thiết lập vùng an toàn"
            onPress={handleSetupGeofence}
            variant="outline"
            size="large"
            leftIcon={<Icon name="fence" size={20} color={COLORS.primary} />}
            style={styles.actionButton}
          />
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
  statusCard: {
    marginBottom: SPACING.lg,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  statusInfo: {
    flex: 1,
    gap: SPACING.xs,
  },
  statusChip: {
    marginTop: SPACING.xs / 2,
  },
  locationCard: {
    marginBottom: SPACING.lg,
  },
  cardTitle: {
    marginBottom: SPACING.md,
  },
  locationInfo: {
    gap: SPACING.xs,
  },
  updateTime: {
    marginTop: SPACING.sm,
  },
  actions: {
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  actionButton: {
    width: '100%',
  },
});

