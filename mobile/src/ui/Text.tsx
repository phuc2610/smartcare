/**
 * Text Component
 * Typography primitive with accessibility support
 */

import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet, TextStyle } from 'react-native';
import { TYPOGRAPHY, COLORS } from '../theme';

export type TextVariant = 'display' | 'title' | 'section' | 'body' | 'bodySmall' | 'caption' | 'button';
export type TextColor = 'text' | 'textSecondary' | 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'surface';

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: TextColor;
  bold?: boolean;
  semibold?: boolean;
}

export const Text: React.FC<TextProps> = ({
  variant = 'body',
  color = 'text',
  bold = false,
  semibold = false,
  style,
  ...props
}) => {
  const variantStyle = TYPOGRAPHY[variant];
  const fontWeight = bold ? '700' : semibold ? '600' : variantStyle.fontWeight;
  
  const colorValue = COLORS[color] || COLORS.text;

  return (
    <RNText
      style={[
        {
          ...variantStyle,
          fontWeight,
          color: colorValue,
        },
        style,
      ]}
      allowFontScaling={true}
      {...props}
    />
  );
};

