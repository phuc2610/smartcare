import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const TEAL = '#458B81';

export interface PrescriptionData {
  id: string;
  name: string;
  doctorName: string;
  patientName: string;
  startDate: string;
  notes?: string;
}

interface PrescriptionCardProps {
  data: PrescriptionData;
  onEdit?: () => void;
  onViewDetail?: () => void;
}

/**
 * Prescription Card
 * Displays saved prescription info in a card layout
 */
export const PrescriptionCard: React.FC<PrescriptionCardProps> = ({ data, onEdit, onViewDetail }) => {
  return (
    <View style={styles.card}>
      {/* Info Rows */}
      <View style={styles.row}>
        <Text style={styles.label}>Tên:</Text>
        <Text style={styles.valuePrimary}>{data.name || 'ĐƠN THUỐC'}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Bác sĩ kê:</Text>
        <Text style={styles.value}>{data.doctorName || '—'}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Bệnh nhân:</Text>
        <Text style={styles.valueUpper}>{data.patientName || '—'}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>Ngày bắt đầu:</Text>
        <Text style={styles.value}>{data.startDate || '—'}</Text>
      </View>

      {/* Notes */}
      {data.notes ? (
        <>
          <View style={styles.divider} />
          <Text style={styles.notes}>{data.notes}</Text>
        </>
      ) : null}

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.btnEdit} onPress={onEdit} activeOpacity={0.8}>
          <Icon name="edit" size={16} color={TEAL} />
          <Text style={styles.btnEditText}>Chỉnh sửa</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnView} onPress={onViewDetail} activeOpacity={0.8}>
          <Icon name="visibility" size={16} color="#fff" />
          <Text style={styles.btnViewText}>Xem chi tiết</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  label: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '400',
  },
  value: {
    fontSize: 14,
    color: '#1C1C1E',
    fontWeight: '500',
  },
  valuePrimary: {
    fontSize: 14,
    color: TEAL,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  valueUpper: {
    fontSize: 14,
    color: '#1C1C1E',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginVertical: 12,
  },
  notes: {
    fontSize: 13,
    color: '#8E8E93',
    lineHeight: 20,
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  btnEdit: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: TEAL,
    backgroundColor: '#FFFFFF',
  },
  btnEditText: {
    fontSize: 13,
    fontWeight: '600',
    color: TEAL,
  },
  btnView: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: TEAL,
  },
  btnViewText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
