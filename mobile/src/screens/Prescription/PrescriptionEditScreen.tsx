import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { updatePrescription, deletePrescription } from '../../services/prescription.service';
import type { Prescription, PrescriptionMedication } from '../../services/prescription.service';
import { MedicalDisclaimer } from '../../components/MedicalDisclaimer';
import { COLORS } from '../../theme/tokens';
import { showError } from '../../utils/alert';

const TEAL = COLORS.primary;

const SESSION_OPTIONS = [
  { key: 'MORNING', label: 'Sáng', icon: '☀️' },
  { key: 'NOON', label: 'Trưa', icon: '🌤️' },
  { key: 'AFTERNOON', label: 'Chiều', icon: '⛅' },
  { key: 'EVENING', label: 'Tối', icon: '🌙' },
];

const MEAL_OPTIONS = [
  { value: 'BEFORE_MEAL', label: 'Trước ăn' },
  { value: 'AFTER_MEAL', label: 'Sau ăn' },
  { value: 'DURING_MEAL', label: 'Trong bữa ăn' },
  { value: 'NONE', label: 'Không liên quan' },
];

export const PrescriptionEditScreen = ({ route, navigation }: any) => {
  const original: Prescription = route?.params?.prescription;

  const [doctorName, setDoctorName] = useState(original?.doctorName || '');
  const [patientName, setPatientName] = useState(original?.patientName || '');
  const [startDate, setStartDate] = useState(original?.startDate || '');
  const [diagnosis, setDiagnosis] = useState(original?.diagnosis || '');
  const [notes, setNotes] = useState(original?.notes || '');
  const [medications, setMedications] = useState<PrescriptionMedication[]>(
    original?.medications?.map(m => ({ ...m })) || []
  );
  const [saving, setSaving] = useState(false);
  const [showMealPicker, setShowMealPicker] = useState<number | null>(null);

  const handleCancel = () => navigation.goBack();

  const handleDelete = () => {
    Alert.alert('Xóa đơn thuốc', 'Bạn có chắc chắn muốn xóa đơn thuốc này không?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa', style: 'destructive', onPress: async () => {
          try {
            await deletePrescription(original._id);
            navigation.popToTop();
          } catch (e) {
            showError('Lỗi', 'Không thể xóa đơn thuốc');
          }
        },
      },
    ]);
  };

  const handleSave = async () => {
    // Validate
    const activeMeds = medications.filter(m => m.isActive);
    for (const med of activeMeds) {
      if (!med.name.trim()) {
        showError('Thiếu thông tin', 'Tên thuốc không được để trống');
        return;
      }
    }

    setSaving(true);
    try {
      await updatePrescription(original._id, {
        doctorName, patientName, startDate, diagnosis, notes, medications,
      } as any);

      Alert.alert('✅ Thành công', 'Đơn thuốc đã được lưu và lịch nhắc nhở đã được tạo.', [
        { text: 'OK', onPress: () => navigation.popToTop() },
      ]);
    } catch (err) {
      showError('Lỗi', 'Không thể lưu đơn thuốc. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const updateMed = (index: number, field: keyof PrescriptionMedication, value: any) => {
    setMedications(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const toggleSession = (medIdx: number, session: string) => {
    setMedications(prev => {
      const copy = [...prev];
      const med = { ...copy[medIdx] };
      const sessions = [...(med.sessions || [])];
      const idx = sessions.indexOf(session);
      if (idx >= 0) sessions.splice(idx, 1);
      else sessions.push(session);
      med.sessions = sessions;
      copy[medIdx] = med;
      return copy;
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>Hủy</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chỉnh sửa</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleDelete} style={styles.headerIcon}>
            <Icon name="delete-outline" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.headerBtn}>
            <Text style={[styles.headerBtnText, saving && { opacity: 0.5 }]}>
              {saving ? 'Đang lưu...' : 'Lưu'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* General Info Form */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Thông tin chung</Text>
          <FormField label="Bác sĩ kê đơn" value={doctorName} onChange={setDoctorName} />
          <FormField label="Bệnh nhân" value={patientName} onChange={setPatientName} />
          <FormField label="Ngày bắt đầu" value={startDate} onChange={setStartDate} placeholder="DD/MM/YYYY" />
          <FormField label="Chẩn đoán" value={diagnosis} onChange={setDiagnosis} />
          <FormField label="Ghi chú" value={notes} onChange={setNotes} multiline />
        </View>

        {/* Medications Form */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Danh sách thuốc</Text>

          {medications.map((med, idx) => {
            const disabled = !med.isActive;
            return (
              <View key={idx} style={[styles.medCard, disabled && styles.medCardDisabled, med.confidence < 0.8 && styles.medCardWarning]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Text style={[styles.medTitle, { marginBottom: 0 }]}>{med.name || `Thuốc ${idx + 1}`}</Text>
                  {med.confidence < 0.8 && (
                    <View style={styles.warningBadge}>
                      <Icon name="warning" size={14} color="#D97706" />
                      <Text style={styles.warningText}>Cần xác nhận</Text>
                    </View>
                  )}
                </View>

                <View style={disabled ? styles.disabledOverlay : undefined} pointerEvents={disabled ? 'none' : 'auto'}>
                  <FormField label="Tên thuốc" value={med.name} onChange={v => updateMed(idx, 'name', v)} />
                  <FormField label="Hướng dẫn sử dụng" value={med.instructions} onChange={v => updateMed(idx, 'instructions', v)} />

                  {/* Sessions Checkboxes */}
                  <Text style={styles.fieldLabel}>Thời điểm uống</Text>
                  <View style={styles.sessionsRow}>
                    {SESSION_OPTIONS.map(s => {
                      const active = med.sessions?.includes(s.key);
                      return (
                        <TouchableOpacity
                          key={s.key}
                          style={[styles.sessionBtn, active && styles.sessionBtnActive]}
                          onPress={() => toggleSession(idx, s.key)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.sessionIcon}>{s.icon}</Text>
                          <Text style={[styles.sessionLabel, active && styles.sessionLabelActive]}>{s.label}</Text>
                          {active && <Icon name="check" size={14} color={TEAL} />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Dosage */}
                  <Text style={styles.fieldLabel}>Liều uống/lần</Text>
                  <View style={styles.quantityRow}>
                    <TextInput
                      style={styles.quantityInput}
                      value={med.dosage || ''}
                      onChangeText={v => updateMed(idx, 'dosage', v)}
                      placeholder="VD: 1, 0.5..."
                    />
                    <View style={styles.unitPicker}>
                      {['Viên', 'Gói', 'Chai'].map(u => (
                        <TouchableOpacity
                          key={u}
                          style={[styles.unitBtn, med.unit === u && styles.unitBtnActive]}
                          onPress={() => updateMed(idx, 'unit', u)}
                        >
                          <Text style={[styles.unitText, med.unit === u && styles.unitTextActive]}>{u}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Meal Timing */}
                  <Text style={styles.fieldLabel}>Thời điểm so với bữa ăn</Text>
                  <View style={styles.mealRow}>
                    {MEAL_OPTIONS.map(opt => (
                      <TouchableOpacity
                        key={opt.value}
                        style={[styles.mealBtn, med.mealTiming === opt.value && styles.mealBtnActive]}
                        onPress={() => updateMed(idx, 'mealTiming', opt.value)}
                      >
                        <Text style={[styles.mealText, med.mealTiming === opt.value && styles.mealTextActive]}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Toggle Active */}
                <TouchableOpacity
                  style={styles.toggleRow}
                  onPress={() => updateMed(idx, 'isActive', !med.isActive)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, !med.isActive && styles.checkboxActive]}>
                    {!med.isActive && <Icon name="check" size={14} color="#fff" />}
                  </View>
                  <Text style={styles.toggleText}>Không sử dụng thuốc này</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        <MedicalDisclaimer />
      </ScrollView>
    </SafeAreaView>
  );
};

const FormField = ({ label, value, onChange, placeholder, multiline }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean;
}) => (
  <View style={styles.field}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput
      style={[styles.fieldInput, multiline && styles.fieldMultiline]}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder || label}
      placeholderTextColor="#C7C7CC"
      multiline={multiline}
    />
  </View>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { backgroundColor: TEAL, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12 },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#fff' },
  headerBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  headerBtnText: { fontSize: 15, fontWeight: '500', color: '#fff' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerIcon: { padding: 4 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 20, marginHorizontal: 16, marginTop: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1C1C1E', marginBottom: 16 },
  // Form Field
  field: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#6B7280', marginBottom: 6 },
  fieldInput: { borderBottomWidth: 1, borderBottomColor: '#E5E5EA', paddingVertical: 8, fontSize: 15, color: '#1C1C1E' },
  fieldMultiline: { minHeight: 60, textAlignVertical: 'top' },
  // Medication Card
  medCard: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: 'transparent' },
  medCardDisabled: { opacity: 0.45 },
  medCardWarning: { borderColor: '#FCD34D', backgroundColor: '#FEFCE8' },
  warningBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  warningText: { fontSize: 12, color: '#D97706', fontWeight: '600' },
  medTitle: { fontSize: 16, fontWeight: '700', color: '#1C1C1E', marginBottom: 12 },
  disabledOverlay: { opacity: 0.4 },
  // Sessions
  sessionsRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  sessionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1.5, borderColor: '#E5E5EA', backgroundColor: '#fff' },
  sessionBtnActive: { borderColor: TEAL, backgroundColor: TEAL + '0D' },
  sessionIcon: { fontSize: 14 },
  sessionLabel: { fontSize: 12, fontWeight: '500', color: '#6B7280' },
  sessionLabelActive: { color: TEAL, fontWeight: '600' },
  // Quantity
  quantityRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  quantityInput: { flex: 1, borderBottomWidth: 1, borderBottomColor: '#E5E5EA', paddingVertical: 8, fontSize: 16, color: '#1C1C1E', fontWeight: '600' },
  unitPicker: { flexDirection: 'row', gap: 6 },
  unitBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E5E5EA', backgroundColor: '#fff' },
  unitBtnActive: { borderColor: TEAL, backgroundColor: TEAL + '12' },
  unitText: { fontSize: 12, color: '#6B7280' },
  unitTextActive: { color: TEAL, fontWeight: '600' },
  // Meal Timing
  mealRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  mealBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: '#E5E5EA', backgroundColor: '#fff' },
  mealBtnActive: { borderColor: TEAL, backgroundColor: TEAL + '12' },
  mealText: { fontSize: 12, color: '#6B7280' },
  mealTextActive: { color: TEAL, fontWeight: '600' },
  // Toggle
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E5E5EA' },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: '#EF4444', borderColor: '#EF4444' },
  toggleText: { fontSize: 13, color: '#6B7280' },
});
