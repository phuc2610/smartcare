import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../utils/constants';

interface BadgeProps {
  text: string;
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'info';
}

export const Badge: React.FC<BadgeProps> = ({ 
  text, 
  variant = 'primary' 
}) => {
  const variantStyles = {
    primary: { bg: COLORS.primaryLight, text: COLORS.primary },
    success: { bg: '#d1fae5', text: COLORS.success },
    warning: { bg: '#fef3c7', text: COLORS.warning },
    error: { bg: '#fee2e2', text: COLORS.error },
    info: { bg: '#dbeafe', text: COLORS.info },
  };

  const style = variantStyles[variant];

  return (
    <View style={[styles.container, { backgroundColor: style.bg }]}>
      <Text style={[styles.text, { color: style.text }]}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});

