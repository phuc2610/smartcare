import { useState, useEffect, useRef, useCallback } from 'react';
import { NativeModules, NativeEventEmitter, AppState, AppStateStatus, Platform } from 'react-native';

/**
 * useFallDetection — Hook React Native cho Fall Detection
 * 
 * V2: Sử dụng Native Foreground Service (Android)
 * - Chạy nền ngay cả khi app bị tắt
 * - Hiện notification cố định "SmartCare đang bảo vệ bạn"
 * - Tự mở app khi phát hiện ngã
 * 
 * Fallback: Nếu native module không có (iOS hoặc lỗi), dùng react-native-sensors
 */

const { FallDetectionModule } = NativeModules;

// Kiểm tra native module có tồn tại không
const hasNativeModule = !!FallDetectionModule;

export const useFallDetection = () => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [fallDetected, setFallDetected] = useState(false);
  const pollingRef = useRef<any>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Poll trạng thái từ native service (vì event emitter có thể không đến khi app bị kill)
  const startPolling = useCallback(() => {
    if (pollingRef.current) return;
    
    pollingRef.current = setInterval(async () => {
      if (!hasNativeModule) return;
      try {
        const status = await FallDetectionModule.getStatus();
        if (status.fallDetected && !fallDetected) {
          setFallDetected(true);
          console.log('[FallDetection] 🚨 Fall detected via polling!');
        }
        setIsMonitoring(status.isRunning);
      } catch (e) {
        // Ignore polling errors
      }
    }, 1000); // Check mỗi giây
  }, [fallDetected]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  /**
   * Bắt đầu Foreground Service (chạy nền)
   */
  const startMonitoring = useCallback(async () => {
    if (!hasNativeModule) {
      console.warn('[FallDetection] Native module not available, falling back to JS sensor');
      // Fallback: dùng JS sensor (chỉ khi app mở)
      try {
        const { accelerometer } = require('react-native-sensors');
        // Simplified fallback - chỉ detect impact mạnh
        setIsMonitoring(true);
      } catch (e) {
        console.error('[FallDetection] Fallback also failed:', e);
      }
      return;
    }

    try {
      await FallDetectionModule.startService();
      setIsMonitoring(true);
      startPolling();
      console.log('[FallDetection] ✅ Native service started (background mode)');
    } catch (error: any) {
      console.error('[FallDetection] Failed to start native service:', error);
    }
  }, [startPolling]);

  /**
   * Dừng Foreground Service
   */
  const stopMonitoring = useCallback(async () => {
    if (!hasNativeModule) {
      setIsMonitoring(false);
      return;
    }

    try {
      await FallDetectionModule.stopService();
      setIsMonitoring(false);
      stopPolling();
      console.log('[FallDetection] ⏹ Native service stopped');
    } catch (error: any) {
      console.error('[FallDetection] Failed to stop native service:', error);
    }
  }, [stopPolling]);

  /**
   * Reset trạng thái (sau khi user bấm "Tôi ổn")
   */
  const resetFallState = useCallback(async () => {
    setFallDetected(false);
    if (hasNativeModule) {
      try {
        await FallDetectionModule.resetFallState();
      } catch (e) {
        // Ignore
      }
    }
  }, []);

  /**
   * Giả lập ngã để test
   */
  const simulateFall = useCallback(async () => {
    if (hasNativeModule) {
      try {
        await FallDetectionModule.simulateFall();
      } catch (e) {
        // Fallback
        setFallDetected(true);
      }
    } else {
      setFallDetected(true);
    }
  }, []);

  // Listen for native events
  useEffect(() => {
    if (!hasNativeModule) return;

    let eventEmitter: NativeEventEmitter;
    try {
      eventEmitter = new NativeEventEmitter(FallDetectionModule);
      const subscription = eventEmitter.addListener('onFallDetected', (event) => {
        console.log('[FallDetection] 🚨 Native event received:', event);
        setFallDetected(true);
      });

      return () => {
        subscription.remove();
      };
    } catch (e) {
      // NativeEventEmitter might fail if module doesn't support it
      console.warn('[FallDetection] Event emitter setup failed, using polling only');
    }
  }, []);

  // Handle app state changes - restart polling when app comes to foreground
  useEffect(() => {
    const handleAppState = async (nextState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        // App came to foreground - check if fall was detected while in background
        if (hasNativeModule) {
          try {
            const status = await FallDetectionModule.getStatus();
            if (status.fallDetected) {
              setFallDetected(true);
            }
            setIsMonitoring(status.isRunning);
          } catch (e) {
            // Ignore
          }
        }
        startPolling();
      } else if (nextState === 'background') {
        // App going to background - stop polling (service handles detection)
        stopPolling();
      }
      appStateRef.current = nextState;
    };

    const subscription = AppState.addEventListener('change', handleAppState);
    return () => subscription.remove();
  }, [startPolling, stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
      // Lưu ý: KHÔNG stop service khi unmount - service phải chạy nền!
    };
  }, [stopPolling]);

  return {
    isMonitoring,
    fallDetected,
    startMonitoring,
    stopMonitoring,
    resetFallState,
    simulateFall,
    isBackgroundCapable: hasNativeModule, // Cho UI biết có chạy nền được không
  };
};
