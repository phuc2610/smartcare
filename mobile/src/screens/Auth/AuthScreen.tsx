import React, { useState } from 'react';
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

type Screen = 'LOGIN' | 'REGISTER';

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
  const { signIn, signUp } = useAuth();
  const [screen, setScreen] = useState<Screen>('LOGIN');

  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.PATIENT);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const formatPhoneForServer = (p: string) => {
    let cleaned = p.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '84' + cleaned.slice(1);
    } else if (!cleaned.startsWith('84')) {
      cleaned = '84' + cleaned;
    }
    return '+' + cleaned;
  };

  const handleLogin = async () => {
    if (!phone || !password) {
      setError('Vui lòng nhập đầy đủ thông tin');
      return;
    }
    
    setError('');
    setLoading(true);
    
    try {
      const formattedPhone = formatPhoneForServer(phone);
      await signIn(formattedPhone, password);
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
      // Đăng ký trực tiếp, không cần OTP
      const formattedPhone = formatPhoneForServer(phone);
      await signUp({ name, phone: formattedPhone, password, role });
      console.log('Registration successful!');
    } catch (err: any) {
      console.log('Register error:', err);
      let errorMessage = 'Đăng ký thất bại';
      if (err?.message) {
        errorMessage = err.message;
      } else if (err?.response?.data?.error) {
        errorMessage = err.response.data.error;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

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
        {screen === 'LOGIN' && (
          <View style={styles.form}>
            <Logo size="large" containerStyle={styles.logoContainer} />
            <Text style={styles.title}>Đăng nhập</Text>
            <Text style={styles.subtitle}>Chào mừng quay trở lại SmartCare</Text>

            <TextInput
              style={styles.input}
              placeholder="Số điện thoại"
              placeholderTextColor={COLORS.textSecondary}
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
              placeholderTextColor={COLORS.textSecondary}
              value={name}
              onChangeText={setName}
            />

            <TextInput
              style={styles.input}
              placeholder="Số điện thoại"
              placeholderTextColor={COLORS.textSecondary}
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
                <Text style={styles.buttonText}>Đăng ký</Text>
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
