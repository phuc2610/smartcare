import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Platform, TextInput } from 'react-native';
import { COLORS } from '../utils/constants';

interface DatePickerProps {
  value: string; // Format: "YYYY-MM-DD"
  onChange: (date: string) => void;
  label?: string;
  error?: boolean;
  minimumDate?: Date;
  maximumDate?: Date;
}

export const DatePicker: React.FC<DatePickerProps> = ({ 
  value, 
  onChange, 
  label,
  error = false,
  minimumDate,
  maximumDate,
}) => {
  const [show, setShow] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return 'Chọn ngày';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'Chọn ngày';
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return 'Chọn ngày';
    }
  };

  const displayDate = formatDate(value);

  const handleDateInput = (text: string) => {
    setInputValue(text);
    // Validate format YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (dateRegex.test(text)) {
      const date = new Date(text);
      if (!isNaN(date.getTime())) {
        onChange(text);
      }
    }
  };

  const handleQuickSelect = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    setInputValue(dateStr);
    onChange(dateStr);
    setShow(false);
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity
        style={[styles.input, error && styles.inputError]}
        onPress={() => setShow(true)}
      >
        <Text style={[styles.dateText, !value && styles.placeholderText]}>
          {displayDate}
        </Text>
        <Text style={styles.icon}>📅</Text>
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
                <Text style={styles.modalTitle}>Chọn ngày</Text>
                <TouchableOpacity onPress={() => setShow(false)}>
                  <Text style={styles.doneText}>Xong</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.picker}>
                <Text style={styles.pickerLabel}>Nhập ngày (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.dateInput}
                  value={inputValue}
                  onChangeText={handleDateInput}
                  placeholder="2025-12-06"
                  placeholderTextColor={COLORS.textSecondary}
                  keyboardType="numeric"
                />
                <View style={styles.quickSelect}>
                  <TouchableOpacity 
                    style={styles.quickButton}
                    onPress={() => handleQuickSelect(0)}
                  >
                    <Text style={styles.quickButtonText}>Hôm nay</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.quickButton}
                    onPress={() => handleQuickSelect(1)}
                  >
                    <Text style={styles.quickButtonText}>Ngày mai</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.quickButton}
                    onPress={() => handleQuickSelect(-1)}
                  >
                    <Text style={styles.quickButtonText}>Hôm qua</Text>
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
  dateText: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
  },
  placeholderText: {
    color: COLORS.textSecondary,
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
    padding: 16,
  },
  pickerText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  dateInput: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 16,
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

