/**
 * Design Tokens
 * Fixed palette and spacing scale
 * Minimalist Premium Theme - Teal/Blue primary
 * 
 * Updated: Softer radius, gentler colors, more breathing room
 */

export const COLORS = {
  // Primary palette - Teal Green (giữ nguyên chủ đạo)
  primary: '#458B81',
  primaryLight: '#EDF7F5',
  primaryDark: '#367068',
  primarySoft: 'rgba(69, 139, 129, 0.08)',
  
  // Secondary palette
  secondary: '#6366f1',
  secondarySoft: 'rgba(99, 102, 241, 0.08)',
  
  // Semantic colors - Softer tones
  success: '#34C759',
  successSoft: 'rgba(52, 199, 89, 0.10)',
  error: '#FF3B30',
  errorSoft: 'rgba(255, 59, 48, 0.08)',
  warning: '#FF9500',
  warningSoft: 'rgba(255, 149, 0, 0.08)',
  info: '#5AC8FA',
  infoSoft: 'rgba(90, 200, 250, 0.08)',
  
  // Surface colors - Warm minimalist
  background: '#F6F8FA',
  surface: '#FFFFFF',
  surfaceSecondary: '#F0F4F3',
  
  // Text colors
  text: '#1C1C1E',
  textSecondary: '#8E8E93',
  textTertiary: '#AEAEB2',
  
  // Border - Softer
  border: '#E8EAED',
  borderLight: '#F0F1F3',
  
  // Overlay - Slightly lighter
  overlay: 'rgba(0, 0, 0, 0.35)',
  
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
  '4xl': 40,
} as const;

export const RADIUS = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 20,
  xl: 28,
  '2xl': 32,
  full: 9999,
} as const;

export const TOUCH_TARGET = {
  min: 44, // Minimum touch target size for accessibility
} as const;
