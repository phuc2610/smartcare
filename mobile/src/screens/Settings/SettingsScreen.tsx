import React, { useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
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
import { Logo } from '../../components/Logo';
import { getNotificationSettings, updateNotificationSettings, getMedicationTimes, updateMedicationTimes, MedicationTimes } from '../../services/settings.service';
import { deleteAccount } from '../../services/auth.service';

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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>({
    medicationReminderBefore: 15,
    mealReminderBefore: 15,
    exerciseReminderBefore: 15,
    medicationEnabled: true,
    mealEnabled: true,
    exerciseEnabled: true,
  });

  const [medTimes, setMedTimes] = useState<MedicationTimes>({
    morning: '08:00',
    noon: '12:00',
    evening: '20:00',
  });

  useEffect(() => {
    loadSettings();
    loadMedTimes();
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

  const loadMedTimes = async () => {
    try {
      const data = await getMedicationTimes();
      if (data.medicationTimes) {
        setMedTimes(data.medicationTimes);
      }
    } catch (error) {
      console.error('Failed to load medication times:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateNotificationSettings(settings);
      await updateMedicationTimes(medTimes);
      Alert.alert('Thành công', 'Đã lưu cài đặt thông báo và giờ uống thuốc');
    } catch (error: any) {
      Alert.alert('Lỗi', error?.message || 'Không thể lưu cài đặt');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Xác nhận xoá tài khoản',
      'Bạn có chắc chắn muốn xoá tài khoản vĩnh viễn không?\n\nTất cả dữ liệu của bạn (đơn thuốc, lịch nhắc, hồ sơ sức khoẻ...) sẽ bị xoá vĩnh viễn và không thể khôi phục.',
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Tiếp tục xoá',
          style: 'destructive',
          onPress: () => {
            setDeletePassword('');
            setShowDeleteModal(true);
          },
        },
      ]
    );
  };

  const confirmDeleteAccount = async () => {
    if (!deletePassword) {
      Alert.alert('Lỗi', 'Vui lòng nhập mật khẩu');
      return;
    }
    setDeleteLoading(true);
    try {
      await deleteAccount(deletePassword);
      setShowDeleteModal(false);
      Alert.alert('Thành công', 'Tài khoản đã được xoá.');
      signOut();
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể xoá tài khoản');
    } finally {
      setDeleteLoading(false);
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

        {/* Giờ uống thuốc theo buổi */}
        <View style={styles.section}>
          <Text variant="section" color="text" style={styles.sectionTitle}>
            💊 Giờ uống thuốc theo Buổi
          </Text>
          <Card style={styles.card}>
            <Text variant="caption" color="textSecondary" style={{ marginBottom: SPACING.md }}>
              Bác sĩ sẽ kê thuốc theo buổi (Sáng, Trưa, Tối). Bạn có thể tuỳ chỉnh giờ uống cụ thể phù hợp với lối sống của mình.
            </Text>
            
            {/* Buổi Sáng */}
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#FEF3C7' }]}>
                  <Icon name="wb-sunny" size={20} color="#F59E0B" />
                </View>
                <View style={styles.settingText}>
                  <Text variant="body" color="text" semibold>Buổi Sáng</Text>
                  <Text variant="caption" color="textSecondary">Gợi ý: 06:00 – 09:00</Text>
                </View>
              </View>
              <TextInput
                style={[styles.numberInput, { width: 70 }]}
                value={medTimes.morning}
                onChangeText={(text) => setMedTimes({ ...medTimes, morning: text })}
                placeholder="08:00"
                keyboardType="numbers-and-punctuation"
                maxLength={5}
              />
            </View>

            <View style={styles.divider} />

            {/* Buổi Trưa */}
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#FFEDD5' }]}>
                  <Icon name="wb-cloudy" size={20} color="#F97316" />
                </View>
                <View style={styles.settingText}>
                  <Text variant="body" color="text" semibold>Buổi Trưa</Text>
                  <Text variant="caption" color="textSecondary">Gợi ý: 10:00 – 13:00</Text>
                </View>
              </View>
              <TextInput
                style={[styles.numberInput, { width: 70 }]}
                value={medTimes.noon}
                onChangeText={(text) => setMedTimes({ ...medTimes, noon: text })}
                placeholder="12:00"
                keyboardType="numbers-and-punctuation"
                maxLength={5}
              />
            </View>

            <View style={styles.divider} />

            {/* Buổi Tối */}
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#E0E7FF' }]}>
                  <Icon name="nightlight-round" size={20} color="#6366F1" />
                </View>
                <View style={styles.settingText}>
                  <Text variant="body" color="text" semibold>Buổi Tối</Text>
                  <Text variant="caption" color="textSecondary">Gợi ý: 17:00 – 21:00</Text>
                </View>
              </View>
              <TextInput
                style={[styles.numberInput, { width: 70 }]}
                value={medTimes.evening}
                onChangeText={(text) => setMedTimes({ ...medTimes, evening: text })}
                placeholder="20:00"
                keyboardType="numbers-and-punctuation"
                maxLength={5}
              />
            </View>
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

        {/* Khác */}
        <View style={styles.section}>
          <Text variant="section" color="text" style={styles.sectionTitle}>
            ⚙️ Khác
          </Text>
          <Card style={styles.card}>
            <View style={styles.aboutContainer}>
              <Logo size="medium" containerStyle={styles.aboutLogo} />
              <View style={styles.aboutTextContainer}>
                <Text variant="body" color="text" semibold style={styles.aboutTitle}>
                  SmartCare
                </Text>
                <Text variant="caption" color="textSecondary" style={styles.aboutSubtext}>
                  Version 1.0.0
                </Text>
                <Text variant="caption" color="textSecondary" style={styles.aboutDescription}>
                  Ứng dụng quản lý sức khỏe thông minh
                </Text>
              </View>
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

        {/* Xoá tài khoản */}
        <View style={styles.deleteContainer}>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDeleteAccount}
            activeOpacity={0.7}
          >
            <Icon name="delete-forever" size={18} color="#DC2626" />
            <Text variant="caption" style={styles.deleteButtonText}>
              Xoá tài khoản vĩnh viễn
            </Text>
          </TouchableOpacity>
        </View>
      </Screen>

      {/* Modal nhập mật khẩu xác nhận xoá */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Icon name="warning" size={40} color="#DC2626" style={{ alignSelf: 'center', marginBottom: 12 }} />
            <Text variant="body" semibold style={{ textAlign: 'center', marginBottom: 8, color: COLORS.text }}>
              Nhập mật khẩu để xác nhận
            </Text>
            <Text variant="caption" color="textSecondary" style={{ textAlign: 'center', marginBottom: 16 }}>
              Vui lòng nhập mật khẩu hiện tại để xác nhận xoá tài khoản vĩnh viễn.
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Mật khẩu"
              secureTextEntry
              value={deletePassword}
              onChangeText={setDeletePassword}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setShowDeleteModal(false)}
                disabled={deleteLoading}
              >
                <Text variant="body" semibold style={{ color: COLORS.textSecondary }}>Huỷ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnDelete]}
                onPress={confirmDeleteAccount}
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text variant="body" semibold style={{ color: '#fff' }}>Xoá tài khoản</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    marginBottom: SPACING.md,
  },
  logoutButton: {
    width: '100%',
    borderColor: COLORS.error,
  },
  logoutButtonText: {
    color: COLORS.error,
  },
  aboutContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  aboutLogo: {
    marginRight: SPACING.md,
  },
  aboutTextContainer: {
    flex: 1,
  },
  aboutTitle: {
    marginBottom: SPACING.xs / 2,
  },
  aboutSubtext: {
    marginBottom: SPACING.xs / 2,
  },
  aboutDescription: {
    marginTop: SPACING.xs,
  },
  deleteContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING['3xl'],
    alignItems: 'center',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: SPACING.sm,
  },
  deleteButtonText: {
    color: '#DC2626',
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
  },
  modalInput: {
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: SPACING.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnCancel: {
    backgroundColor: '#F3F4F6',
  },
  modalBtnDelete: {
    backgroundColor: '#DC2626',
  },
});
