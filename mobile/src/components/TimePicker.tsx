import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Platform } from 'react-native';
// Note: Install @react-native-community/datetimepicker if needed
// import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS } from '../utils/constants';

interface TimePickerProps {
  value: string; // Format: "HH:mm"
  onChange: (time: string) => void;
  label?: string;
  error?: boolean;
}

export const TimePicker: React.FC<TimePickerProps> = ({ 
  value, 
  onChange, 
  label,
  error = false 
}) => {
  const [show, setShow] = useState(false);
  const [time, setTime] = useState(() => {
    const [hours, minutes] = value.split(':').map(Number);
    const date = new Date();
    date.setHours(hours || 8, minutes || 0, 0, 0);
    return date;
  });

  const handleChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === 'android') {
      setShow(false);
    }
    if (selectedTime) {
      setTime(selectedTime);
      const hours = selectedTime.getHours().toString().padStart(2, '0');
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      onChange(`${hours}:${minutes}`);
    }
  };

  const displayTime = value || '08:00';

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity
        style={[styles.input, error && styles.inputError]}
        onPress={() => setShow(true)}
      >
        <Text style={styles.timeText}>{displayTime}</Text>
        <Text style={styles.icon}>🕐</Text>
      </TouchableOpacity>

      {show && (
        <Modal
          transparent
          visible={show}
          animationType="slide"
          onRequestClose={() => setShow(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShow(false)}>
                  <Text style={styles.cancelText}>Hủy</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Chọn giờ</Text>
                <TouchableOpacity onPress={() => setShow(false)}>
                  <Text style={styles.doneText}>Xong</Text>
                </TouchableOpacity>
              </View>
              {/* DateTimePicker - Uncomment when package is installed */}
              {/* <DateTimePicker
                value={time}
                mode="time"
                is24Hour={true}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleChange}
                style={styles.picker}
              /> */}
              <View style={styles.picker}>
                <Text style={styles.pickerText}>Time Picker (Install @react-native-community/datetimepicker)</Text>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Android DateTimePicker - Uncomment when package is installed */}
      {/* {Platform.OS === 'android' && show && (
        <DateTimePicker
          value={time}
          mode="time"
          is24Hour={true}
          display="default"
          onChange={handleChange}
        />
      )} */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  inputError: {
    borderColor: COLORS.error,
  },
  timeText: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
  },
  icon: {
    fontSize: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  cancelText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  doneText: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
  },
  picker: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
});

