import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS } from '../../utils/constants';
import { AppHeader } from '../../components/AppHeader';
import { changePassword } from '../../services/auth.service';

// Move PasswordInput outside component to prevent re-creation
const PasswordInput = React.memo(({
  value,
  onChangeText,
  placeholder,
  showPassword,
  onToggleVisibility,
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

export const ChangePasswordScreen = ({ navigation }: any) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu mới và xác nhận không khớp');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }

    if (currentPassword === newPassword) {
      Alert.alert('Lỗi', 'Mật khẩu mới phải khác mật khẩu hiện tại');
      return;
    }

    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      Alert.alert('Thành công', 'Đã đổi mật khẩu thành công', [
        {
          text: 'OK',
          onPress: () => navigation?.goBack(),
        },
      ]);
    } catch (error: any) {
      Alert.alert('Lỗi', error?.message || 'Không thể đổi mật khẩu');
    } finally {
      setLoading(false);
    }
  };


  return (
    <View style={styles.container}>
      <AppHeader title="Đổi mật khẩu" showBack onBack={() => navigation?.goBack()} />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.form}>
          <Text style={styles.label}>Mật khẩu hiện tại</Text>
          <PasswordInput
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Nhập mật khẩu hiện tại"
            showPassword={showCurrentPassword}
            onToggleVisibility={() => setShowCurrentPassword(!showCurrentPassword)}
          />

          <Text style={styles.label}>Mật khẩu mới</Text>
          <PasswordInput
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
            showPassword={showNewPassword}
            onToggleVisibility={() => setShowNewPassword(!showNewPassword)}
          />

          <Text style={styles.label}>Xác nhận mật khẩu mới</Text>
          <PasswordInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Nhập lại mật khẩu mới"
            showPassword={showConfirmPassword}
            onToggleVisibility={() => setShowConfirmPassword(!showConfirmPassword)}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleChangePassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Đổi mật khẩu</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
    marginTop: 8,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
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
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

