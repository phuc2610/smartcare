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
import auth from '@react-native-firebase/auth';
import { COLORS } from '../../utils/constants';
import { forgotPassword, resetPassword } from '../../services/auth.service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../../utils/constants';
import { useAuth } from '../../contexts/AuthContext';
import { Logo } from '../../components/Logo';

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
  const [confirmObj, setConfirmObj] = useState<any>(null);
  const [firebaseIdToken, setFirebaseIdToken] = useState('');
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

  const formatPhoneForFirebase = (p: string) => {
    let cleaned = p.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '84' + cleaned.slice(1);
    } else if (!cleaned.startsWith('84')) {
      cleaned = '84' + cleaned;
    }
    return '+' + cleaned;
  };

  const handleRequestOTP = async () => {
    if (!phone) {
      setError('Vui lòng nhập số điện thoại');
      return;
    }

    setOtpLoading(true);
    setError('');
    try {
      // Validate phone number exists in our database
      await forgotPassword(phone);
      
      // Request Firebase OTP
      const formattedPhone = formatPhoneForFirebase(phone);
      const confirmation = await auth().signInWithPhoneNumber(formattedPhone);
      setConfirmObj(confirmation);
      
      setOtpCountdown(300); // 5 minutes
      setStep('OTP');
    } catch (err: any) {
      console.log('Firebase forgot password OTP error:', err);
      setError(err?.message || 'Không thể gửi mã OTP qua Firebase');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      setError('Vui lòng nhập mã OTP 6 số');
      return;
    }

    if (!confirmObj) {
      setError('Lỗi phiên làm việc, vui lòng quay lại và thử lại');
      return;
    }

    setError('');
    setLoading(true);
    
    try {
      // Verify OTP with Firebase
      await confirmObj.confirm(otp);
      
      const currentUser = auth().currentUser;
      if (!currentUser) throw new Error('Không thể lấy thông tin user từ Firebase');
      
      const token = await currentUser.getIdToken();
      setFirebaseIdToken(token);
      
      setStep('NEW_PASSWORD');
    } catch (err: any) {
      console.log('Verify error:', err);
      const errorMessage = err?.code === 'auth/invalid-verification-code' 
        ? 'Mã xác thực không đúng' 
        : err?.message || 'Xác thực thất bại';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
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
      const formattedPhone = formatPhoneForFirebase(phone);
      const result = await resetPassword(formattedPhone, firebaseIdToken, newPassword);
      
      // Save auth data
      await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, result.token);
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(result.user));
      
      // Update context -> RootNavigator will switch to Main stack
      updateProfile(result.user);

      // Ensure we land on the authenticated stack
      navigation?.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });
    } catch (err: any) {
      const errorMessage = err?.message || err?.response?.data?.error || 'Đổi mật khẩu thất bại';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };


  const otpInputRef = useRef<TextInput>(null);

  const renderOTPInput = () => (
    <View style={styles.otpWrapper}>
      <View style={styles.otpContainer}>
        <TextInput
          ref={otpInputRef}
          style={styles.otpInput}
          placeholder="Nhập mã OTP"
          placeholderTextColor={COLORS.textSecondary}
          value={otp}
          onChangeText={(text) => {
            const cleanedText = text.replace(/[^0-9]/g, '').slice(0, 6);
            setOtp(cleanedText);
          }}
          keyboardType="number-pad"
          maxLength={6}
          autoFocus={true}
          blurOnSubmit={false}
          selectTextOnFocus={false}
          returnKeyType="done"
        />
      </View>
      <TouchableOpacity
        onPress={handleRequestOTP}
        disabled={otpCountdown > 0 || otpLoading}
        style={styles.otpButton}
        activeOpacity={0.7}
      >
        {otpLoading ? (
          <ActivityIndicator size="small" color={COLORS.primary} />
        ) : otpCountdown > 0 ? (
          <Text style={styles.otpCountdown}>{formatCountdown(otpCountdown)}</Text>
        ) : (
          <Text style={styles.otpResendText}>Gửi lại</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const PasswordInput = ({
    value,
    onChangeText,
    placeholder,
    showPasswordValue,
    onToggleVisibility,
  }: {
    value: string;
    onChangeText: (text: string) => void;
    placeholder: string;
    showPasswordValue: boolean;
    onToggleVisibility: () => void;
  }) => (
    <View style={styles.passwordContainer}>
      <TextInput
        style={styles.passwordInput}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textSecondary}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!showPasswordValue}
        autoCapitalize="none"
        returnKeyType="next"
      />
      <TouchableOpacity onPress={onToggleVisibility} style={styles.eyeIcon}>
        <Icon
          name={showPasswordValue ? 'visibility' : 'visibility-off'}
          size={24}
          color={COLORS.textSecondary}
        />
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      enabled={step !== 'OTP'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
      >
        <View style={styles.form}>
          {step === 'PHONE' && (
            <>
              <Logo size="large" containerStyle={styles.logoContainer} />
              <Text style={styles.title}>Quên mật khẩu</Text>
              <Text style={styles.subtitle}>
                Nhập số điện thoại để nhận mã OTP
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Số điện thoại"
                placeholderTextColor={COLORS.textSecondary}
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
              <Logo size="medium" containerStyle={styles.logoContainer} />
              <Text style={styles.title}>Xác thực OTP</Text>
              <Text style={styles.subtitle}>
                Mã OTP đã được gửi đến số điện thoại {phone}
              </Text>
              <Text style={styles.subtitleSmall}>
                Nếu không nhận được mã, vui lòng nhấn Gửi lại
              </Text>

              {renderOTPInput()}

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={handleVerifyOTP}
                disabled={loading || otp.length !== 6}
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
              <Logo size="medium" containerStyle={styles.logoContainer} />
              <Text style={styles.title}>Đặt mật khẩu mới</Text>
              <Text style={styles.subtitle}>
                Vui lòng nhập mật khẩu mới cho tài khoản
              </Text>

              <PasswordInput
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Mật khẩu mới"
                showPasswordValue={showPassword}
                onToggleVisibility={() => setShowPassword(!showPassword)}
              />

              <PasswordInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Xác nhận mật khẩu mới"
                showPasswordValue={showConfirmPassword}
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
    color: COLORS.text,
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
    color: COLORS.text,
  },
  eyeIcon: {
    padding: 16,
  },
  otpWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  otpContainer: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
  },
  otpInput: {
    width: '100%',
    padding: 16,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 4,
    color: COLORS.text,
  },
  otpButton: {
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
  },
  otpResendText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
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
  logoContainer: {
    marginBottom: 24,
    marginTop: 16,
  },
});

