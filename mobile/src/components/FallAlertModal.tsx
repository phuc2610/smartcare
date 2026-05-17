import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Vibration,
  Linking,
  Platform,
  PermissionsAndroid,
  Animated,
  Dimensions,
} from 'react-native';
import { showError, showAlert } from '../utils/alert';
import { useAuth } from '../contexts/AuthContext';
import { COLORS } from '../utils/constants';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface FallAlertModalProps {
  visible: boolean;
  onDismiss: () => void;
  onTriggerSOS: () => void;
}

const COUNTDOWN_SECONDS = 60; // Apple Watch dùng ~60s
const SCREEN_WIDTH = Dimensions.get('window').width;
const CIRCLE_SIZE = SCREEN_WIDTH * 0.55; // Vòng tròn countdown to
const STROKE_WIDTH = 8;
const RADIUS_CIRCLE = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS_CIRCLE;

// Vibration pattern: rung 1s, nghỉ 0.5s, lặp lại (giống Apple Watch)
const VIBRATION_PATTERN = [0, 800, 400, 800, 400, 800, 1000];

export const FallAlertModal: React.FC<FallAlertModalProps> = ({
  visible,
  onDismiss,
  onTriggerSOS,
}) => {
  const { user } = useAuth();
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [status, setStatus] = useState<'COUNTING' | 'SENDING' | 'SENT' | 'CALLING'>('COUNTING');
  const timerRef = useRef<any>(null);
  const vibrationRef = useRef<any>(null);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  // Start pulse animation cho icon cảnh báo
  const startPulse = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  // Start vibration pattern liên tục
  const startVibration = useCallback(() => {
    // Android: Vibrate theo pattern, repeat ở index 0
    if (Platform.OS === 'android') {
      Vibration.vibrate(VIBRATION_PATTERN, true); // true = repeat
    } else {
      // iOS không hỗ trợ repeat pattern, dùng interval
      Vibration.vibrate(VIBRATION_PATTERN);
      vibrationRef.current = setInterval(() => {
        Vibration.vibrate(VIBRATION_PATTERN);
      }, 4000);
    }
  }, []);

  const stopVibration = useCallback(() => {
    Vibration.cancel();
    if (vibrationRef.current) {
      clearInterval(vibrationRef.current);
      vibrationRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (visible) {
      setCountdown(COUNTDOWN_SECONDS);
      setStatus('COUNTING');

      // Fade in animation
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, damping: 15, stiffness: 150, useNativeDriver: true }),
      ]).start();

      // Bắt đầu rung + pulse
      startVibration();
      startPulse();

      // Countdown timer
      timerRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            handleTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      // Reset khi đóng
      stopVibration();
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      stopVibration();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [visible]);

  const handleTimeout = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setStatus('SENDING');

    try {
      // 1. Gửi SOS qua API
      let location: { latitude: number; longitude: number } | undefined;

      try {
        if (Platform.OS === 'android') {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
              title: 'Vị trí GPS',
              message: 'SmartCare cần vị trí để gửi kèm tín hiệu SOS',
              buttonPositive: 'Cho phép',
              buttonNegative: 'Từ chối',
            }
          );
          if (granted === PermissionsAndroid.RESULTS.GRANTED) {
            const Geolocation = require('@react-native-community/geolocation');
            const pos = await new Promise<any>((resolve, reject) => {
              Geolocation.getCurrentPosition(
                (position: any) => resolve(position),
                (error: any) => reject(error),
                { enableHighAccuracy: false, timeout: 5000, maximumAge: 10000 }
              );
            });
            location = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
          }
        }
      } catch (geoErr) {
        console.log('[FALL ALERT] GPS unavailable, sending SOS without location');
      }

      const { sendSOS } = require('../services/sos.service');
      const result = await sendSOS(location, 'Tự động phát hiện té ngã - Bệnh nhân có thể bất tỉnh');

      setStatus('SENT');
      onTriggerSOS();

      // 2. Sau 3 giây → tự động gọi điện 115 (vì có thể bất tỉnh)
      setTimeout(() => {
        setStatus('CALLING');
        stopVibration();
        // Rung 1 lần cuối báo hiệu đang gọi
        Vibration.vibrate(500);
        Linking.openURL('tel:115');
      }, 3000);

    } catch (error) {
      console.error('[FALL ALERT] SOS failed:', error);
      // Vẫn cố gọi 115 dù API fail
      setStatus('CALLING');
      Linking.openURL('tel:115');
    }
  };

  const handleDismiss = () => {
    stopVibration();
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    // Rung nhẹ 1 lần xác nhận đã huỷ
    Vibration.vibrate(100);
    onDismiss();
  };

  const handleSOSNow = () => {
    stopVibration();
    handleTimeout();
  };

  const handleCall115 = () => {
    stopVibration();
    Vibration.vibrate(200);
    Linking.openURL('tel:115');
  };

  // Tính toán vòng tròn countdown
  const progress = countdown / COUNTDOWN_SECONDS;
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Animated.View style={[styles.content, { transform: [{ scale: scaleAnim }] }]}>

          {status === 'COUNTING' && (
            <>
              {/* Icon cảnh báo pulse */}
              <Animated.View style={[styles.warningIconWrap, { transform: [{ scale: pulseAnim }] }]}>
                <Icon name="warning" size={48} color="#EF4444" />
              </Animated.View>

              <Text style={styles.title}>PHÁT HIỆN TÉ NGÃ!</Text>
              <Text style={styles.subtitle}>
                Hệ thống phát hiện bạn có thể bị ngã.
              </Text>

              {/* Circular Countdown - Apple Watch style */}
              <View style={styles.countdownContainer}>
                {/* SVG-like circle using View tricks */}
                <View style={styles.circleOuter}>
                  <View style={styles.circleTrack} />
                  <View style={styles.circleInner}>
                    <Text style={styles.countdownNumber}>{countdown}</Text>
                    <Text style={styles.countdownUnit}>giây</Text>
                  </View>
                </View>
                <Text style={styles.countdownHint}>
                  Tự động gọi cấp cứu nếu không phản hồi
                </Text>
              </View>

              {/* Nút chính - TO, DỄ BẤM (cho người già) */}
              <TouchableOpacity
                style={styles.dismissButton}
                onPress={handleDismiss}
                activeOpacity={0.8}
              >
                <Icon name="check-circle" size={28} color="#059669" />
                <Text style={styles.dismissButtonText}>TÔI ỔN — HỦY BÁO ĐỘNG</Text>
              </TouchableOpacity>

              {/* Nút gọi SOS ngay */}
              <TouchableOpacity
                style={styles.sosNowButton}
                onPress={handleSOSNow}
                activeOpacity={0.8}
              >
                <Icon name="phone-in-talk" size={22} color="#fff" />
                <Text style={styles.sosNowButtonText}>GỌI CẤP CỨU NGAY</Text>
              </TouchableOpacity>

              {/* Nút gọi 115 trực tiếp */}
              <TouchableOpacity
                style={styles.call115Button}
                onPress={handleCall115}
                activeOpacity={0.7}
              >
                <Text style={styles.call115Text}>📞 Gọi trực tiếp 115</Text>
              </TouchableOpacity>
            </>
          )}

          {status === 'SENDING' && (
            <View style={styles.statusContainer}>
              <Animated.View style={[styles.sendingIcon, { transform: [{ scale: pulseAnim }] }]}>
                <Icon name="cell-tower" size={56} color="#fff" />
              </Animated.View>
              <Text style={styles.statusText}>ĐANG GỬI TÍN HIỆU...</Text>
              <Text style={styles.statusSubtext}>
                Gửi vị trí và thông tin đến bác sĩ và người thân
              </Text>
            </View>
          )}

          {status === 'SENT' && (
            <View style={styles.statusContainer}>
              <View style={styles.sentIconWrap}>
                <Icon name="check" size={56} color="#fff" />
              </View>
              <Text style={styles.statusText}>ĐÃ GỬI CẢNH BÁO!</Text>
              <Text style={styles.statusSubtext}>
                Bác sĩ và người thân đã nhận vị trí của bạn.{'\n'}
                Đang chuyển sang gọi cấp cứu...
              </Text>
            </View>
          )}

          {status === 'CALLING' && (
            <View style={styles.statusContainer}>
              <View style={styles.callingIconWrap}>
                <Icon name="phone-in-talk" size={56} color="#fff" />
              </View>
              <Text style={styles.statusText}>ĐANG GỌI CẤP CỨU</Text>
              <Text style={styles.statusSubtext}>
                Hãy giữ bình tĩnh và chờ trợ giúp.
              </Text>
              <TouchableOpacity style={styles.closeButton} onPress={handleDismiss}>
                <Text style={styles.closeButtonText}>Đóng</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(127, 29, 29, 0.97)', // Deep red
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    width: '100%',
    alignItems: 'center',
  },

  // Warning icon
  warningIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    // Glow effect
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
  },

  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 17,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 24,
  },

  // Circular Countdown
  countdownContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  circleOuter: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: STROKE_WIDTH,
    borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  circleTrack: {
    position: 'absolute',
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
  },
  circleInner: {
    alignItems: 'center',
  },
  countdownNumber: {
    fontSize: 72,
    fontWeight: '200', // Ultra-thin giống Apple Watch
    color: '#fff',
    lineHeight: 80,
  },
  countdownUnit: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
    marginTop: -4,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  countdownHint: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    fontWeight: '500',
  },

  // Buttons - TO, DỄ BẤM cho người già
  dismissButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 24,
    width: '100%',
    marginBottom: 12,
    gap: 10,
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  dismissButtonText: {
    color: '#059669',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  sosNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 24,
    width: '100%',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    gap: 10,
  },
  sosNowButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  call115Button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  call115Text: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 15,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  // Status screens
  statusContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  sendingIcon: {
    marginBottom: 24,
  },
  sentIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    // Glow
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
  },
  callingIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
  },
  statusText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 1,
  },
  statusSubtext: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  closeButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 24,
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
