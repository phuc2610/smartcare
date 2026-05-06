import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { showError } from '../../utils/alert';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING, RADIUS } from '../../theme/tokens';
import { Text } from '../../ui/Text';
import { Card } from '../../ui/Card';
import { Screen } from '../../ui/Screen';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { AppHeader } from '../../components/AppHeader';
import { TimePicker } from '../../components/TimePicker';
import { 
  getCustomReminders, 
  createCustomReminder, 
  updateCustomReminder, 
  deleteCustomReminder,
  CustomReminder 
} from '../../services/customReminder.service';
import { scheduleCustomReminder, cancelNotification } from '../../services/notification.service';
import { Loading } from '../../ui/Loading';
import { EmptyState } from '../../ui/EmptyState';

export const CustomReminderScreen = () => {
  const navigation = useNavigation<any>();
  const [reminders, setReminders] = useState<CustomReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingReminder, setEditingReminder] = useState<CustomReminder | null>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reminderTime, setReminderTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [repeatType, setRepeatType] = useState<'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY'>('NONE');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadReminders();
  }, []);

  const loadReminders = async () => {
    try {
      setLoading(true);
      const data = await getCustomReminders();
      setReminders(data.reminders);
    } catch (error) {
      console.error('Failed to load reminders:', error);
      showError('Lỗi', 'Không thể tải danh sách nhắc nhở');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      showError('Lỗi', 'Vui lòng nhập tiêu đề');
      return;
    }

    setSaving(true);
    try {
      const reminderData = {
        title: title.trim(),
        description: description.trim(),
        reminderTime: reminderTime.toISOString(),
        repeatType,
      };

      let savedReminder;
      if (editingReminder) {
        // Cancel old notification if exists
        if (editingReminder.notificationId) {
          await cancelNotification(editingReminder.notificationId);
        }
        savedReminder = await updateCustomReminder(editingReminder._id, reminderData);
      } else {
        savedReminder = await createCustomReminder(reminderData);
      }

      // Schedule notification
      if (savedReminder.reminder.isActive && new Date(savedReminder.reminder.reminderTime) > new Date()) {
        try {
          const notificationId = await scheduleCustomReminder(
            savedReminder.reminder.title,
            savedReminder.reminder.description || 'Nhắc nhở của bạn',
            new Date(savedReminder.reminder.reminderTime),
            savedReminder.reminder._id
          );
          // Update reminder with notificationId
          await updateCustomReminder(savedReminder.reminder._id, { notificationId });
        } catch (error) {
          console.error('Failed to schedule notification:', error);
        }
      }

      setShowAddModal(false);
      setEditingReminder(null);
      resetForm();
      loadReminders();
      const { showSuccess } = require('../../utils/alert');
      showSuccess('Thành công', editingReminder ? 'Đã cập nhật nhắc nhở' : 'Đã tạo nhắc nhở');
    } catch (error: any) {
      showError('Lỗi', error?.message || 'Không thể lưu nhắc nhở');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (reminder: CustomReminder) => {
    const { showConfirm, showError } = require('../../utils/alert');
    showConfirm(
      'Xác nhận',
      'Bạn có chắc muốn xóa nhắc nhở này?',
      async () => {
        try {
          // Cancel notification if exists
          if (reminder.notificationId) {
            await cancelNotification(reminder.notificationId);
          }
          await deleteCustomReminder(reminder._id);
          loadReminders();
        } catch (error: any) {
          showError('Lỗi', error?.message || 'Không thể xóa');
        }
      }
    );
  };

  const handleEdit = (reminder: CustomReminder) => {
    setEditingReminder(reminder);
    setTitle(reminder.title);
    setDescription(reminder.description);
    setReminderTime(new Date(reminder.reminderTime));
    setRepeatType(reminder.repeatType);
    setShowAddModal(true);
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setReminderTime(new Date());
    setRepeatType('NONE');
    setEditingReminder(null);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('vi-VN', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getRepeatLabel = (type: string) => {
    switch (type) {
      case 'DAILY': return 'Hàng ngày';
      case 'WEEKLY': return 'Hàng tuần';
      case 'MONTHLY': return 'Hàng tháng';
      default: return 'Một lần';
    }
  };

  if (loading) {
    return (
      <Screen>
        <AppHeader title="Nhắc nhở tùy chỉnh" showBack onBack={() => navigation?.goBack()} />
        <Loading message="Đang tải..." />
      </Screen>
    );
  }

  return (
    <Screen>
      <AppHeader 
        title="Nhắc nhở tùy chỉnh" 
        showBack 
        onBack={() => navigation?.goBack()}
        rightAction={
          <TouchableOpacity
            onPress={() => {
              resetForm();
              setShowAddModal(true);
            }}
            style={styles.addButton}
          >
            <Icon name="add" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        }
      />
      <Screen scrollable>
        {reminders.length === 0 ? (
          <EmptyState
            icon="🔔"
            title="Chưa có nhắc nhở"
            message="Tạo nhắc nhở tùy chỉnh để không quên các việc quan trọng"
          />
        ) : (
          reminders.map((reminder) => (
            <Card key={reminder._id} style={styles.reminderCard}>
              <View style={styles.reminderHeader}>
                <View style={styles.reminderInfo}>
                  <Text variant="body" color="text" semibold>{reminder.title}</Text>
                  {reminder.description && (
                    <Text variant="caption" color="textSecondary" style={styles.description}>
                      {reminder.description}
                    </Text>
                  )}
                  <View style={styles.reminderMeta}>
                    <Icon name="schedule" size={16} color={COLORS.textSecondary} />
                    <Text variant="caption" color="textSecondary" style={styles.metaText}>
                      {formatTime(new Date(reminder.reminderTime))} • {getRepeatLabel(reminder.repeatType)}
                    </Text>
                  </View>
                </View>
                <View style={styles.reminderActions}>
                  <TouchableOpacity
                    onPress={() => handleEdit(reminder)}
                    style={styles.actionButton}
                  >
                    <Icon name="edit" size={20} color={COLORS.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDelete(reminder)}
                    style={styles.actionButton}
                  >
                    <Icon name="delete" size={20} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
              </View>
            </Card>
          ))
        )}
      </Screen>

      {/* Add/Edit Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowAddModal(false);
          resetForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.modal}>
            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalContent}
            >
              <View style={styles.modalHeader}>
                <Text variant="section" color="text">
                  {editingReminder ? 'Chỉnh sửa nhắc nhở' : 'Tạo nhắc nhở mới'}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                >
                  <Icon name="close" size={24} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              <Input
                label="Tiêu đề"
                value={title}
                onChangeText={setTitle}
                placeholder="Nhập tiêu đề nhắc nhở"
              />

              <Input
                label="Mô tả (tùy chọn)"
                value={description}
                onChangeText={setDescription}
                placeholder="Nhập mô tả"
                multiline
              />

              <View style={styles.timeSection}>
                <Text variant="bodySmall" color="text" style={styles.label}>
                  Thời gian
                </Text>
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => setShowTimePicker(true)}
                >
                  <Icon name="access-time" size={20} color={COLORS.primary} />
                  <Text variant="body" color="text" style={styles.timeText}>
                    {formatTime(reminderTime)}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.repeatSection}>
                <Text variant="bodySmall" color="text" style={styles.label}>
                  Lặp lại
                </Text>
                <View style={styles.repeatOptions}>
                  {(['NONE', 'DAILY', 'WEEKLY', 'MONTHLY'] as const).map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.repeatOption,
                        repeatType === type && styles.repeatOptionActive,
                      ]}
                      onPress={() => setRepeatType(type)}
                    >
                      <Text
                        variant="caption"
                        color={repeatType === type ? 'text' : 'textSecondary'}
                      >
                        {getRepeatLabel(type)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <Button
                title={editingReminder ? 'Cập nhật' : 'Tạo nhắc nhở'}
                onPress={handleSave}
                variant="primary"
                loading={saving}
                style={styles.saveButton}
              />
            </ScrollView>
          </Card>
        </View>
      </Modal>

      {/* Time Picker - TimePicker component handles its own modal */}
      {showTimePicker && (
        <TimePicker
          value={formatTime(reminderTime)}
          onChange={(time) => {
            const [hours, minutes] = time.split(':').map(Number);
            const newTime = new Date(reminderTime);
            newTime.setHours(hours, minutes);
            setReminderTime(newTime);
            setShowTimePicker(false);
          }}
        />
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  addButton: {
    padding: SPACING.xs,
  },
  reminderCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  reminderInfo: {
    flex: 1,
  },
  description: {
    marginTop: SPACING.xs / 2,
    marginBottom: SPACING.xs,
  },
  reminderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  metaText: {
    marginLeft: SPACING.xs / 2,
  },
  reminderActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  actionButton: {
    padding: SPACING.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '90%',
    maxHeight: '85%',
    padding: 0,
  },
  modalContent: {
    padding: SPACING.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  timeSection: {
    marginTop: SPACING.md,
  },
  label: {
    marginBottom: SPACING.sm,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  timeText: {
    marginLeft: SPACING.xs,
  },
  repeatSection: {
    marginTop: SPACING.md,
  },
  repeatOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  repeatOption: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  repeatOptionActive: {
    backgroundColor: COLORS.primaryLight + '20',
    borderColor: COLORS.primary,
  },
  saveButton: {
    marginTop: SPACING.lg,
  },
});

