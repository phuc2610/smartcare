import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { showError, showSuccess } from '../../utils/alert';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING, RADIUS } from '../../theme/tokens';
import { Text } from '../../ui/Text';
import { Input } from '../../ui/Input';
import { Screen } from '../../ui/Screen';
import { Button } from '../../ui/Button';
import { AppHeader } from '../../components/AppHeader';
import { changePassword } from '../../services/auth.service';

// Move PasswordInput outside component to prevent re-creation
const PasswordInput = React.memo(({
  value,
  onChangeText,
  placeholder,
  showPassword,
  onToggleVisibility,
  error,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  showPassword: boolean;
  onToggleVisibility: () => void;
  error?: string;
}) => (
  <Input
    value={value}
    onChangeText={onChangeText}
    placeholder={placeholder}
    secureTextEntry={!showPassword}
    autoCapitalize="none"
    autoCorrect={false}
    error={error}
    rightIcon={
      <TouchableOpacity onPress={onToggleVisibility} activeOpacity={0.7}>
        <Icon
          name={showPassword ? 'visibility' : 'visibility-off'}
          size={20}
          color={COLORS.textSecondary}
        />
      </TouchableOpacity>
    }
  />
));

export const ChangePasswordScreen = () => {
  const navigation = useNavigation<any>();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    current?: string;
    new?: string;
    confirm?: string;
  }>({});

  const validate = () => {
    const newErrors: typeof errors = {};
    
    if (!currentPassword) {
      newErrors.current = 'Vui lòng nhập mật khẩu hiện tại';
    }
    if (!newPassword) {
      newErrors.new = 'Vui lòng nhập mật khẩu mới';
    } else if (newPassword.length < 6) {
      newErrors.new = 'Mật khẩu mới phải có ít nhất 6 ký tự';
    }
    if (!confirmPassword) {
      newErrors.confirm = 'Vui lòng xác nhận mật khẩu mới';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirm = 'Mật khẩu xác nhận không khớp';
    }
    if (currentPassword === newPassword && newPassword) {
      newErrors.new = 'Mật khẩu mới phải khác mật khẩu hiện tại';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChangePassword = async () => {
    if (!validate()) {
      return;
    }

    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      showSuccess('Thành công', 'Đã đổi mật khẩu thành công', () => navigation?.goBack());
    } catch (error: any) {
      showError('Lỗi', error?.message || 'Không thể đổi mật khẩu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <AppHeader title="Đổi mật khẩu" showBack onBack={() => navigation?.goBack()} />
      <Screen scrollable scrollViewProps={{ contentContainerStyle: styles.scrollContent }}>
        <View style={styles.form}>
          <PasswordInput
            value={currentPassword}
            onChangeText={(text) => {
              setCurrentPassword(text);
              if (errors.current) setErrors({ ...errors, current: undefined });
            }}
            placeholder="Nhập mật khẩu hiện tại"
            showPassword={showCurrentPassword}
            onToggleVisibility={() => setShowCurrentPassword(!showCurrentPassword)}
            error={errors.current}
          />

          <PasswordInput
            value={newPassword}
            onChangeText={(text) => {
              setNewPassword(text);
              if (errors.new) setErrors({ ...errors, new: undefined });
            }}
            placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
            showPassword={showNewPassword}
            onToggleVisibility={() => setShowNewPassword(!showNewPassword)}
            error={errors.new}
          />

          <PasswordInput
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              if (errors.confirm) setErrors({ ...errors, confirm: undefined });
            }}
            placeholder="Nhập lại mật khẩu mới"
            showPassword={showConfirmPassword}
            onToggleVisibility={() => setShowConfirmPassword(!showConfirmPassword)}
            error={errors.confirm}
          />

          <Button
            title="Đổi mật khẩu"
            onPress={handleChangePassword}
            variant="primary"
            loading={loading}
            style={styles.button}
          />
        </View>
      </Screen>
    </Screen>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    padding: SPACING.lg,
  },
  form: {
    width: '100%',
  },
  button: {
    marginTop: SPACING['2xl'],
  },
});
