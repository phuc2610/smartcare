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
import { COLORS } from '../../utils/constants';
import { forgotPassword, resetPassword } from '../../services/auth.service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../../utils/constants';
import { useAuth } from '../../contexts/AuthContext';
import { Logo } from '../../components/Logo';

type Step = 'VERIFY' | 'NEW_PASSWORD';

export const ForgotPasswordScreen = ({ navigation }: any) => {
  const { updateProfile } = useAuth();
  const [step, setStep] = useState<Step>('VERIFY');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
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

  const handleVerify = async () => {
    if (!phone || !name) {
      setError('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const formattedPhone = formatPhoneForServer(phone);
      await forgotPassword(formattedPhone, name);
      setStep('NEW_PASSWORD');
    } catch (err: any) {
      setError(err?.message || 'Xác minh thất bại');
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
      const formattedPhone = formatPhoneForServer(phone);
      const result = await resetPassword(formattedPhone, name, newPassword);
      
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
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
      >
        <View style={styles.form}>
          {step === 'VERIFY' && (
            <>
              <Logo size="large" containerStyle={styles.logoContainer} />
              <Text style={styles.title}>Quên mật khẩu</Text>
              <Text style={styles.subtitle}>
                Nhập số điện thoại và họ tên để xác minh tài khoản
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

              <TextInput
                style={styles.input}
                placeholder="Họ và tên (đúng lúc đăng ký)"
                placeholderTextColor={COLORS.textSecondary}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={handleVerify}
                disabled={loading || !phone || !name}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Xác minh</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => navigation?.goBack()}>
                <Text style={styles.linkText}>Quay lại đăng nhập</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'NEW_PASSWORD' && (
            <>
              <Logo size="medium" containerStyle={styles.logoContainer} />
              <Text style={styles.title}>Đặt mật khẩu mới</Text>
              <Text style={styles.subtitle}>
                Xác minh thành công! Vui lòng nhập mật khẩu mới
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
                setStep('VERIFY');
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
