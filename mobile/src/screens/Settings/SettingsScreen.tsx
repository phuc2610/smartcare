import React, { useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS, SPACING, RADIUS } from '../../theme/tokens';
import { SHADOWS } from '../../theme/shadows';
import { Text } from '../../ui/Text';
import { Card } from '../../ui/Card';
import { Screen } from '../../ui/Screen';
import { Button } from '../../ui/Button';
import { AppHeader } from '../../components/AppHeader';
import { getNotificationSettings, updateNotificationSettings } from '../../services/settings.service';

interface NotificationSettings {
  medicationReminderBefore: number;
  mealReminderBefore: number;
  exerciseReminderBefore: number;
  medicationEnabled: boolean;
  mealEnabled: boolean;
  exerciseEnabled: boolean;
}

export const SettingsScreen = () => {
  const navigation = useNavigation<any>();
  const { signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>({
    medicationReminderBefore: 15,
    mealReminderBefore: 15,
    exerciseReminderBefore: 15,
    medicationEnabled: true,
    mealEnabled: true,
    exerciseEnabled: true,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await getNotificationSettings();
      if (data.settings) {
        setSettings({
          medicationReminderBefore: data.settings.medicationReminderBefore || 15,
          mealReminderBefore: data.settings.mealReminderBefore || 15,
          exerciseReminderBefore: data.settings.exerciseReminderBefore || 15,
          medicationEnabled: data.settings.medicationEnabled !== false,
          mealEnabled: data.settings.mealEnabled !== false,
          exerciseEnabled: data.settings.exerciseEnabled !== false,
        });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateNotificationSettings(settings);
      Alert.alert('Thành công', 'Đã lưu cài đặt thông báo');
    } catch (error: any) {
      Alert.alert('Lỗi', error?.message || 'Không thể lưu cài đặt');
    } finally {
      setLoading(false);
    }
  };

  const SettingItem = ({
    icon,
    title,
    subtitle,
    value,
    onValueChange,
    type = 'switch',
    min,
    max,
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    value: any;
    onValueChange: (value: any) => void;
    type?: 'switch' | 'number';
    min?: number;
    max?: number;
  }) => (
    <View style={styles.settingItem}>
      <View style={styles.settingLeft}>
        <View style={styles.iconContainer}>
          <Icon name={icon} size={20} color={COLORS.primary} />
        </View>
        <View style={styles.settingText}>
          <Text variant="body" color="text" semibold>{title}</Text>
          {subtitle && (
            <Text variant="caption" color="textSecondary" style={styles.subtitle}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.settingRight}>
        {type === 'switch' ? (
          <Switch
            value={value}
            onValueChange={onValueChange}
            trackColor={{ false: COLORS.border, true: COLORS.primaryLight }}
            thumbColor="#fff"
          />
        ) : (
          <View style={styles.numberInputContainer}>
            <TouchableOpacity
              style={styles.numberButton}
              onPress={() => {
                const newValue = Math.max(min || 0, value - 5);
                onValueChange(newValue);
              }}
              activeOpacity={0.7}
            >
              <Icon name="remove" size={18} color={COLORS.primary} />
            </TouchableOpacity>
            <TextInput
              style={styles.numberInput}
              value={value.toString()}
              onChangeText={(text) => {
                const num = parseInt(text) || 0;
                const clamped = Math.max(min || 0, Math.min(max || 60, num));
                onValueChange(clamped);
              }}
              keyboardType="numeric"
              selectTextOnFocus
            />
            <Text variant="caption" color="textSecondary" style={styles.numberUnit}>
              phút
            </Text>
            <TouchableOpacity
              style={styles.numberButton}
              onPress={() => {
                const newValue = Math.min(max || 60, value + 5);
                onValueChange(newValue);
              }}
              activeOpacity={0.7}
            >
              <Icon name="add" size={18} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <Screen>
      <AppHeader title="Cài đặt" showBack onBack={() => navigation?.goBack()} />
      <Screen scrollable>
        {/* Thông báo & Nhắc nhở */}
        <View style={styles.section}>
          <Text variant="section" color="text" style={styles.sectionTitle}>
            🔔 Thông báo & Nhắc nhở
          </Text>

          <Card style={styles.card}>
            <SettingItem
              icon="medication"
              title="Nhắc nhở uống thuốc"
              value={settings.medicationEnabled}
              onValueChange={(val) => setSettings({ ...settings, medicationEnabled: val })}
            />
            {settings.medicationEnabled && (
              <View style={styles.divider} />
            )}
            {settings.medicationEnabled && (
              <SettingItem
                icon="schedule"
                title="Thông báo trước"
                subtitle="Thời gian thông báo trước khi đến giờ uống thuốc"
                value={settings.medicationReminderBefore}
                onValueChange={(val) => setSettings({ ...settings, medicationReminderBefore: val })}
                type="number"
                min={0}
                max={60}
              />
            )}
          </Card>

          <Card style={styles.card}>
            <SettingItem
              icon="restaurant"
              title="Nhắc nhở bữa ăn"
              value={settings.mealEnabled}
              onValueChange={(val) => setSettings({ ...settings, mealEnabled: val })}
            />
            {settings.mealEnabled && (
              <View style={styles.divider} />
            )}
            {settings.mealEnabled && (
              <SettingItem
                icon="schedule"
                title="Thông báo trước"
                subtitle="Thời gian thông báo trước khi đến giờ ăn"
                value={settings.mealReminderBefore}
                onValueChange={(val) => setSettings({ ...settings, mealReminderBefore: val })}
                type="number"
                min={0}
                max={60}
              />
            )}
          </Card>

          <Card style={styles.card}>
            <SettingItem
              icon="fitness-center"
              title="Nhắc nhở vận động"
              value={settings.exerciseEnabled}
              onValueChange={(val) => setSettings({ ...settings, exerciseEnabled: val })}
            />
            {settings.exerciseEnabled && (
              <View style={styles.divider} />
            )}
            {settings.exerciseEnabled && (
              <SettingItem
                icon="schedule"
                title="Thông báo trước"
                subtitle="Thời gian thông báo trước khi đến giờ vận động"
                value={settings.exerciseReminderBefore}
                onValueChange={(val) => setSettings({ ...settings, exerciseReminderBefore: val })}
                type="number"
                min={0}
                max={60}
              />
            )}
          </Card>
        </View>

        {/* Nút lưu */}
        <View style={styles.saveButtonContainer}>
          <Button
            title={loading ? 'Đang lưu...' : 'Lưu cài đặt'}
            onPress={handleSave}
            variant="primary"
            loading={loading}
            style={styles.saveButton}
          />
        </View>

        {/* Tài khoản */}
        <View style={styles.section}>
          <Text variant="section" color="text" style={styles.sectionTitle}>
            👤 Tài khoản
          </Text>
          <Card style={styles.card}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation?.navigate('Profile')}
              activeOpacity={0.7}
            >
              <View style={styles.iconContainer}>
                <Icon name="account-circle" size={20} color={COLORS.primary} />
              </View>
              <Text variant="body" color="text" style={styles.menuText}>
                Thông tin cá nhân
              </Text>
              <Icon name="chevron-right" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation?.navigate('ChangePassword')}
              activeOpacity={0.7}
            >
              <View style={styles.iconContainer}>
                <Icon name="lock" size={20} color={COLORS.primary} />
              </View>
              <Text variant="body" color="text" style={styles.menuText}>
                Đổi mật khẩu
              </Text>
              <Icon name="chevron-right" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </Card>
        </View>

        {/* Nhắc nhở tùy chỉnh */}
        <View style={styles.section}>
          <Text variant="section" color="text" style={styles.sectionTitle}>
            📅 Nhắc nhở
          </Text>
          <Card style={styles.card}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation?.navigate('CustomReminder')}
              activeOpacity={0.7}
            >
              <View style={styles.iconContainer}>
                <Icon name="notifications" size={20} color={COLORS.primary} />
              </View>
              <Text variant="body" color="text" style={styles.menuText}>
                Nhắc nhở tùy chỉnh
              </Text>
              <Icon name="chevron-right" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </Card>
        </View>

        {/* Khác */}
        <View style={styles.section}>
          <Text variant="section" color="text" style={styles.sectionTitle}>
            ⚙️ Khác
          </Text>
          <Card style={styles.card}>
            <View style={styles.menuItem}>
              <View style={styles.iconContainer}>
                <Icon name="info" size={20} color={COLORS.primary} />
              </View>
              <Text variant="body" color="text" style={styles.menuText}>
                Về ứng dụng
              </Text>
              <Text variant="caption" color="textSecondary" style={styles.menuSubtext}>
                Version 1.0.0
              </Text>
            </View>
          </Card>
        </View>

        {/* Đăng xuất */}
        <View style={styles.logoutContainer}>
          <Button
            title="Đăng xuất"
            onPress={signOut}
            variant="outline"
            style={styles.logoutButton}
            textStyle={styles.logoutButtonText}
          />
        </View>
      </Screen>
    </Screen>
  );
};

const styles = StyleSheet.create({
  section: {
    marginTop: SPACING['2xl'],
    paddingHorizontal: SPACING.lg,
  },
  sectionTitle: {
    marginBottom: SPACING.md,
  },
  card: {
    marginBottom: SPACING.md,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  settingText: {
    flex: 1,
  },
  subtitle: {
    marginTop: SPACING.xs / 2,
  },
  settingRight: {
    marginLeft: SPACING.md,
  },
  numberInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  numberButton: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberInput: {
    width: 50,
    height: 36,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.sm,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  numberUnit: {
    marginRight: SPACING.xs,
  },
  saveButtonContainer: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING['2xl'],
    marginBottom: SPACING.md,
  },
  saveButton: {
    width: '100%',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  menuText: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  menuSubtext: {
    marginRight: SPACING.sm,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.xs,
  },
  logoutContainer: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING['2xl'],
    marginBottom: SPACING['3xl'],
  },
  logoutButton: {
    width: '100%',
    borderColor: COLORS.error,
  },
  logoutButtonText: {
    color: COLORS.error,
  },
});
