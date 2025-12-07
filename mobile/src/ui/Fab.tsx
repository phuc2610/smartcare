/**
 * FAB (Floating Action Button) Component
 * Floating button with rotation animation when sheet opens
 */

import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { COLORS, RADIUS, SHADOWS, SPRING } from '../theme';

export interface FabProps {
  onPress: () => void;
  icon?: string;
  rotated?: boolean;
  style?: ViewStyle;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export const Fab: React.FC<FabProps> = ({
  onPress,
  icon = 'add',
  rotated = false,
  style,
}) => {
  const rotation = useSharedValue(0);

  React.useEffect(() => {
    rotation.value = withSpring(rotated ? 90 : 0, SPRING.smooth);
  }, [rotated]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <AnimatedTouchable
      onPress={onPress}
      style={[styles.fab, SHADOWS.floating, animatedStyle, style]}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel="Add"
    >
      <Icon name={icon} size={32} color="#fff" />
    </AnimatedTouchable>
  );
};

const styles = StyleSheet.create({
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
  },
});

