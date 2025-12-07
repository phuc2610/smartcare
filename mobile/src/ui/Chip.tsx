/**
 * Chip Component
 * Compact label/tag component
 */

import React from 'react';
import { TouchableOpacity, View, ViewStyle, StyleSheet } from 'react-native';
import { Text } from './Text';
import { COLORS, RADIUS, SPACING } from '../theme';

export type ChipVariant = 'default' | 'primary' | 'secondary' | 'success' | 'error' | 'warning';

export interface ChipProps {
  label: string;
  variant?: ChipVariant;
  onPress?: () => void;
  style?: ViewStyle;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  variant = 'default',
  onPress,
  style,
}) => {
  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: COLORS.primaryLight + '20',
          borderColor: COLORS.primary,
        };
      case 'secondary':
        return {
          backgroundColor: COLORS.secondary + '20',
          borderColor: COLORS.secondary,
        };
      case 'success':
        return {
          backgroundColor: COLORS.success + '20',
          borderColor: COLORS.success,
        };
      case 'error':
        return {
          backgroundColor: COLORS.error + '20',
          borderColor: COLORS.error,
        };
      case 'warning':
        return {
          backgroundColor: COLORS.warning + '20',
          borderColor: COLORS.warning,
        };
      default:
        return {
          backgroundColor: COLORS.background,
          borderColor: COLORS.border,
        };
    }
  };

  const getTextColor = (): 'text' | 'textSecondary' | 'primary' | 'secondary' | 'success' | 'error' | 'warning' => {
    switch (variant) {
      case 'primary':
        return 'primary';
      case 'secondary':
        return 'secondary';
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      default:
        return 'textSecondary';
    }
  };

  const content = (
    <View style={[styles.chip, getVariantStyle(), style]}>
      <Text variant="caption" color={getTextColor()} semibold>
        {label}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
});

