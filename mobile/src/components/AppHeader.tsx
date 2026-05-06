import React, { useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { COLORS, SPACING, SHADOWS } from '../theme';
import { Text } from '../ui/Text';
import { MOTION } from '../theme/motion';
import { NotificationBadge } from './NotificationBadge';
import { ChatBadge } from './ChatBadge';
import { Avatar } from './Avatar';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';

interface AppHeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  hideDefaultIcons?: boolean;
  /** Use the new minimalist dashboard header style */
  variant?: 'default' | 'dashboard';
}

const AppHeaderComponent: React.FC<AppHeaderProps> = ({ title, showBack, onBack, rightAction, hideDefaultIcons = false, variant = 'default' }) => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const handleNavigate = useCallback((screenName: string) => {
    try {
      // Try to get the root navigator (TabsNavigator)
      let rootNavigator = navigation;
      let parent = navigation.getParent();
      
      // Navigate up the hierarchy to find TabsNavigator
      while (parent) {
        rootNavigator = parent;
        parent = parent.getParent();
      }
      
      if (rootNavigator && typeof rootNavigator.navigate === 'function') {
        rootNavigator.navigate(screenName);
      }
    } catch (error) {
      console.warn('Navigation error:', error);
    }
  }, [navigation]);

  // Dashboard variant - minimalist with avatar + info on left, icons on right
  if (variant === 'dashboard') {
    const today = new Date();
    const dayStr = today.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' });

    return (
      <View style={styles.dashboardContainer}>
        <View style={styles.dashboardContent}>
          {/* Left: Avatar + User Info */}
          <View style={styles.dashboardLeft}>
            <Avatar
              name={user?.name || 'U'}
              size={46}
              avatarUrl={user?.avatar}
              style={styles.dashboardAvatar}
            />
            <View style={styles.dashboardInfo}>
              <Text variant="caption" style={styles.dashboardGreeting}>
                Hôm nay
              </Text>
              <Text variant="section" style={styles.dashboardName}>
                {user?.name || 'Bệnh nhân'}
              </Text>
              {user?.medicalCondition && user.medicalCondition !== 'Normal' && (
                <View style={styles.conditionPill}>
                  <Text style={styles.conditionPillText}>{user.medicalCondition}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Right: Action Icons */}
          <View style={styles.dashboardRight}>
            {/* Notifications */}
            {user?.role === UserRole.PATIENT && (
              <View style={styles.iconBadgeWrap}>
                <AnimatedIconButton
                  icon="notifications-none"
                  onPress={() => handleNavigate('Notifications')}
                  color={COLORS.text}
                />
                <NotificationBadge />
              </View>
            )}
            
            {/* Messages */}
            <View style={styles.iconBadgeWrap}>
              <AnimatedIconButton
                icon="chat-bubble-outline"
                onPress={() => handleNavigate('ConversationList')}
                color={COLORS.text}
              />
              <ChatBadge />
            </View>
            
            {/* Wellness / Leaf */}
            <AnimatedIconButton
              icon="spa"
              onPress={() => handleNavigate('Wellness')}
              color={COLORS.text}
            />
          </View>
        </View>
      </View>
    );
  }

  // Default variant - for sub-screens
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {showBack && onBack ? (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Icon name="arrow-back-ios" size={20} color={COLORS.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholder} />
        )}
        
        <Text variant="section" color="text" style={styles.title}>{title}</Text>
        
        <View style={styles.rightActions}>
          {rightAction ? (
            rightAction
          ) : hideDefaultIcons ? (
            null
          ) : (
            <>
              {/* Notifications Icon (only for patients) */}
              {user?.role === UserRole.PATIENT && (
                <View style={styles.badgeContainer}>
                  <AnimatedIconButton
                    icon="notifications-none"
                    onPress={() => handleNavigate('Notifications')}
                    color={COLORS.text}
                  />
                  <NotificationBadge />
                </View>
              )}
              
              {/* Chat AI Icon */}
              <AnimatedIconButton
                icon="chat-bubble-outline"
                onPress={() => handleNavigate('Chat')}
                color={COLORS.text}
              />
              
              {/* Messages Icon */}
              <View style={styles.badgeContainer}>
                <AnimatedIconButton
                  icon="message"
                  onPress={() => handleNavigate('ConversationList')}
                  color={COLORS.text}
                />
                <ChatBadge />
              </View>
            </>
          )}
        </View>
      </View>
    </View>
  );
};

export const AppHeader = React.memo(AppHeaderComponent);


const AnimatedIconButton = React.memo(({ icon, onPress, color }: { icon: string; onPress: () => void; color: string }) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.85, { damping: 15, stiffness: 150 });
    opacity.value = withTiming(0.6, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 20, stiffness: 100 });
    opacity.value = withTiming(1, { duration: 100 });
  };

  const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

  return (
    <AnimatedTouchable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.iconButton, animatedStyle]}
      activeOpacity={1}
    >
      <Icon name={icon} size={24} color={color} />
    </AnimatedTouchable>
  );
});

const styles = StyleSheet.create({
  // ===== Dashboard Variant =====
  dashboardContainer: {
    backgroundColor: COLORS.surface,
    paddingTop: 0,
  },
  dashboardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    minHeight: 64,
  },
  dashboardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dashboardAvatar: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  dashboardInfo: {
    marginLeft: SPACING.md,
    flex: 1,
  },
  dashboardGreeting: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  dashboardName: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
    marginTop: 1,
  },
  conditionPill: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: SPACING['2xl'],
    marginTop: 4,
  },
  conditionPillText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '600',
  },
  dashboardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  iconBadgeWrap: {
    position: 'relative',
  },

  // ===== Default Variant =====
  container: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingTop: 0,
    paddingHorizontal: 0,
    alignSelf: 'stretch',
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    minHeight: 56,
  },
  backButton: {
    marginRight: SPACING.md,
    padding: SPACING.xs,
  },
  placeholder: {
    width: 32,
  },
  title: {
    flex: 1,
    textAlign: 'center',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  iconButton: {
    padding: SPACING.sm,
  },
  badgeContainer: {
    position: 'relative',
  },
});
