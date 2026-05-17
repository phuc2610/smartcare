/**
 * Motion System
 * Animation configurations following Apple HIG-inspired physics
 * 
 * Updated: Gentler springs, smoother curves, natural feel
 */

import { withSpring, withTiming, Easing } from 'react-native-reanimated';

// Spring configurations - iOS-inspired physics
export const SPRING = {
  // Smooth - for general UI transitions (buttons, cards)
  smooth: {
    damping: 18,
    stiffness: 90,
    mass: 0.8,
  },
  // Bouncy - for playful feedback (FAB, tab icons)
  bouncy: {
    damping: 12,
    stiffness: 120,
    mass: 0.7,
  },
  // Gentle - for slow, elegant reveals (sheets, modals)
  gentle: {
    damping: 22,
    stiffness: 60,
    mass: 1,
  },
  // Snappy - for quick, responsive taps
  snappy: {
    damping: 16,
    stiffness: 200,
    mass: 0.6,
  },
} as const;

// Timing configurations - ease-out curves for natural deceleration
export const TIMING = {
  fast: {
    duration: 180,
    easing: Easing.out(Easing.quad),
  },
  normal: {
    duration: 280,
    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
  },
  slow: {
    duration: 450,
    easing: Easing.bezier(0.22, 1, 0.36, 1),
  },
} as const;

// Animation presets
export const MOTION = {
  // Auth/Main transition: fade 280ms
  fadeTransition: (value: number) => 
    withTiming(value, TIMING.normal),
  
  // Stack push: slide-right 280ms
  slideRight: (value: number) => 
    withTiming(value, TIMING.normal),
  
  // Tab icon active: spring scale ~1.1
  tabIconActive: (value: number) => 
    withSpring(value, SPRING.smooth),
  
  // Press: scale 0.96 -> 1 snappy spring
  pressScale: (value: number) => 
    withSpring(value, SPRING.snappy),
  
  // Lists: fade+slide with stagger
  listItem: (opacity: number, translateY: number) => ({
    opacity: withTiming(opacity, TIMING.normal),
    translateY: withSpring(translateY, SPRING.gentle),
  }),
  
  // FAB: rotate 90deg when sheet open
  fabRotate: (value: number) => 
    withSpring(value, SPRING.smooth),
} as const;

// Stagger delay for list animations
export const STAGGER_DELAY = 60; // 60ms per item for smoother cascade


