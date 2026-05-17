/**
 * Card Component
 * Surface container with elevation and animations
 */

import React, { useEffect, forwardRef } from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
} from 'react-native-reanimated';
import { COLORS, RADIUS, SHADOWS, SPACING, MOTION, STAGGER_DELAY } from '../theme';

export interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'elevated';
  animated?: boolean;
  delay?: number;
  index?: number;
  onPress?: () => void;
}

const CardComponent = forwardRef<View, CardProps>(({
  children,
  style,
  variant = 'default',
  animated = true,
  delay = 0,
  index = 0,
  onPress,
}, ref) => {
  const opacity = useSharedValue(animated ? 0 : 1);
  const translateY = useSharedValue(animated ? 16 : 0);

  useEffect(() => {
    if (animated) {
      const animationDelay = delay + index * STAGGER_DELAY;
      const { opacity: op, translateY: ty } = MOTION.listItem(1, 0);
      
      opacity.value = withDelay(animationDelay, withTiming(1, { duration: 350 }));
      translateY.value = withDelay(animationDelay, withSpring(0, { damping: 22, stiffness: 60 }));
    }
  }, [animated, delay, index]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
    ],
  }));

  const shadowStyle = variant === 'elevated' ? SHADOWS.floating : SHADOWS.card;

  const content = (
    <Animated.View
      ref={ref}
      style={[
        styles.card,
        shadowStyle,
        animated && animatedStyle,
        style,
      ]}
    >
      {children}
    </Animated.View>
  );

  if (onPress) {
    const { TouchableOpacity } = require('react-native');
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
});

CardComponent.displayName = 'Card';

export const Card = CardComponent;

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    marginBottom: SPACING.md,
  },
});

