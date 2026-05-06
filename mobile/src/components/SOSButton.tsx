import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { showSuccess, showError } from '../utils/alert';
import { useAuth } from '../contexts/AuthContext';
import { getCurrentPositionAsync } from '../services/location.service';
import { triggerEmergencySOS } from '../services/database.service';
import { EMERGENCY_PHONE } from '../utils/constants';
import { COLORS } from '../utils/constants';

export const SOSButton = () => {
  const { user } = useAuth();
  const [isPressing, setIsPressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'IDLE' | 'SENDING' | 'SENT' | 'ERROR'>('IDLE');
  const intervalRef = useRef<any>(null);
  const PRESS_DURATION = 3000;
  const UPDATE_INTERVAL = 50;

  const handlePressStart = () => {
    if (status !== 'IDLE') return;
    setIsPressing(true);

    let currentElapsed = 0;
    intervalRef.current = setInterval(() => {
      currentElapsed += UPDATE_INTERVAL;
      const percentage = Math.min((currentElapsed / PRESS_DURATION) * 100, 100);
      setProgress(percentage);

      if (currentElapsed >= PRESS_DURATION) {
        clearInterval(intervalRef.current);
        triggerAction();
      }
    }, UPDATE_INTERVAL);
  };

  const handlePressEnd = () => {
    if (status !== 'IDLE') return;
    setIsPressing(false);
    setProgress(0);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  const triggerAction = async () => {
    setIsPressing(false);
    setStatus('SENDING');
    setProgress(100);

    try {
      const coords = await getCurrentPositionAsync();
      if (user) {
        await triggerEmergencySOS(user, coords);
        setStatus('SENT');
        showSuccess('Đã gửi SOS', 'Người thân đã nhận được vị trí của bạn.');
        setTimeout(() => {
          setStatus('IDLE');
          setProgress(0);
        }, 3000);
      }
    } catch (error: any) {
      showError('Lỗi', `Không thể gửi SOS: ${error.message}`);
      setStatus('ERROR');
      setTimeout(() => setStatus('IDLE'), 2000);
    }
  };

  const handleCallEmergency = () => {
    Linking.openURL(`tel:${EMERGENCY_PHONE}`);
  };

  return (
    <View style={styles.container}>
      {status === 'IDLE' && (
        <Text style={styles.instruction}>
          {isPressing ? 'Giữ nguyên...' : 'Nhấn giữ 3s để gọi SOS'}
        </Text>
      )}

      <TouchableOpacity
        style={[
          styles.button,
          status === 'SENT' && styles.buttonSuccess,
          status === 'ERROR' && styles.buttonError,
          isPressing && styles.buttonPressing,
        ]}
        onPressIn={handlePressStart}
        onPressOut={handlePressEnd}
        activeOpacity={0.8}
      >
        {isPressing && (
          <View style={[styles.progressRing, { width: `${progress}%` }]} />
        )}
        <Text style={styles.buttonText}>
          {status === 'SENT' ? 'ĐÃ GỬI' : status === 'SENDING' ? '...' : 'SOS'}
        </Text>
      </TouchableOpacity>

      {status === 'IDLE' && (
        <TouchableOpacity style={styles.callButton} onPress={handleCallEmergency}>
          <Text style={styles.callButtonText}>Gọi {EMERGENCY_PHONE}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 24,
  },
  instruction: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 8,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  button: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.error,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonPressing: {
    transform: [{ scale: 1.1 }],
  },
  buttonSuccess: {
    backgroundColor: COLORS.success,
  },
  buttonError: {
    backgroundColor: '#6b7280',
  },
  progressRing: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 40,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  callButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.background,
  },
  callButtonText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
  },
});





