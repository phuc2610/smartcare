
import { useState, useEffect, useRef, useCallback } from 'react';
import { LocationCoords } from '../services/locationService';

// Fall Detection Constants
const GRAVITY = 9.8; // m/s^2
const FALL_THRESHOLD_G = 2.5; // > 2.5G indicates potential hard impact
const IMPACT_THRESHOLD = FALL_THRESHOLD_G * GRAVITY; // ~24.5 m/s^2

/**
 * Hook logic:
 * 1. Listen to DeviceMotion (Accelerometer).
 * 2. Calculate Total Acceleration Vector: sqrt(x^2 + y^2 + z^2).
 * 3. If Vector > Threshold -> Possible Fall (IMPACT).
 * 4. Trigger UI Alert.
 */
export const useFallDetection = () => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [fallDetected, setFallDetected] = useState(false);
  const lastUpdateRef = useRef<number>(0);
  
  // Optimization: Throttle sensor updates to save battery (Web doesn't allow setting interval directly like Expo)
  // We process data every 100ms instead of 60Hz (~16ms)
  const UPDATE_INTERVAL_MS = 100;

  const handleMotion = useCallback((event: DeviceMotionEvent) => {
    const now = Date.now();
    if (now - lastUpdateRef.current < UPDATE_INTERVAL_MS) return;
    lastUpdateRef.current = now;

    const { x, y, z } = event.accelerationIncludingGravity || { x: 0, y: 0, z: 0 };

    if (x === null || y === null || z === null) return;

    // Calculate Total Acceleration Vector
    const totalAcceleration = Math.sqrt(x * x + y * y + z * z);

    // Logic: Fall Detection
    if (totalAcceleration > IMPACT_THRESHOLD) {
      console.log(`[Sensor] Impact Detected: ${totalAcceleration.toFixed(2)} m/s2 (~${(totalAcceleration/GRAVITY).toFixed(1)}G)`);
      
      // Verification Logic (Simplified for Web Demo): 
      // In a real native app, we would check if device is stationary for next 2-3 seconds.
      // Here we trigger the alert immediately for responsiveness.
      setFallDetected(true);
      
      // Stop monitoring temporarily to prevent multiple triggers
      setIsMonitoring(false); 
    }
  }, []);

  const startMonitoring = async () => {
    // iOS 13+ Permission Requirement
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      try {
        const response = await (DeviceMotionEvent as any).requestPermission();
        if (response !== 'granted') {
          alert("Cần quyền truy cập cảm biến để phát hiện té ngã.");
          return;
        }
      } catch (e) {
        console.error(e);
      }
    }

    window.addEventListener('devicemotion', handleMotion);
    setIsMonitoring(true);
    console.log('[System] Fall Detection Started');
  };

  const stopMonitoring = () => {
    window.removeEventListener('devicemotion', handleMotion);
    setIsMonitoring(false);
    console.log('[System] Fall Detection Stopped');
  };

  const resetState = () => {
    setFallDetected(false);
    if (!isMonitoring) {
       // Re-enable monitoring after user confirms safety
       window.addEventListener('devicemotion', handleMotion);
       setIsMonitoring(true);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, [handleMotion]);

  // Manual Trigger for Testing/Demo purposes
  const simulateFall = () => {
    setFallDetected(true);
  };

  return {
    isMonitoring,
    fallDetected,
    startMonitoring,
    stopMonitoring,
    resetState,
    simulateFall
  };
};
