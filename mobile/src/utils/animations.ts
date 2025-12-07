import { withSpring, withTiming, withSequence, Easing } from 'react-native-reanimated';

// Animation configurations
export const ANIMATION_CONFIG = {
  // Spring animations (bouncy, natural)
  spring: {
    damping: 15,
    stiffness: 150,
    mass: 1,
  },
  // Smooth spring (less bouncy)
  smoothSpring: {
    damping: 20,
    stiffness: 100,
    mass: 1,
  },
  // Timing animations
  timing: {
    duration: 300,
    easing: Easing.out(Easing.cubic),
  },
  // Fast timing
  fastTiming: {
    duration: 200,
    easing: Easing.out(Easing.quad),
  },
  // Slow timing
  slowTiming: {
    duration: 500,
    easing: Easing.out(Easing.cubic),
  },
};

// Fade in animation
export const fadeIn = (delay = 0) => {
  return withTiming(1, {
    duration: 300,
    easing: Easing.out(Easing.quad),
  });
};

// Fade out animation
export const fadeOut = () => {
  return withTiming(0, {
    duration: 200,
    easing: Easing.in(Easing.quad),
  });
};

// Scale animation (for buttons)
export const scaleIn = () => {
  return withSpring(1, ANIMATION_CONFIG.smoothSpring);
};

export const scaleOut = () => {
  return withSpring(0.95, ANIMATION_CONFIG.spring);
};

// Slide animations
export const slideInRight = () => {
  return withTiming(0, ANIMATION_CONFIG.timing);
};

export const slideInLeft = () => {
  return withTiming(0, ANIMATION_CONFIG.timing);
};

export const slideInUp = () => {
  return withTiming(0, ANIMATION_CONFIG.timing);
};

export const slideInDown = () => {
  return withTiming(0, ANIMATION_CONFIG.timing);
};

// Bounce animation
export const bounce = () => {
  return withSequence(
    withTiming(1.1, { duration: 150, easing: Easing.out(Easing.quad) }),
    withSpring(1, ANIMATION_CONFIG.spring)
  );
};

// Pulse animation
export const pulse = () => {
  return withSequence(
    withTiming(1.05, { duration: 200, easing: Easing.out(Easing.quad) }),
    withTiming(1, { duration: 200, easing: Easing.in(Easing.quad) })
  );
};

// Shake animation
export const shake = () => {
  return withSequence(
    withTiming(-5, { duration: 50 }),
    withTiming(5, { duration: 50 }),
    withTiming(-5, { duration: 50 }),
    withTiming(5, { duration: 50 }),
    withTiming(0, { duration: 50 })
  );
};

