/**
 * Design Tokens
 * Fixed palette and spacing scale
 */

export const COLORS = {
  // Primary palette
  primary: '#0d9488',
  primaryLight: '#14b8a6',
  primaryDark: '#0f766e',
  
  // Secondary palette
  secondary: '#6366f1',
  
  // Semantic colors
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
  
  // Surface colors
  background: '#f3f4f6',
  surface: '#ffffff',
  
  // Text colors
  text: '#1f2937',
  textSecondary: '#6b7280',
  
  // Border
  border: '#e5e7eb',
  
  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
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
  xl: 20,
  full: 9999,
} as const;

export const TOUCH_TARGET = {
  min: 44, // Minimum touch target size for accessibility
} as const;

