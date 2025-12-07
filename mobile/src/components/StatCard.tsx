import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, withDelay } from 'react-native-reanimated';
import { COLORS, SPACING, RADIUS, STAGGER_DELAY } from '../theme';
import { Text } from '../ui/Text';
import { SPRING, TIMING } from '../theme/motion';

interface StatCardProps {
  value: string | number;
  label: string;
  color?: string;
  index?: number;
}

export const StatCard: React.FC<StatCardProps> = ({ 
  value, 
  label, 
  color = COLORS.primary,
  index = 0,
}) => {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);
  const translateY = useSharedValue(20);

  useEffect(() => {
    const delay = index * STAGGER_DELAY;
    opacity.value = withDelay(delay, withTiming(1, TIMING.normal));
    scale.value = withDelay(delay, withSpring(1, SPRING.smooth));
    translateY.value = withDelay(delay, withSpring(0, SPRING.smooth));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { scale: scale.value },
      { translateY: translateY.value },
    ],
  }));

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <Text variant="title" style={[styles.value, { color }]}>{value}</Text>
      <Text variant="caption" color="textSecondary" style={styles.label}>{label}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  value: {
    marginBottom: SPACING.xs,
  },
  label: {
    // Typography handled by Text component
  },
});

