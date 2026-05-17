import { useState, useEffect, useRef, useCallback } from 'react';
import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { HeartRateModule } = NativeModules;
const hasNative = !!HeartRateModule;

export interface HeartRateData {
  redValue: number;
  frameIndex: number;
  elapsed: number;
  bpm?: number;
  valid?: boolean;
}

export interface HeartRateResult {
  bpm: number;
  sampleCount: number;
  duration: number;
  valid: boolean;
}

type MeasurementPhase = 'idle' | 'measuring' | 'done' | 'error';

export const useHeartRate = () => {
  const [phase, setPhase] = useState<MeasurementPhase>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [realtimeBpm, setRealtimeBpm] = useState<number | null>(null);
  const [result, setResult] = useState<HeartRateResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [signalQuality, setSignalQuality] = useState<'none' | 'low' | 'good'>('none');
  const [redValues, setRedValues] = useState<number[]>([]);

  const timerRef = useRef<any>(null);
  const emitterRef = useRef<NativeEventEmitter | null>(null);
  const subscriptionRef = useRef<any>(null);
  const startTimeRef = useRef<number>(0);
  const MEASURE_DURATION = 30; // Đo 30 giây

  const start = useCallback(async () => {
    if (!hasNative) {
      setErrorMsg('Tính năng này chỉ hỗ trợ Android');
      setPhase('error');
      return;
    }

    try {
      setPhase('measuring');
      setElapsed(0);
      setRealtimeBpm(null);
      setResult(null);
      setErrorMsg(null);
      setSignalQuality('none');
      setRedValues([]);
      startTimeRef.current = Date.now();

      // Setup event listener
      emitterRef.current = new NativeEventEmitter(HeartRateModule);
      subscriptionRef.current = emitterRef.current.addListener(
        'onHeartRateData',
        (data: HeartRateData) => {
          // Cập nhật waveform
          setRedValues(prev => {
            const next = [...prev, data.redValue];
            return next.length > 150 ? next.slice(-150) : next; // giữ 150 điểm
          });

          // Đánh giá chất lượng tín hiệu
          if (data.frameIndex < 10) {
            setSignalQuality('none');
          } else if (data.frameIndex < 30) {
            setSignalQuality('low');
          } else {
            setSignalQuality('good');
          }

          // Realtime BPM
          if (data.bpm && data.valid) {
            setRealtimeBpm(data.bpm);
          }
        }
      );

      await HeartRateModule.startMeasurement();

      // Countdown timer
      timerRef.current = setInterval(() => {
        const e = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setElapsed(e);
        if (e >= MEASURE_DURATION) {
          stop();
        }
      }, 500);

    } catch (err: any) {
      setPhase('error');
      setErrorMsg(err.message || 'Không thể bắt đầu đo');
    }
  }, []);

  const stop = useCallback(async () => {
    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    // Remove listener
    if (subscriptionRef.current) {
      subscriptionRef.current.remove();
      subscriptionRef.current = null;
    }

    if (!hasNative) return;

    try {
      const result = await HeartRateModule.stopMeasurement();
      setResult(result);
      setPhase('done');
    } catch (err: any) {
      setErrorMsg(err.message || 'Không đủ dữ liệu. Hãy đặt ngón tay chắc vào camera.');
      setPhase('error');
    }
  }, []);

  const reset = useCallback(() => {
    setPhase('idle');
    setElapsed(0);
    setRealtimeBpm(null);
    setResult(null);
    setErrorMsg(null);
    setSignalQuality('none');
    setRedValues([]);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (subscriptionRef.current) subscriptionRef.current.remove();
      if (hasNative && HeartRateModule.stopMeasurement) {
        HeartRateModule.stopMeasurement().catch(() => {});
      }
    };
  }, []);

  return {
    phase,
    elapsed,
    realtimeBpm,
    result,
    errorMsg,
    signalQuality,
    redValues,
    start,
    stop,
    reset,
    measureDuration: MEASURE_DURATION,
    progress: Math.min(elapsed / MEASURE_DURATION, 1),
  };
};
