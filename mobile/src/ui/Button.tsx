/**
 * Button Component
 * Interactive button with press animations and accessibility
 */

import React from 'react';
import { TouchableOpacity, ViewStyle, TextStyle, StyleSheet, ActivityIndicator } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { Text } from './Text';
import { COLORS, RADIUS, SPACING, TOUCH_TARGET, SPRING, TIMING } from '../theme';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
export type ButtonSize = 'small' | 'medium' | 'large';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
  leftIcon,
  rightIcon,
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = () => {
    if (disabled || loading) return;
    scale.value = withSpring(0.95, SPRING.smooth);
    opacity.value = withTiming(0.8, TIMING.fast);
  };

  const handlePressOut = () => {
    if (disabled || loading) return;
    scale.value = withSpring(1, SPRING.smooth);
    opacity.value = withTiming(1, TIMING.fast);
  };

  const handlePress = () => {
    if (disabled || loading) return;
    
    // Bounce effect
    scale.value = withSequence(
      withTiming(0.9, TIMING.fast),
      withSpring(1, SPRING.bouncy)
    );
    
    onPress();
  };

  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'primary':
        return { backgroundColor: COLORS.primary };
      case 'secondary':
        return { backgroundColor: COLORS.secondary };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderColor: COLORS.primary,
        };
      case 'ghost':
        return { backgroundColor: 'transparent' };
      default:
        return { backgroundColor: COLORS.primary };
    }
  };

  const getTextColor = (): 'text' | 'textSecondary' | 'primary' => {
    switch (variant) {
      case 'primary':
      case 'secondary':
        return 'text';
      case 'outline':
      case 'ghost':
        return 'primary';
      default:
        return 'text';
    }
  };

  const getSizeStyle = (): ViewStyle => {
    switch (size) {
      case 'small':
        return {
          paddingVertical: SPACING.sm,
          paddingHorizontal: SPACING.lg,
          minHeight: TOUCH_TARGET.min,
        };
      case 'medium':
        return {
          paddingVertical: SPACING.md + 2,
          paddingHorizontal: SPACING['2xl'],
          minHeight: TOUCH_TARGET.min + 4,
        };
      case 'large':
        return {
          paddingVertical: SPACING.lg,
          paddingHorizontal: SPACING['3xl'],
          minHeight: TOUCH_TARGET.min + 8,
        };
      default:
        return {
          paddingVertical: SPACING.md + 2,
          paddingHorizontal: SPACING['2xl'],
          minHeight: TOUCH_TARGET.min + 4,
        };
    }
  };

  const isDisabled = disabled || loading;

  return (
    <AnimatedTouchable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      style={[
        styles.button,
        getVariantStyle(),
        getSizeStyle(),
        animatedStyle,
        isDisabled && styles.disabled,
        style,
      ]}
      activeOpacity={1}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'secondary' ? '#fff' : COLORS.primary}
        />
      ) : (
        <>
          {leftIcon && <>{leftIcon}</>}
          <Text
            variant="button"
            color={variant === 'primary' || variant === 'secondary' ? 'text' : 'primary'}
            style={[
              variant === 'primary' || variant === 'secondary' ? styles.textWhite : {},
              textStyle,
            ]}
          >
            {title}
          </Text>
          {rightIcon && <>{rightIcon}</>}
        </>
      )}
    </AnimatedTouchable>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  disabled: {
    opacity: 0.5,
  },
  textWhite: {
    color: '#fff',
  },
});

