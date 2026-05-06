import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { showError } from '../utils/alert';
import { useAuth } from '../contexts/AuthContext';
import { getCurrentPositionAsync } from '../services/location.service';
import { triggerEmergencySOS } from '../services/database.service';
import { COLORS } from '../utils/constants';

interface FallAlertModalProps {
  visible: boolean;
  onDismiss: () => void;
  onTriggerSOS: () => void;
}

const COUNTDOWN_SECONDS = 30;

export const FallAlertModal: React.FC<FallAlertModalProps> = ({
  visible,
  onDismiss,
  onTriggerSOS,
}) => {
  const { user } = useAuth();
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [status, setStatus] = useState<'COUNTING' | 'SENDING' | 'SENT'>('COUNTING');
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (visible) {
      setCountdown(COUNTDOWN_SECONDS);
      setStatus('COUNTING');

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
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
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
      if (user) {
        const coords = await getCurrentPositionAsync();
        await triggerEmergencySOS(user, coords);
        setStatus('SENT');
        onTriggerSOS();
      }
    } catch (error) {
      showError('Lỗi', 'Không thể gửi SOS');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        {status === 'COUNTING' && (
          <>
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>⚠️</Text>
            </View>
            <Text style={styles.title}>PHÁT HIỆN TÉ NGÃ!</Text>
            <Text style={styles.subtitle}>
              Hệ thống sẽ gửi vị trí cho người thân sau{' '}
              <Text style={styles.countdown}>{countdown}s</Text>
            </Text>

            <TouchableOpacity style={styles.cancelButton} onPress={onDismiss}>
              <Text style={styles.cancelButtonText}>TÔI ỔN, HỦY BÁO ĐỘNG</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sosButton} onPress={handleTimeout}>
              <Text style={styles.sosButtonText}>GỌI SOS NGAY</Text>
            </TouchableOpacity>
          </>
        )}

        {status === 'SENDING' && (
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>ĐANG GỬI VỊ TRÍ...</Text>
          </View>
        )}

        {status === 'SENT' && (
          <View style={styles.statusContainer}>
            <Text style={styles.statusIcon}>✓</Text>
            <Text style={styles.statusText}>ĐÃ GỬI BÁO ĐỘNG!</Text>
            <Text style={styles.statusSubtext}>Người thân đã nhận được vị trí của bạn.</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onDismiss}>
              <Text style={styles.closeButtonText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(239, 68, 68, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 32,
    textAlign: 'center',
  },
  countdown: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  cancelButtonText: {
    color: COLORS.error,
    fontSize: 16,
    fontWeight: 'bold',
  },
  sosButton: {
    backgroundColor: '#991b1b',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  sosButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusContainer: {
    alignItems: 'center',
  },
  statusIcon: {
    fontSize: 64,
    color: '#fff',
    marginBottom: 16,
  },
  statusText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  statusSubtext: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 24,
  },
  closeButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});





