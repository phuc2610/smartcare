import React, { useState, useEffect, useCallback } from 'react';
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
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types';
import { COLORS } from '../../utils/constants';
import { Logo } from '../../components/Logo';
import { getSavedPhone, sendOTP as sendOTPAPI, verifyOTP as verifyOTPAPI } from '../../services/auth.service';

type Screen = 'LOGIN' | 'REGISTER' | 'OTP_VERIFY' | 'SETUP_ACCOUNT';

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
      placeholderTextColor={COLORS.textSecondary}
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
  const { signIn, completeRegistration, signInWithGoogle } = useAuth();
  const [screen, setScreen] = useState<Screen>('LOGIN');

  // Form state
  const [identifier, setIdentifier] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Setup state
  const [role, setRole] = useState<UserRole>(UserRole.PATIENT);
  const [medicalCondition, setMedicalCondition] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');

  // OTP state
  const [otpCode, setOtpCode] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [savedPhoneHint, setSavedPhoneHint] = useState('');

  // Load saved phone/email on mount
  useEffect(() => {
    const loadSavedIdentifier = async () => {
      const saved = await getSavedPhone();
      if (saved) {
        setIdentifier(saved);
        setSavedPhoneHint(saved);
      }
    };
    loadSavedIdentifier();
  }, []);

  // OTP countdown timer
  useEffect(() => {
    if (otpCountdown <= 0) return;
    const timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [otpCountdown]);

  const handleLogin = async () => {
    if (!identifier || !password) {
      setError('Vui lòng nhập đầy đủ thông tin');
      return;
    }
    
    setError('');
    setLoading(true);
    
    try {
      // Tự động định dạng SĐT nếu người dùng nhập số
      let formattedIdentifier = identifier.trim();
      const isPhone = /^[0-9+]+$/.test(formattedIdentifier);
      
      if (isPhone && !formattedIdentifier.includes('@')) {
        let cleaned = formattedIdentifier.replace(/\D/g, '');
        if (cleaned.startsWith('0')) {
          cleaned = '84' + cleaned.slice(1);
        } else if (!cleaned.startsWith('84')) {
          cleaned = '84' + cleaned;
        }
        formattedIdentifier = '+' + cleaned;
      }

      await signIn(formattedIdentifier, password);
    } catch (err: any) {
      const errorMessage = err?.message || err?.response?.data?.error || 'Đăng nhập thất bại';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Email không hợp lệ');
      return;
    }

    setError('');
    setLoading(true);
    
    try {
      await sendOTPAPI(email);
      setOtpCountdown(60);
      setScreen('OTP_VERIFY');
    } catch (err: any) {
      let errorMessage = 'Không thể gửi OTP. Vui lòng thử lại.';
      if (err?.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpCode || otpCode.length !== 6) {
      setError('Vui lòng nhập mã OTP 6 số');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const res = await verifyOTPAPI(email, otpCode);
      setVerificationToken(res.verificationToken);
      setScreen('SETUP_ACCOUNT');
    } catch (err: any) {
      setError(err?.message || 'Mã OTP không đúng hoặc đã hết hạn');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async () => {
    setError('');
    setOtpSending(true);
    try {
      await sendOTPAPI(email);
      setOtpCountdown(60);
    } catch (err: any) {
      setError(err?.message || 'Không thể gửi lại mã OTP');
    } finally {
      setOtpSending(false);
    }
  };

  const handleSetupComplete = async (skip: boolean = false) => {
    setError('');
    setLoading(true);

    try {
      const registerData = {
        name,
        email,
        password,
        verificationToken,
      };

      let setupData: import('../../services/auth.service').SetupAccountData = { role };

      if (!skip && role === UserRole.PATIENT) {
        if (height) setupData.height = Number(height);
        if (weight) setupData.weight = Number(weight);
        if (medicalCondition) setupData.medicalCondition = medicalCondition;
      }

      await completeRegistration(registerData, setupData);
    } catch (err: any) {
      setError(err?.message || 'Đăng ký thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err?.message || 'Đăng nhập Google thất bại');
    } finally {
      setLoading(false);
    }
  };

  const renderOTPInput = () => (
    <View style={styles.otpContainer}>
      <TextInput
        style={styles.otpInput}
        placeholder="Nhập mã 6 số"
        placeholderTextColor={COLORS.textSecondary}
        value={otpCode}
        onChangeText={(text) => setOtpCode(text.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        textAlign="center"
        autoFocus
      />
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
      >
        {/* ===== LOGIN SCREEN ===== */}
        {screen === 'LOGIN' && (
          <View style={styles.form}>
            <Logo size="large" containerStyle={styles.logoContainer} />
            <Text style={styles.title}>Đăng nhập</Text>
            <Text style={styles.subtitle}>Chào mừng quay trở lại SmartCare</Text>

            <TextInput
              style={styles.input}
              placeholder="Email hoặc Số điện thoại"
              placeholderTextColor={COLORS.textSecondary}
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            {savedPhoneHint && identifier === savedPhoneHint && (
              <Text style={styles.savedPhoneHint}>📌 Tài khoản đăng nhập lần trước</Text>
            )}

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

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>hoặc</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Sign-In Button */}
            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleSignIn}
              disabled={loading}
            >
              <Text style={styles.googleIcon}>G</Text>
              <Text style={styles.googleButtonText}>Đăng nhập bằng Google</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={() => {
                setScreen('REGISTER');
                setError('');
                setOtpCode('');
              }}
            >
              <Text style={styles.secondaryButtonText}>Tạo tài khoản mới</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ===== REGISTER SCREEN ===== */}
        {screen === 'REGISTER' && (
          <View style={styles.form}>
            <Logo size="large" containerStyle={styles.logoContainer} />
            <Text style={styles.title}>Đăng ký</Text>
            <Text style={styles.subtitle}>Tạo tài khoản để quản lý sức khỏe</Text>

            <TextInput
              style={styles.input}
              placeholder="Họ và tên"
              placeholderTextColor={COLORS.textSecondary}
              value={name}
              onChangeText={setName}
            />

            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={COLORS.textSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
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

        {/* ===== OTP VERIFY SCREEN ===== */}
        {screen === 'OTP_VERIFY' && (
          <View style={styles.form}>
            <Logo size="large" containerStyle={styles.logoContainer} />
            <Text style={styles.title}>Xác thực Email</Text>
            <Text style={styles.subtitle}>
              Mã OTP đã được gửi đến{'\n'}
              <Text style={styles.emailHighlight}>{email}</Text>
            </Text>

            {renderOTPInput()}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={handleVerifyOTP}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Xác nhận</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSendOTP}
              disabled={otpCountdown > 0 || otpSending}
            >
              <Text style={[styles.linkText, otpCountdown > 0 && { color: '#ccc' }]}>
                {otpCountdown > 0
                  ? `Gửi lại mã sau ${otpCountdown}s`
                  : 'Gửi lại mã OTP'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => {
              setScreen('REGISTER');
              setError('');
            }}>
              <Text style={styles.linkText}>← Quay lại đăng ký</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ===== SETUP ACCOUNT SCREEN ===== */}
        {screen === 'SETUP_ACCOUNT' && (
          <View style={styles.form}>
            <Logo size="large" containerStyle={styles.logoContainer} />
            <Text style={styles.title}>Thiết lập tài khoản</Text>
            <Text style={styles.subtitle}>Vui lòng chọn vai trò của bạn</Text>

            <View style={styles.roleSelector}>
              <TouchableOpacity
                style={[styles.roleButton, role === UserRole.PATIENT && styles.roleButtonActive]}
                onPress={() => setRole(UserRole.PATIENT)}
              >
                <Icon name="person" size={24} color={role === UserRole.PATIENT ? COLORS.secondary : '#9ca3af'} />
                <Text
                  style={[
                    styles.roleButtonText,
                    role === UserRole.PATIENT && styles.roleButtonTextActive,
                    { marginTop: 8 }
                  ]}
                >
                  Người bệnh
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.roleButton, role === UserRole.CAREGIVER && styles.roleButtonActive]}
                onPress={() => setRole(UserRole.CAREGIVER)}
              >
                <Icon name="supervised-user-circle" size={24} color={role === UserRole.CAREGIVER ? COLORS.secondary : '#9ca3af'} />
                <Text
                  style={[
                    styles.roleButtonText,
                    role === UserRole.CAREGIVER && styles.roleButtonTextActive,
                    { marginTop: 8 }
                  ]}
                >
                  Người thân
                </Text>
              </TouchableOpacity>
            </View>

            {role === UserRole.PATIENT && (
              <View>
                <Text style={[styles.subtitle, { marginBottom: 16 }]}>Thông tin sức khỏe (tùy chọn)</Text>
                
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Chiều cao (cm)"
                    placeholderTextColor={COLORS.textSecondary}
                    value={height}
                    onChangeText={setHeight}
                    keyboardType="numeric"
                  />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Cân nặng (kg)"
                    placeholderTextColor={COLORS.textSecondary}
                    value={weight}
                    onChangeText={setWeight}
                    keyboardType="numeric"
                  />
                </View>

                <TextInput
                  style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                  placeholder="Tình trạng bệnh lý (ví dụ: Tiểu đường, Huyết áp cao...)"
                  placeholderTextColor={COLORS.textSecondary}
                  value={medicalCondition}
                  onChangeText={setMedicalCondition}
                  multiline
                />
              </View>
            )}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.button, styles.primaryButton, { marginTop: 16 }]}
              onPress={() => handleSetupComplete(false)}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Hoàn tất</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={() => handleSetupComplete(true)}
              disabled={loading}
            >
              <Text style={styles.secondaryButtonText}>Bỏ qua & Đăng ký</Text>
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
    marginBottom: 32,
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
  // OTP Input
  otpContainer: {
    marginBottom: 24,
  },
  otpInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 12,
    padding: 18,
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    letterSpacing: 12,
  },
  emailHighlight: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  // Saved identifier hint
  savedPhoneHint: {
    fontSize: 12,
    color: COLORS.primary,
    marginTop: -12,
    marginBottom: 12,
    marginLeft: 4,
  },
  // Google button
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
    marginBottom: 12,
    gap: 10,
  },
  googleIcon: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4285F4',
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  // Divider
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    color: COLORS.textSecondary,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  roleSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  roleButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#f3f4f6',
    backgroundColor: 'transparent',
    alignItems: 'center',
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
