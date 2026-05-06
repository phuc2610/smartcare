/**
 * Shadow System
 * Elevation-based shadows for minimalist premium design
 * Very soft, subtle shadows
 */

import { Platform } from 'react-native';

export const SHADOWS = {
  // Soft shadow - very light, minimalist cards
  soft: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
    },
    android: {
      elevation: 1,
    },
  }),

  // Card elevation (2-3)
  card: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
    },
    android: {
      elevation: 2,
    },
  }),
  
  // Floating elevation (6-8)
  floating: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
    },
    android: {
      elevation: 8,
    },
  }),
  
  // Header elevation
  header: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.03,
      shadowRadius: 2,
    },
    android: {
      elevation: 1,
    },
  }),
  
  // Tab bar elevation - shadow hất lên
  tabBar: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
    },
    android: {
      elevation: 8,
    },
  }),
  
  // Medium elevation (4-5)
  md: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.08,
      shadowRadius: 10,
    },
    android: {
      elevation: 4,
    },
  }),
} as const;
