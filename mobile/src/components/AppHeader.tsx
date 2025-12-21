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
import { Logo } from './Logo';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';

interface AppHeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  hideDefaultIcons?: boolean;
}

const AppHeaderComponent: React.FC<AppHeaderProps> = ({ title, showBack, onBack, rightAction, hideDefaultIcons = false }) => {
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

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {showBack && onBack ? (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color={COLORS.surface} />
          </TouchableOpacity>
        ) : (
          <Logo size="small" containerStyle={styles.logoPlaceholder} />
        )}
        
        <Text variant="section" color="surface" style={styles.title}>{title}</Text>
        
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
                    icon="notifications"
                    onPress={() => handleNavigate('Notifications')}
                    color={COLORS.surface}
                  />
                  <NotificationBadge />
                </View>
              )}
              
              {/* Wellness Icon */}
              <AnimatedIconButton
                icon="spa"
                onPress={() => handleNavigate('Wellness')}
                color={COLORS.surface}
              />
              
              {/* Chat AI Icon */}
              <AnimatedIconButton
                icon="chat-bubble-outline"
                onPress={() => handleNavigate('Chat')}
                color={COLORS.surface}
              />
              
              {/* Messages Icon */}
              <View style={styles.badgeContainer}>
                <AnimatedIconButton
                  icon="message"
                  onPress={() => handleNavigate('ConversationList')}
                  color={COLORS.surface}
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
  container: {
    backgroundColor: COLORS.primary,
    borderBottomWidth: 0,
    paddingTop: 0,
    paddingHorizontal: 0,
    alignSelf: 'stretch',
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
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
  logoPlaceholder: {
    width: 32,
    height: 32,
  },
  title: {
    flex: 1,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  iconButton: {
    padding: SPACING.xs,
    marginLeft: SPACING.xs,
  },
  badgeContainer: {
    position: 'relative',
  },
});

