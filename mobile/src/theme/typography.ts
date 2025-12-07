/**
 * Typography System
 * Font sizes and weights following design tokens
 */

import { Platform } from 'react-native';

export const TYPOGRAPHY = {
  // Display - Hero text
  display: {
    fontSize: Platform.select({ ios: 32, android: 30 }),
    fontWeight: '700' as const,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  
  // Title - Section headers
  title: {
    fontSize: Platform.select({ ios: 24, android: 22 }),
    fontWeight: '700' as const,
    lineHeight: 32,
    letterSpacing: -0.3,
  },
  
  // Section - Subsection headers
  section: {
    fontSize: Platform.select({ ios: 18, android: 17 }),
    fontWeight: '600' as const,
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  
  // Body - Main content
  body: {
    fontSize: Platform.select({ ios: 16, android: 15 }),
    fontWeight: '400' as const,
    lineHeight: 24,
    letterSpacing: 0,
  },
  
  // Body small
  bodySmall: {
    fontSize: Platform.select({ ios: 14, android: 13 }),
    fontWeight: '400' as const,
    lineHeight: 20,
    letterSpacing: 0,
  },
  
  // Caption - Secondary text
  caption: {
    fontSize: Platform.select({ ios: 13, android: 12 }),
    fontWeight: '400' as const,
    lineHeight: 18,
    letterSpacing: 0.2,
  },
  
  // Button text
  button: {
    fontSize: Platform.select({ ios: 16, android: 15 }),
    fontWeight: '600' as const,
    lineHeight: 24,
    letterSpacing: 0.3,
  },
} as const;

// Helper to get font size with scaling support
export const getScaledFontSize = (baseSize: number, scale: number = 1): number => {
  return baseSize * scale;
};

