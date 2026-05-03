/**
 * Design Tokens
 * Fixed palette and spacing scale
 * Minimalist Premium Theme - Teal/Blue primary
 */

export const COLORS = {
  // Primary palette - Teal Blue
  primary: '#4A90E2',
  primaryLight: '#EBF3FC',
  primaryDark: '#357ABD',
  
  // Secondary palette
  secondary: '#6366f1',
  
  // Semantic colors
  success: '#34C759',
  error: '#FF3B30',
  warning: '#FF9500',
  info: '#5AC8FA',
  
  // Surface colors - Minimalist light
  background: '#F8F9FA',
  surface: '#FFFFFF',
  
  // Text colors
  text: '#1C1C1E',
  textSecondary: '#8E8E93',
  
  // Border
  border: '#E5E5EA',
  
  // Overlay
  overlay: 'rgba(0, 0, 0, 0.4)',
  
  // Extra colors for pills/badges
  pillGreen: '#E8F5E9',
  pillGreenText: '#2E7D32',
  pillYellow: '#FFF8E1',
  pillYellowText: '#F57F17',
  pillGray: '#F5F5F5',
  pillGrayText: '#616161',
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
} as const;

export const RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const TOUCH_TARGET = {
  min: 44, // Minimum touch target size for accessibility
} as const;
