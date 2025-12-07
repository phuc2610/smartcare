import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../../contexts/AuthContext';
import { COLORS } from '../../utils/constants';
import { AppHeader } from '../../components/AppHeader';
import { getNotificationSettings, updateNotificationSettings } from '../../services/settings.service';

interface NotificationSettings {
  medicationReminderBefore: number; // minutes before
  mealReminderBefore: number; // minutes before
  exerciseReminderBefore: number; // minutes before
  medicationEnabled: boolean;
  mealEnabled: boolean;
  exerciseEnabled: boolean;
}

export const SettingsScreen = ({ navigation }: any) => {
  const { user, signOut } = useAuth();
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
        <Icon name={icon} size={24} color={COLORS.primary} style={styles.settingIcon} />
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      <View style={styles.settingRight}>
        {type === 'switch' ? (
          <Switch
            value={value}
            onValueChange={onValueChange}
            trackColor={{ false: '#e5e7eb', true: COLORS.primary }}
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
            >
              <Icon name="remove" size={20} color={COLORS.primary} />
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
            <Text style={styles.numberUnit}>phút</Text>
            <TouchableOpacity
              style={styles.numberButton}
              onPress={() => {
                const newValue = Math.min(max || 60, value + 5);
                onValueChange(newValue);
              }}
            >
              <Icon name="add" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <AppHeader title="Cài đặt" showBack onBack={() => navigation?.goBack()} />
      <ScrollView style={styles.scrollView}>
        {/* Thông báo & Nhắc nhở */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔔 Thông báo & Nhắc nhở</Text>

          <View style={styles.card}>
            <SettingItem
              icon="medication"
              title="Nhắc nhở uống thuốc"
              value={settings.medicationEnabled}
              onValueChange={(val) => setSettings({ ...settings, medicationEnabled: val })}
            />
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
          </View>

          <View style={styles.card}>
            <SettingItem
              icon="restaurant"
              title="Nhắc nhở bữa ăn"
              value={settings.mealEnabled}
              onValueChange={(val) => setSettings({ ...settings, mealEnabled: val })}
            />
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
          </View>

          <View style={styles.card}>
            <SettingItem
              icon="fitness-center"
              title="Nhắc nhở vận động"
              value={settings.exerciseEnabled}
              onValueChange={(val) => setSettings({ ...settings, exerciseEnabled: val })}
            />
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
          </View>
        </View>

        {/* Nút lưu */}
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>
            {loading ? 'Đang lưu...' : 'Lưu cài đặt'}
          </Text>
        </TouchableOpacity>

        {/* Tài khoản */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👤 Tài khoản</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation?.navigate('Profile')}
            >
              <Icon name="account-circle" size={24} color={COLORS.primary} />
              <Text style={styles.menuText}>Thông tin cá nhân</Text>
              <Icon name="chevron-right" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation?.navigate('ChangePassword')}
            >
              <Icon name="lock" size={24} color={COLORS.primary} />
              <Text style={styles.menuText}>Đổi mật khẩu</Text>
              <Icon name="chevron-right" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Khác */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚙️ Khác</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.menuItem}>
              <Icon name="info" size={24} color={COLORS.primary} />
              <Text style={styles.menuText}>Về ứng dụng</Text>
              <Text style={styles.menuSubtext}>Version 1.0.0</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Đăng xuất */}
        <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
          <Text style={styles.logoutButtonText}>Đăng xuất</Text>
        </TouchableOpacity>
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
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  settingSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  settingRight: {
    marginLeft: 12,
  },
  numberInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  numberButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberInput: {
    width: 50,
    height: 40,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  numberUnit: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginRight: 4,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    margin: 16,
    marginTop: 24,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    marginLeft: 12,
  },
  menuSubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginRight: 8,
  },
  logoutButton: {
    backgroundColor: COLORS.error + '20',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    margin: 16,
    marginTop: 24,
  },
  logoutButtonText: {
    color: COLORS.error,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

