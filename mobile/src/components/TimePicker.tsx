import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Platform, TextInput, ScrollView } from 'react-native';
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
  const [inputValue, setInputValue] = useState(value || '08:00');
  const [hours, setHours] = useState(() => {
    const [h] = (value || '08:00').split(':').map(Number);
    return h || 8;
  });
  const [minutes, setMinutes] = useState(() => {
    const [, m] = (value || '08:00').split(':').map(Number);
    return m || 0;
  });

  const displayTime = value || '08:00';

  const handleTimeInput = (text: string) => {
    setInputValue(text);
    // Validate format HH:mm
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
    if (timeRegex.test(text)) {
      onChange(text);
    }
  };

  const handleHourChange = (hour: number) => {
    const newHour = Math.max(0, Math.min(23, hour));
    setHours(newHour);
    const newTime = `${String(newHour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    onChange(newTime);
  };

  const handleMinuteChange = (minute: number) => {
    const newMinute = Math.max(0, Math.min(59, minute));
    setMinutes(newMinute);
    const newTime = `${String(hours).padStart(2, '0')}:${String(newMinute).padStart(2, '0')}`;
    onChange(newTime);
  };

  const handleQuickSelect = (time: string) => {
    setInputValue(time);
    onChange(time);
    const [h, m] = time.split(':').map(Number);
    setHours(h);
    setMinutes(m);
    setShow(false);
  };

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
              <View style={styles.picker}>
                <Text style={styles.pickerLabel}>Nhập giờ (HH:mm)</Text>
                <TextInput
                  style={styles.timeInput}
                  value={inputValue}
                  onChangeText={handleTimeInput}
                  placeholder="08:00"
                  placeholderTextColor={COLORS.textSecondary}
                  keyboardType="numeric"
                />
                
                <View style={styles.scrollPicker}>
                  <View style={styles.scrollColumn}>
                    <Text style={styles.scrollLabel}>Giờ</Text>
                    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                      {Array.from({ length: 24 }, (_, i) => (
                        <TouchableOpacity
                          key={i}
                          style={[styles.scrollItem, hours === i && styles.scrollItemActive]}
                          onPress={() => handleHourChange(i)}
                        >
                          <Text style={[styles.scrollItemText, hours === i && styles.scrollItemTextActive]}>
                            {String(i).padStart(2, '0')}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                  
                  <View style={styles.scrollColumn}>
                    <Text style={styles.scrollLabel}>Phút</Text>
                    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                      {Array.from({ length: 60 }, (_, i) => (
                        <TouchableOpacity
                          key={i}
                          style={[styles.scrollItem, minutes === i && styles.scrollItemActive]}
                          onPress={() => handleMinuteChange(i)}
                        >
                          <Text style={[styles.scrollItemText, minutes === i && styles.scrollItemTextActive]}>
                            {String(i).padStart(2, '0')}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>

                <View style={styles.quickSelect}>
                  <TouchableOpacity 
                    style={styles.quickButton}
                    onPress={() => handleQuickSelect('08:00')}
                  >
                    <Text style={styles.quickButtonText}>08:00</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.quickButton}
                    onPress={() => handleQuickSelect('12:00')}
                  >
                    <Text style={styles.quickButtonText}>12:00</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.quickButton}
                    onPress={() => handleQuickSelect('18:00')}
                  >
                    <Text style={styles.quickButtonText}>18:00</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>
      )}
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
    padding: 16,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  timeInput: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 16,
  },
  scrollPicker: {
    flexDirection: 'row',
    height: 200,
    marginBottom: 16,
    gap: 16,
  },
  scrollColumn: {
    flex: 1,
    alignItems: 'center',
  },
  scrollLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollItem: {
    padding: 12,
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 4,
  },
  scrollItemActive: {
    backgroundColor: COLORS.primaryLight,
  },
  scrollItemText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  scrollItemTextActive: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  quickSelect: {
    flexDirection: 'row',
    gap: 8,
  },
  quickButton: {
    flex: 1,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  quickButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
});

