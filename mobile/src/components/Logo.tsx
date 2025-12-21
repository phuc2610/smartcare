/**
 * Logo Component
 * Component hiển thị logo của ứng dụng SmartCare
 */

import React from 'react';
import { Image, ImageStyle, StyleSheet, View, ViewStyle } from 'react-native';
import { COLORS, SPACING } from '../theme';

interface LogoProps {
  /**
   * Kích thước logo
   * - 'small': 32x32
   * - 'medium': 64x64
   * - 'large': 120x120
   * - 'xlarge': 180x180
   * - Hoặc số tùy chỉnh
   */
  size?: 'small' | 'medium' | 'large' | 'xlarge' | number;
  /**
   * Style tùy chỉnh cho container
   */
  containerStyle?: ViewStyle;
  /**
   * Style tùy chỉnh cho image
   */
  imageStyle?: ImageStyle;
  /**
   * Hiển thị text "SmartCare" bên dưới logo
   */
  showText?: boolean;
  /**
   * Màu text (nếu showText = true)
   */
  textColor?: string;
}

const SIZE_MAP = {
  small: 32,
  medium: 64,
  large: 120,
  xlarge: 180,
};

export const Logo: React.FC<LogoProps> = ({
  size = 'medium',
  containerStyle,
  imageStyle,
  showText = false,
  textColor = COLORS.text,
}) => {
  const logoSize = typeof size === 'number' ? size : SIZE_MAP[size];
  
  const logoSource = require('../assets/logo.png');

  return (
    <View style={[styles.container, containerStyle]}>
      <Image
        source={logoSource}
        style={[
          styles.image,
          { width: logoSize, height: logoSize },
          imageStyle,
        ]}
        resizeMode="contain"
      />
      {showText && (
        <View style={styles.textContainer}>
          {/* Có thể thêm Text component nếu cần */}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    // Styles sẽ được áp dụng động
  },
  textContainer: {
    marginTop: SPACING.sm,
  },
});

