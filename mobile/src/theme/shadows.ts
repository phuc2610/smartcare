/**
 * Shadow System
 * Elevation-based shadows for cards and floating elements
 */

import { Platform } from 'react-native';
import { COLORS } from './tokens';

export const SHADOWS = {
  // Card elevation (2-3)
  card: Platform.select({
    ios: {
      shadowColor: COLORS.text,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
    },
    android: {
      elevation: 3,
    },
  }),
  
  // Floating elevation (6-8)
  floating: Platform.select({
    ios: {
      shadowColor: COLORS.text,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
    },
    android: {
      elevation: 8,
    },
  }),
  
  // Header elevation
  header: Platform.select({
    ios: {
      shadowColor: COLORS.text,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
    },
    android: {
      elevation: 2,
    },
  }),
  
  // Tab bar elevation
  tabBar: Platform.select({
    ios: {
      shadowColor: COLORS.text,
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    android: {
      elevation: 8,
    },
  }),
  
  // Medium elevation (4-5)
  md: Platform.select({
    ios: {
      shadowColor: COLORS.text,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.12,
      shadowRadius: 10,
    },
    android: {
      elevation: 5,
    },
  }),
} as const;

