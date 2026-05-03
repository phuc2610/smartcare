import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { MedicalDisclaimer } from '../../components/MedicalDisclaimer';
import { COLORS } from '../../theme/tokens';
import type { Prescription } from '../../services/prescription.service';

const TEAL = COLORS.primary;

const MED_COLORS = [COLORS.primary, '#E67E22', '#3498DB', '#9B59B6', '#E74C3C', '#2ECC71'];

export const PrescriptionViewScreen = ({ route, navigation }: any) => {
  const prescription: Prescription | undefined = route?.params?.prescription;
  const loading: boolean = route?.params?.loading || false;

  const handleClose = () => navigation.goBack();
  const handleEdit = () => {
    navigation.navigate('PrescriptionEdit', { prescription });
  };

  if (loading || !prescription) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <View style={styles.headerSide} />
          <Text style={styles.headerTitle}>ĐƠN THUỐC</Text>
          <TouchableOpacity onPress={handleClose} style={styles.headerSide}>
            <Text style={styles.headerClose}>Đóng</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={TEAL} />
          <Text style={styles.loadingText}>Đang phân tích đơn thuốc...</Text>
          <Text style={styles.loadingSub}>AI đang nhận diện thông tin từ ảnh</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerSide} />
        <Text style={styles.headerTitle}>ĐƠN THUỐC</Text>
        <TouchableOpacity onPress={handleClose} style={styles.headerSide}>
          <Text style={styles.headerClose}>Đóng</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Prescription Image */}
        {prescription.imageUrl && (
          <View style={styles.imageWrap}>
            <Image source={{ uri: prescription.imageUrl }} style={styles.image} resizeMode="cover" />
          </View>
        )}

        {/* Card 1: General Info */}
        <View style={styles.card}>
          <InfoRow label="Tên:" value={prescription.diagnosis || 'ĐƠN THUỐC'} valueStyle={styles.valuePrimary} />
          <InfoRow label="Bác sĩ kê:" value={prescription.doctorName || '—'} />
          <InfoRow label="Bệnh nhân:" value={prescription.patientName || '—'} valueStyle={styles.valueUpper} />
          <InfoRow label="Ngày bắt đầu:" value={prescription.startDate || '—'} />
          {prescription.notes ? (
            <>
              <View style={styles.divider} />
              <Text style={styles.notesLabel}>Ghi chú:</Text>
              <Text style={styles.notesText}>{prescription.notes}</Text>
            </>
          ) : null}
        </View>

        {/* Card 2: Medication List */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Danh sách thuốc</Text>
          {prescription.medications && prescription.medications.length > 0 ? (
            prescription.medications.map((med, idx) => (
              <View key={idx} style={styles.medCard}>
                <View style={[styles.medIcon, { backgroundColor: MED_COLORS[idx % MED_COLORS.length] + '18' }]}>
                  <Icon name="medication" size={24} color={MED_COLORS[idx % MED_COLORS.length]} />
                </View>
                <View style={styles.medInfo}>
                  <Text style={styles.medName}>{med.name}</Text>
                  <Text style={styles.medQuantity}>{med.quantity} {med.unit}</Text>
                  <Text style={styles.medDosage}>{med.dosage}{med.instructions ? ` • ${med.instructions}` : ''}</Text>
                  {med.usage ? <Text style={styles.medUsage}>Công dụng: {med.usage}</Text> : null}
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyMed}>Không nhận diện được thuốc từ đơn</Text>
          )}
        </View>

        {/* Edit Button */}
        <TouchableOpacity style={styles.editBtn} onPress={handleEdit} activeOpacity={0.8}>
          <Icon name="edit" size={18} color="#fff" />
          <Text style={styles.editBtnText}>Chỉnh sửa đơn thuốc</Text>
        </TouchableOpacity>

        <MedicalDisclaimer />
      </ScrollView>
    </SafeAreaView>
  );
};

const InfoRow = ({ label, value, valueStyle }: { label: string; value: string; valueStyle?: any }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={[styles.rowValue, valueStyle]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { backgroundColor: TEAL, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  headerSide: { width: 50 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff', letterSpacing: 1 },
  headerClose: { fontSize: 15, fontWeight: '500', color: '#fff', textAlign: 'right' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  // Loading
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: { fontSize: 17, fontWeight: '600', color: '#1C1C1E' },
  loadingSub: { fontSize: 14, color: '#8E8E93' },
  // Image
  imageWrap: { marginHorizontal: 16, marginTop: 16, borderRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  image: { width: '100%', height: 200, borderRadius: 12 },
  // Card
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 20, marginHorizontal: 16, marginTop: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  rowLabel: { fontSize: 14, color: '#8E8E93' },
  rowValue: { fontSize: 14, color: '#1C1C1E', fontWeight: '500', maxWidth: '60%', textAlign: 'right' },
  valuePrimary: { color: TEAL, fontWeight: '700', textTransform: 'uppercase' },
  valueUpper: { textTransform: 'uppercase', fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#E5E5EA', marginVertical: 12 },
  notesLabel: { fontSize: 13, color: '#8E8E93', marginBottom: 4 },
  notesText: { fontSize: 13, color: '#6B7280', lineHeight: 20 },
  // Medication List
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1C1C1E', marginBottom: 16 },
  medCard: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  medIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  medInfo: { flex: 1 },
  medName: { fontSize: 15, fontWeight: '600', color: TEAL, marginBottom: 2 },
  medQuantity: { fontSize: 13, color: '#1C1C1E', fontWeight: '500', marginBottom: 2 },
  medDosage: { fontSize: 12, color: '#6B7280', marginBottom: 2 },
  medUsage: { fontSize: 11, color: '#9CA3AF', fontStyle: 'italic', marginTop: 2 },
  emptyMed: { fontSize: 14, color: '#8E8E93', textAlign: 'center', paddingVertical: 20 },
  // Edit Button
  editBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: TEAL, marginHorizontal: 16, marginTop: 16, paddingVertical: 14, borderRadius: 12 },
  editBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});
