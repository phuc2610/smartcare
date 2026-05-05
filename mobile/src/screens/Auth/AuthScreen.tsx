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
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types';
import { COLORS } from '../../utils/constants';
import { Logo } from '../../components/Logo';

type Screen = 'LOGIN' | 'REGISTER' | 'REGISTER_OTP';

// Move PasswordInput outside to prevent re-creation on every render
const PasswordInput = React.memo(({ 
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
      autoCorrect={false}
    />
    <TouchableOpacity onPress={onToggleVisibility} style={styles.eyeIcon}>
      <Icon 
        name={showPassword ? 'visibility' : 'visibility-off'} 
        size={24} 
        color={COLORS.textSecondary} 
      />
    </TouchableOpacity>
  </View>
));

export const AuthScreen = ({ navigation }: any) => {
  const { signIn, signUp, verify } = useAuth();
  const [screen, setScreen] = useState<Screen>('LOGIN');

  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.PATIENT);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // OTP state
  const [confirmObj, setConfirmObj] = useState<any>(null);
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
      setError('Vui lòng nhập số điện thoại trước');
      return;
    }

    setOtpLoading(true);
    setError('');
    try {
      const formattedPhone = formatPhoneForFirebase(phone);
      const confirmation = await auth().signInWithPhoneNumber(formattedPhone);
      setConfirmObj(confirmation);
      setOtpCountdown(300); // 5 minutes = 300 seconds
    } catch (err: any) {
      console.log('Firebase request OTP error:', err);
      setError(err?.message || 'Không thể gửi mã OTP qua Firebase');
    } finally {
      setOtpLoading(false);
    }
  };

  const formatCountdown = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleLogin = async () => {
    if (!phone || !password) {
      setError('Vui lòng nhập đầy đủ thông tin');
      return;
    }
    
    setError('');
    setLoading(true);
    
    try {
      await signIn(phone, password);
    } catch (err: any) {
      const errorMessage = err?.message || err?.response?.data?.error || 'Đăng nhập thất bại';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!name || !phone || !password || !confirmPassword) {
      setError('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    
    const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/;
    if (!phoneRegex.test(phone)) {
      setError('Số điện thoại không hợp lệ');
      return;
    }

    setError('');
    setLoading(true);
    
    try {
      // Step 1: Request OTP via Firebase before creating user on server
      const formattedPhone = formatPhoneForFirebase(phone);
      const confirmation = await auth().signInWithPhoneNumber(formattedPhone);
      setConfirmObj(confirmation);
      
      setOtpCountdown(300); // 5 minutes
      setScreen('REGISTER_OTP');
    } catch (err: any) {
      console.log('Firebase OTP error:', err);
      const errorMessage = err?.message || 'Không thể gửi SMS. Vui lòng kiểm tra lại số điện thoại.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) { // Firebase OTPs are usually 6 digits
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
      // Step 2: Verify OTP with Firebase
      await confirmObj.confirm(otp);
      
      // Get the Firebase ID Token
      const currentUser = auth().currentUser;
      if (!currentUser) throw new Error('Không thể lấy thông tin user từ Firebase');
      
      const firebaseIdToken = await currentUser.getIdToken();
      
      // Step 3: Call our backend to register and get JWT
      const formattedPhone = formatPhoneForFirebase(phone);
      await signUp({ name, phone: formattedPhone, password, role, firebaseIdToken });
    } catch (err: any) {
      console.log('Verify error:', err);
      const errorMessage = err?.code === 'auth/invalid-verification-code' 
        ? 'Mã xác thực không đúng' 
        : err?.message || err?.response?.data?.error || 'Xác thực thất bại';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };


  const otpInputRef = useRef<TextInput>(null);

  const OTPInput = () => (
    <View style={styles.otpWrapper}>
      <View style={styles.otpContainer}>
        <TextInput
          ref={otpInputRef}
          style={styles.otpInput}
          placeholder="Nhập mã OTP"
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      enabled={screen !== 'REGISTER_OTP'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
      >
        {screen === 'LOGIN' && (
          <View style={styles.form}>
            <Logo size="large" containerStyle={styles.logoContainer} />
            <Text style={styles.title}>Đăng nhập</Text>
            <Text style={styles.subtitle}>Chào mừng quay trở lại SmartCare</Text>

            <TextInput
              style={styles.input}
              placeholder="Số điện thoại"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoCapitalize="none"
            />

            <PasswordInput
              value={password}
              onChangeText={setPassword}
              placeholder="Mật khẩu"
              showPassword={showPassword}
              onToggleVisibility={() => setShowPassword(!showPassword)}
            />

            <TouchableOpacity onPress={() => {
              if (navigation) {
                navigation.navigate('ForgotPassword');
              }
            }}>
              <Text style={styles.forgotPasswordText}>Quên mật khẩu?</Text>
            </TouchableOpacity>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Đăng nhập</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={() => {
                setScreen('REGISTER');
                setError('');
              }}
            >
              <Text style={styles.secondaryButtonText}>Tạo tài khoản mới</Text>
            </TouchableOpacity>
          </View>
        )}

        {screen === 'REGISTER' && (
          <View style={styles.form}>
            <Logo size="large" containerStyle={styles.logoContainer} />
            <Text style={styles.title}>Đăng ký</Text>
            <Text style={styles.subtitle}>Tạo tài khoản để quản lý sức khỏe</Text>

            <TextInput
              style={styles.input}
              placeholder="Họ và tên"
              value={name}
              onChangeText={setName}
            />

            <TextInput
              style={styles.input}
              placeholder="Số điện thoại"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoCapitalize="none"
            />

            <PasswordInput
              value={password}
              onChangeText={setPassword}
              placeholder="Mật khẩu"
              showPassword={showPassword}
              onToggleVisibility={() => setShowPassword(!showPassword)}
            />

            <PasswordInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Xác nhận mật khẩu"
              showPassword={showConfirmPassword}
              onToggleVisibility={() => setShowConfirmPassword(!showConfirmPassword)}
            />

            <View style={styles.roleSelector}>
              <TouchableOpacity
                style={[styles.roleButton, role === UserRole.PATIENT && styles.roleButtonActive]}
                onPress={() => setRole(UserRole.PATIENT)}
              >
                <Text
                  style={[
                    styles.roleButtonText,
                    role === UserRole.PATIENT && styles.roleButtonTextActive,
                  ]}
                >
                  Người bệnh
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.roleButton, role === UserRole.CAREGIVER && styles.roleButtonActive]}
                onPress={() => setRole(UserRole.CAREGIVER)}
              >
                <Text
                  style={[
                    styles.roleButtonText,
                    role === UserRole.CAREGIVER && styles.roleButtonTextActive,
                  ]}
                >
                  Người thân
                </Text>
              </TouchableOpacity>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Tiếp tục</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => {
              setScreen('LOGIN');
              setError('');
            }}>
              <Text style={styles.linkText}>Đã có tài khoản? Đăng nhập</Text>
            </TouchableOpacity>
          </View>
        )}

        {screen === 'REGISTER_OTP' && (
          <View style={styles.form}>
            <Logo size="medium" containerStyle={styles.logoContainer} />
            <Text style={styles.title}>Xác thực tài khoản</Text>
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
              disabled={loading || otp.length !== 6}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Xác thực</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => {
              setScreen('REGISTER');
              setOtp('');
              setError('');
            }}>
              <Text style={styles.linkText}>Quay lại</Text>
            </TouchableOpacity>
          </View>
        )}

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
  otpCountdown: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  otpResendText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  roleSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  roleButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#f3f4f6',
    backgroundColor: 'transparent',
  },
  roleButtonActive: {
    borderColor: COLORS.secondary,
    backgroundColor: '#eef2ff',
  },
  roleButtonText: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 'bold',
    color: '#9ca3af',
  },
  roleButtonTextActive: {
    color: COLORS.secondary,
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
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#c7d2fe',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButtonText: {
    color: COLORS.secondary,
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
  forgotPasswordText: {
    textAlign: 'right',
    color: COLORS.primary,
    fontSize: 14,
    marginBottom: 16,
  },
  logoContainer: {
    marginBottom: 24,
    marginTop: 16,
  },
});
