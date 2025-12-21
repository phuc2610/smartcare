/**
 * ActivityHistoryScreen
 * Lịch sử hoạt động với timeline of events và filters
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen } from '../../ui/Screen';
import { AppHeader } from '../../components/AppHeader';
import { Text } from '../../ui/Text';
import { Card } from '../../ui/Card';
import { Chip } from '../../ui/Chip';
import { EmptyState } from '../../ui/EmptyState';
import { COLORS, SPACING } from '../../theme';

const AnimatedCard = Animated.createAnimatedComponent(Card);

type ActivityType = 'all' | 'medication' | 'meal' | 'exercise' | 'symptom' | 'appointment';

interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: string;
  patientName: string;
}

export const ActivityHistoryScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const patientId = route.params?.patientId;

  const [filter, setFilter] = useState<ActivityType>('all');
  
  // Mock data - in real app, fetch from API
  const [activities] = useState<Activity[]>([]);

  const filteredActivities = filter === 'all'
    ? activities
    : activities.filter(a => a.type === filter);

  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case 'medication':
        return 'medication';
      case 'meal':
        return 'restaurant';
      case 'exercise':
        return 'fitness-center';
      case 'symptom':
        return 'favorite';
      case 'appointment':
        return 'event';
      default:
        return 'info';
    }
  };

  const getActivityColor = (type: ActivityType) => {
    switch (type) {
      case 'medication':
        return COLORS.primary;
      case 'meal':
        return COLORS.secondary;
      case 'exercise':
        return COLORS.success;
      case 'symptom':
        return COLORS.error;
      case 'appointment':
        return COLORS.info;
      default:
        return COLORS.textSecondary;
    }
  };

  return (
    <Screen scrollable>
      <AppHeader title="Lịch sử hoạt động" showBack onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Filters */}
        <View style={styles.filters}>
          <Chip
            label="Tất cả"
            variant={filter === 'all' ? 'primary' : 'default'}
            onPress={() => setFilter('all')}
          />
          <Chip
            label="Thuốc"
            variant={filter === 'medication' ? 'primary' : 'default'}
            onPress={() => setFilter('medication')}
          />
          <Chip
            label="Bữa ăn"
            variant={filter === 'meal' ? 'primary' : 'default'}
            onPress={() => setFilter('meal')}
          />
          <Chip
            label="Vận động"
            variant={filter === 'exercise' ? 'primary' : 'default'}
            onPress={() => setFilter('exercise')}
          />
          <Chip
            label="Triệu chứng"
            variant={filter === 'symptom' ? 'primary' : 'default'}
            onPress={() => setFilter('symptom')}
          />
        </View>

        {/* Timeline */}
        {filteredActivities.length === 0 ? (
          <EmptyState
            icon="📋"
            title="Chưa có hoạt động"
            message="Chưa có hoạt động nào được ghi nhận"
          />
        ) : (
          <View style={styles.timeline}>
            {filteredActivities.map((activity, index) => (
              <AnimatedCard
                key={activity.id}
                entering={FadeInDown.delay(50 + index * 30)}
                style={styles.activityCard}
              >
                <View style={styles.activityHeader}>
                  <View
                    style={[
                      styles.activityIcon,
                      { backgroundColor: getActivityColor(activity.type) + '20' },
                    ]}
                  >
                    <Icon
                      name={getActivityIcon(activity.type)}
                      size={20}
                      color={getActivityColor(activity.type)}
                    />
                  </View>
                  <View style={styles.activityInfo}>
                    <Text variant="body" color="text" semibold>
                      {activity.title}
                    </Text>
                    <Text variant="caption" color="textSecondary">
                      {activity.patientName} • {new Date(activity.timestamp).toLocaleString('vi-VN')}
                    </Text>
                  </View>
                </View>
                {activity.description && (
                  <Text variant="bodySmall" color="text" style={styles.activityDescription}>
                    {activity.description}
                  </Text>
                )}
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
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  timeline: {
    gap: SPACING.md,
  },
  activityCard: {
    marginBottom: 0,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityInfo: {
    flex: 1,
    gap: SPACING.xs / 2,
  },
  activityDescription: {
    marginTop: SPACING.xs,
    lineHeight: 20,
  },
});

