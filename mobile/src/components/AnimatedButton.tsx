/**
 * AnimatedButton - Legacy wrapper for Button component
 * @deprecated Use Button from '../ui/Button' directly
 */
import React from 'react';
import { ViewStyle, TextStyle } from 'react-native';
import { Button } from '../ui/Button';

interface AnimatedButtonProps {
  onPress: () => void;
  title: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  variant?: 'primary' | 'secondary' | 'outline';
  disabled?: boolean;
  loading?: boolean;
}

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  onPress,
  title,
  style,
  textStyle,
  variant = 'primary',
  disabled = false,
  loading = false,
}) => {
  return (
    <Button
      title={loading ? 'Đang xử lý...' : title}
      onPress={onPress}
      variant={variant}
      disabled={disabled}
      loading={loading}
      style={style}
      textStyle={textStyle}
    />
  );
};

