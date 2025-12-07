import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS } from '../../utils/constants';
import { forgotPassword, resetPassword } from '../../services/auth.service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../../utils/constants';
import { useAuth } from '../../contexts/AuthContext';

type Step = 'PHONE' | 'OTP' | 'NEW_PASSWORD';

export const ForgotPasswordScreen = ({ navigation }: any) => {
  const { updateProfile } = useAuth();
  const [step, setStep] = useState<Step>('PHONE');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // OTP state
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [otpLoading, setOtpLoading] = useState(false);
  const countdownInterval = useRef<NodeJS.Timeout | null>(null);

  // Cleanup countdown on unmount
  useEffect(() => {
    return () => {
      if (countdownInterval.current) {
        clearInterval(countdownInterval.current);
      }
    };
  }, []);

  // Countdown timer
  useEffect(() => {
    if (otpCountdown > 0) {
      countdownInterval.current = setInterval(() => {
        setOtpCountdown((prev) => {
          if (prev <= 1) {
            if (countdownInterval.current) {
              clearInterval(countdownInterval.current);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (countdownInterval.current) {
        clearInterval(countdownInterval.current);
      }
    }

    return () => {
      if (countdownInterval.current) {
        clearInterval(countdownInterval.current);
      }
    };
  }, [otpCountdown]);

  const formatCountdown = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRequestOTP = async () => {
    if (!phone) {
      setError('Vui lòng nhập số điện thoại');
      return;
    }

    setOtpLoading(true);
    setError('');
    try {
      await forgotPassword(phone);
      setOtpCountdown(300); // 5 minutes
      setStep('OTP');
    } catch (err: any) {
      setError(err?.message || 'Không thể gửi mã OTP');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 4) {
      setError('Vui lòng nhập mã OTP 4 số');
      return;
    }

    setError('');
    setStep('NEW_PASSWORD');
  };

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      setError('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    if (newPassword.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    setError('');
    setLoading(true);
    
    try {
      const result = await resetPassword(phone, otp, newPassword);
      
      // Save auth data
      await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, result.token);
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(result.user));
      
      // Update context
      updateProfile(result.user);
      
      // Navigate to home
      navigation?.navigate('MainTabs');
    } catch (err: any) {
      const errorMessage = err?.message || err?.response?.data?.error || 'Đổi mật khẩu thất bại';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const PasswordInput = ({ 
    value, 
    onChangeText, 
    placeholder, 
    showPassword, 
    onToggleVisibility 
  }: {
    value: string;
    onChangeText: (text: string) => void;
    placeholder: string;
    showPassword: boolean;
    onToggleVisibility: () => void;
  }) => (
    <View style={styles.passwordContainer}>
      <TextInput
        style={styles.passwordInput}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!showPassword}
        autoCapitalize="none"
      />
      <TouchableOpacity onPress={onToggleVisibility} style={styles.eyeIcon}>
        <Icon 
          name={showPassword ? 'visibility' : 'visibility-off'} 
          size={24} 
          color={COLORS.textSecondary} 
        />
      </TouchableOpacity>
    </View>
  );

  const OTPInput = () => (
    <View style={styles.otpContainer}>
      <TextInput
        style={styles.otpInput}
        placeholder="Nhập mã OTP"
        value={otp}
        onChangeText={(text) => setOtp(text.replace(/[^0-9]/g, '').slice(0, 4))}
        keyboardType="number-pad"
        maxLength={4}
      />
      <TouchableOpacity
        onPress={handleRequestOTP}
        disabled={otpCountdown > 0 || otpLoading}
        style={styles.otpButton}
      >
        {otpLoading ? (
          <ActivityIndicator size="small" color={COLORS.primary} />
        ) : otpCountdown > 0 ? (
          <Text style={styles.otpCountdown}>{formatCountdown(otpCountdown)}</Text>
        ) : (
          <Icon name="mail" size={24} color={COLORS.primary} />
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.form}>
          {step === 'PHONE' && (
            <>
              <Text style={styles.title}>Quên mật khẩu</Text>
              <Text style={styles.subtitle}>
                Nhập số điện thoại để nhận mã OTP
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Số điện thoại"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoCapitalize="none"
              />

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={handleRequestOTP}
                disabled={loading || otpLoading || !phone}
              >
                {loading || otpLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Tiếp tục</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => navigation?.goBack()}>
                <Text style={styles.linkText}>Quay lại đăng nhập</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'OTP' && (
            <>
              <Text style={styles.title}>Xác thực OTP</Text>
              <Text style={styles.subtitle}>
                Mã OTP đã được gửi đến số điện thoại {phone}
              </Text>
              <Text style={styles.subtitleSmall}>
                Vui lòng kiểm tra log console để xem mã OTP
              </Text>

              <OTPInput />

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={handleVerifyOTP}
                disabled={otp.length !== 4}
              >
                <Text style={styles.buttonText}>Xác thực</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => {
                setStep('PHONE');
                setOtp('');
                setError('');
              }}>
                <Text style={styles.linkText}>Quay lại</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'NEW_PASSWORD' && (
            <>
              <Text style={styles.title}>Đặt mật khẩu mới</Text>
              <Text style={styles.subtitle}>
                Vui lòng nhập mật khẩu mới cho tài khoản
              </Text>

              <PasswordInput
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Mật khẩu mới"
                showPassword={showPassword}
                onToggleVisibility={() => setShowPassword(!showPassword)}
              />

              <PasswordInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Xác nhận mật khẩu mới"
                showPassword={showConfirmPassword}
                onToggleVisibility={() => setShowConfirmPassword(!showConfirmPassword)}
              />

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={handleResetPassword}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Đổi mật khẩu</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => {
                setStep('OTP');
                setNewPassword('');
                setConfirmPassword('');
                setError('');
              }}>
                <Text style={styles.linkText}>Quay lại</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  form: {
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitleSmall: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    fontStyle: 'italic',
  },
  input: {
    width: '100%',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    marginBottom: 16,
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 16,
  },
  otpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    marginBottom: 16,
  },
  otpInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
  },
  otpButton: {
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 50,
  },
  otpCountdown: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  button: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  error: {
    color: COLORS.error,
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 14,
  },
  linkText: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontSize: 14,
    marginTop: 12,
  },
});

