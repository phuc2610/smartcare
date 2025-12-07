import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS } from '../utils/constants';
import { Reminder, HealthLog } from '../types';
import { TimePicker } from './TimePicker';
import { DatePicker } from './DatePicker';

interface EditTaskModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  task: Reminder | HealthLog | null;
  type: 'medication' | 'health';
}

export const EditTaskModal: React.FC<EditTaskModalProps> = ({
  visible,
  onClose,
  onSave,
  task,
  type,
}) => {
  const [loading, setLoading] = useState(false);
  
  // Medication fields
  const [scheduledTime, setScheduledTime] = useState('');
  const [dosage, setDosage] = useState('');
  const [unit, setUnit] = useState('');

  // Health log fields
  const [scheduledDate, setScheduledDate] = useState('');
  const [healthScheduledTime, setHealthScheduledTime] = useState('');
  const [foodName, setFoodName] = useState('');
  const [calories, setCalories] = useState('');
  const [exerciseType, setExerciseType] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [caloriesBurned, setCaloriesBurned] = useState('');

  useEffect(() => {
    if (task && visible) {
      if (type === 'medication') {
        const reminder = task as Reminder;
        const time = new Date(reminder.scheduledTime).toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
        });
        setScheduledTime(time);
        setDosage(reminder.dosage);
        setUnit(reminder.unit);
      } else {
        const healthLog = task as HealthLog;
        if (healthLog.scheduledDate) {
          const date = new Date(healthLog.scheduledDate);
          setScheduledDate(date.toISOString().split('T')[0]);
        } else {
          const date = new Date(healthLog.date);
          setScheduledDate(date.toISOString().split('T')[0]);
        }
        setHealthScheduledTime(healthLog.scheduledTime || '08:00');
        
        if (healthLog.type === 'meal') {
          setFoodName(healthLog.details.foodName || '');
          setCalories(String(healthLog.details.calories || 0));
        } else if (healthLog.type === 'exercise') {
          setExerciseType(healthLog.details.exerciseType || '');
          setDurationMinutes(String(healthLog.details.durationMinutes || 0));
          setCaloriesBurned(String(healthLog.details.caloriesBurned || 0));
        }
      }
    }
  }, [task, visible, type]);

  const handleSave = async () => {
    if (loading) return;

    try {
      setLoading(true);

      if (type === 'medication') {
        const reminder = task as Reminder;
        const [hours, minutes] = scheduledTime.split(':').map(Number);
        const scheduledDateTime = new Date(reminder.scheduledTime);
        scheduledDateTime.setHours(hours, minutes, 0, 0);

        await onSave({
          scheduledTime: scheduledDateTime.toISOString(),
          dosage,
          unit,
        });
      } else {
        const healthLog = task as HealthLog;
        const updateData: any = {
          scheduledDate,
          scheduledTime: healthScheduledTime,
        };

        if (healthLog.type === 'meal') {
          updateData.details = {
            foodName,
            calories: Number(calories) || 0,
          };
        } else if (healthLog.type === 'exercise') {
          updateData.details = {
            exerciseType,
            durationMinutes: Number(durationMinutes) || 0,
            caloriesBurned: Number(caloriesBurned) || 0,
          };
        }

        await onSave(updateData);
      }

      onClose();
    } catch (error) {
      console.error('Failed to save:', error);
      Alert.alert('Lỗi', 'Không thể lưu thay đổi');
    } finally {
      setLoading(false);
    }
  };

  const renderMedicationForm = () => {
    const reminder = task as Reminder;
    return (
      <ScrollView style={styles.form}>
        <View style={styles.field}>
          <Text style={styles.label}>Tên thuốc</Text>
          <Text style={styles.readOnlyText}>{reminder.medicationName}</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Giờ uống</Text>
          <TimePicker
            value={scheduledTime}
            onChange={setScheduledTime}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Liều lượng</Text>
          <TextInput
            style={styles.input}
            value={dosage}
            onChangeText={setDosage}
            placeholder="Nhập liều lượng"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Đơn vị</Text>
          <TextInput
            style={styles.input}
            value={unit}
            onChangeText={setUnit}
            placeholder="mg, viên, ml..."
          />
        </View>
      </ScrollView>
    );
  };

  const renderHealthLogForm = () => {
    const healthLog = task as HealthLog;
    
    if (healthLog.type === 'meal') {
      return (
        <ScrollView style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Ngày</Text>
            <DatePicker
              value={scheduledDate}
              onChange={setScheduledDate}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Giờ</Text>
            <TimePicker
              value={healthScheduledTime}
              onChange={setHealthScheduledTime}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Tên món ăn</Text>
            <TextInput
              style={styles.input}
              value={foodName}
              onChangeText={setFoodName}
              placeholder="Nhập tên món ăn"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Calories (kcal)</Text>
            <TextInput
              style={styles.input}
              value={calories}
              onChangeText={setCalories}
              placeholder="0"
              keyboardType="number-pad"
            />
          </View>
        </ScrollView>
      );
    } else if (healthLog.type === 'exercise') {
      return (
        <ScrollView style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Ngày</Text>
            <DatePicker
              value={scheduledDate}
              onChange={setScheduledDate}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Giờ</Text>
            <TimePicker
              value={healthScheduledTime}
              onChange={setHealthScheduledTime}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Loại vận động</Text>
            <TextInput
              style={styles.input}
              value={exerciseType}
              onChangeText={setExerciseType}
              placeholder="Chạy bộ, Gym, Yoga..."
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Thời gian (phút)</Text>
            <TextInput
              style={styles.input}
              value={durationMinutes}
              onChangeText={setDurationMinutes}
              placeholder="0"
              keyboardType="number-pad"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Calories đốt cháy (kcal)</Text>
            <TextInput
              style={styles.input}
              value={caloriesBurned}
              onChangeText={setCaloriesBurned}
              placeholder="0"
              keyboardType="number-pad"
            />
          </View>
        </ScrollView>
      );
    }

    return null;
  };

  if (!task) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {type === 'medication' ? 'Sửa lịch uống thuốc' : 'Sửa bữa ăn/vận động'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {type === 'medication' ? renderMedicationForm() : renderHealthLogForm()}

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton, loading && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={loading}
            >
              <Text style={styles.saveButtonText}>
                {loading ? 'Đang lưu...' : 'Lưu'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  form: {
    padding: 16,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: '#fff',
  },
  readOnlyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    padding: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  cancelButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: COLORS.primary,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

