/**
 * Shadow System
 * Elevation-based shadows for minimalist premium design
 * Ultra-soft, diffused shadows for a floating feel
 */

import { Platform } from 'react-native';

export const SHADOWS = {
  // Soft shadow - whisper-light, for flat cards
  soft: Platform.select({
    ios: {
      shadowColor: '#456B64',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.03,
      shadowRadius: 8,
    },
    android: {
      elevation: 1,
    },
  }),

  // Card elevation - gentle float
  card: Platform.select({
    ios: {
      shadowColor: '#456B64',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 12,
    },
    android: {
      elevation: 2,
    },
  }),
  
  // Floating elevation - noticeable but soft
  floating: Platform.select({
    ios: {
      shadowColor: '#456B64',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 20,
    },
    android: {
      elevation: 6,
    },
  }),
  
  // Header elevation - barely there
  header: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.02,
      shadowRadius: 4,
    },
    android: {
      elevation: 1,
    },
  }),
  
  // Tab bar elevation - soft upward glow
  tabBar: Platform.select({
    ios: {
      shadowColor: '#456B64',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.04,
      shadowRadius: 12,
    },
    android: {
      elevation: 6,
    },
  }),
  
  // Medium elevation
  md: Platform.select({
    ios: {
      shadowColor: '#456B64',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 16,
    },
    android: {
      elevation: 4,
    },
  }),
} as const;

