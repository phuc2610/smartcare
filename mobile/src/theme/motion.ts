/**
 * Motion System
 * Animation configurations following design rules
 */

import { withSpring, withTiming, Easing } from 'react-native-reanimated';

// Spring configurations
export const SPRING = {
  smooth: {
    damping: 20,
    stiffness: 100,
    mass: 1,
  },
  bouncy: {
    damping: 15,
    stiffness: 150,
    mass: 1,
  },
} as const;

// Timing configurations
export const TIMING = {
  fast: {
    duration: 200,
    easing: Easing.out(Easing.quad),
  },
  normal: {
    duration: 300,
    easing: Easing.out(Easing.cubic),
  },
  slow: {
    duration: 500,
    easing: Easing.out(Easing.cubic),
  },
} as const;

// Animation presets
export const MOTION = {
  // Auth/Main transition: fade 300ms
  fadeTransition: (value: number) => 
    withTiming(value, TIMING.normal),
  
  // Stack push: slide-right 300ms
  slideRight: (value: number) => 
    withTiming(value, TIMING.normal),
  
  // Tab icon active: spring scale ~1.1
  tabIconActive: (value: number) => 
    withSpring(value, SPRING.smooth),
  
  // Press: scale 0.95 -> 1 spring
  pressScale: (value: number) => 
    withSpring(value, SPRING.smooth),
  
  // Lists: fade+slide with stagger
  listItem: (opacity: number, translateY: number) => ({
    opacity: withTiming(opacity, TIMING.normal),
    translateY: withSpring(translateY, SPRING.smooth),
  }),
  
  // FAB: rotate 90deg when sheet open
  fabRotate: (value: number) => 
    withSpring(value, SPRING.smooth),
} as const;

// Stagger delay for list animations
export const STAGGER_DELAY = 50; // 50-100ms per item

