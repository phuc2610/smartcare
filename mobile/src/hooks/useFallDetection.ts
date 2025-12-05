import { useState, useEffect, useRef, useCallback } from 'react';
import { accelerometer } from 'react-native-sensors';

const GRAVITY = 9.8;
const FALL_THRESHOLD_G = 2.5;
const IMPACT_THRESHOLD = FALL_THRESHOLD_G * GRAVITY;
const UPDATE_INTERVAL_MS = 100;

export const useFallDetection = () => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [fallDetected, setFallDetected] = useState(false);
  const lastUpdateRef = useRef<number>(0);
  const subscriptionRef = useRef<any>(null);

  const handleMotion = useCallback(({ x, y, z }: { x: number; y: number; z: number }) => {
    const now = Date.now();
    if (now - lastUpdateRef.current < UPDATE_INTERVAL_MS) return;
    lastUpdateRef.current = now;

    const totalAcceleration = Math.sqrt(x * x + y * y + z * z);

    if (totalAcceleration > IMPACT_THRESHOLD) {
      console.log(`[Sensor] Impact Detected: ${totalAcceleration.toFixed(2)} m/s2`);
      setFallDetected(true);
      setIsMonitoring(false);
    }
  }, []);

  const startMonitoring = async () => {
    try {
      const subscription = accelerometer.subscribe(handleMotion);
      subscriptionRef.current = subscription;
      setIsMonitoring(true);
      console.log('[System] Fall Detection Started');
    } catch (error) {
      console.error('Failed to start fall detection:', error);
    }
  };

  const stopMonitoring = () => {
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }
    setIsMonitoring(false);
    console.log('[System] Fall Detection Stopped');
  };

  const resetState = () => {
    setFallDetected(false);
    if (!isMonitoring) {
      startMonitoring();
    }
  };

  const simulateFall = () => {
    setFallDetected(true);
  };

  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, []);

  return {
    isMonitoring,
    fallDetected,
    startMonitoring,
    stopMonitoring,
    resetState,
    simulateFall,
  };
};





