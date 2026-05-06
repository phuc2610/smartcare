import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { createMedication } from '../../services/medication.service';
import { MedicalDisclaimer } from '../../components/MedicalDisclaimer';
import { COLORS } from '../../theme/tokens';
import { showError } from '../../utils/alert';

const TEAL = COLORS.primary;

const SESSION_OPTIONS = [
  { key: 'MORNING', label: 'Sáng', icon: '☀️' },
  { key: 'NOON', label: 'Trưa', icon: '🌤️' },
  { key: 'AFTERNOON', label: 'Chiều', icon: '⛅' },
  { key: 'EVENING', label: 'Tối', icon: '🌙' },
] as const;

const MEAL_OPTIONS = [
  { value: 'BEFORE_MEAL', label: 'Trước ăn' },
  { value: 'AFTER_MEAL', label: 'Sau ăn' },
  { value: 'DURING_MEAL', label: 'Trong bữa ăn' },
  { value: 'NONE', label: 'Không liên quan' },
] as const;

export const ManualMedicationAddScreen = () => {
  const navigation = useNavigation<any>();

  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [unit, setUnit] = useState('Viên');
  const [notes, setNotes] = useState('');
  const [frequency, setFrequency] = useState<'DAILY' | 'EVERY_OTHER_DAY'>('DAILY');
  const [sessions, setSessions] = useState<('MORNING'|'NOON'|'EVENING')[]>([]);
  const [mealTiming, setMealTiming] = useState<'BEFORE_MEAL'|'AFTER_MEAL'|'NONE'>('NONE');
  const [saving, setSaving] = useState(false);

  const handleCancel = () => navigation.goBack();

  const handleSave = async () => {
    if (!name.trim()) {
      showError('Thiếu thông tin', 'Tên thuốc không được để trống');
      return;
    }
    if (!dosage.trim()) {
      showError('Thiếu thông tin', 'Vui lòng nhập liều uống/lần');
      return;
    }
    if (sessions.length === 0) {
      showError('Thiếu thông tin', 'Vui lòng chọn ít nhất một thời điểm uống trong ngày');
      return;
    }

    setSaving(true);
    try {
      // API expects MORNING, NOON, EVENING. AFTERNOON is not supported by backend schema, map it or just use MORNING/NOON/EVENING.
      // Assuming backend only supports MORNING, NOON, EVENING based on Zod schema. 
      // Filter out AFTERNOON or map to NOON/EVENING. Let's just use MORNING, NOON, EVENING in the options.
      const validSessions = sessions.filter(s => ['MORNING', 'NOON', 'EVENING'].includes(s));

      await createMedication({
        name,
        dosage,
        unit,
        notes,
        frequency,
        sessions: validSessions,
        mealTiming,
        startDate: new Date().toISOString(),
      });

      Alert.alert('✅ Thành công', 'Thuốc đã được lưu và lịch nhắc nhở đã được tạo.', [
        { text: 'OK', onPress: () => navigation.navigate('MedicationManage') },
      ]);
    } catch (err) {
      showError('Lỗi', 'Không thể lưu thuốc. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const toggleSession = (sessionKey: string) => {
    if (sessionKey === 'AFTERNOON') return; // Not supported by backend
    
    setSessions(prev => {
      const idx = prev.indexOf(sessionKey as any);
      if (idx >= 0) return prev.filter(s => s !== sessionKey);
      return [...prev, sessionKey as any];
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.headerBtn}>
          <Text style={styles.headerBtnText}>Hủy</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nhập thuốc thủ công</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.headerBtn}>
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.headerBtnText}>Lưu</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Thông tin thuốc</Text>
          
          <FormField label="Tên thuốc" value={name} onChange={setName} placeholder="VD: Vitamin C, Paracetamol..." />
          
          {/* Dosage & Unit */}
          <Text style={styles.fieldLabel}>Liều uống/lần</Text>
          <View style={styles.quantityRow}>
            <TextInput
              style={styles.quantityInput}
              value={dosage}
              onChangeText={setDosage}
              placeholder="VD: 1, 0.5..."
              keyboardType="numeric"
            />
            <View style={styles.unitPicker}>
              {['Viên', 'Gói', 'Chai'].map(u => (
                <TouchableOpacity
                  key={u}
                  style={[styles.unitBtn, unit === u && styles.unitBtnActive]}
                  onPress={() => setUnit(u)}
                >
                  <Text style={[styles.unitText, unit === u && styles.unitTextActive]}>{u}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Frequency */}
          <Text style={styles.fieldLabel}>Tần suất uống</Text>
          <View style={styles.mealRow}>
            <TouchableOpacity
              style={[styles.mealBtn, frequency === 'DAILY' && styles.mealBtnActive]}
              onPress={() => setFrequency('DAILY')}
            >
              <Text style={[styles.mealText, frequency === 'DAILY' && styles.mealTextActive]}>Hàng ngày</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.mealBtn, frequency === 'EVERY_OTHER_DAY' && styles.mealBtnActive]}
              onPress={() => setFrequency('EVERY_OTHER_DAY')}
            >
              <Text style={[styles.mealText, frequency === 'EVERY_OTHER_DAY' && styles.mealTextActive]}>Cách ngày</Text>
            </TouchableOpacity>
          </View>

          {/* Sessions Checkboxes */}
          <Text style={styles.fieldLabel}>Thời điểm uống</Text>
          <View style={styles.sessionsRow}>
            {SESSION_OPTIONS.filter(s => s.key !== 'AFTERNOON').map(s => {
              const active = sessions.includes(s.key as any);
              return (
                <TouchableOpacity
                  key={s.key}
                  style={[styles.sessionBtn, active && styles.sessionBtnActive]}
                  onPress={() => toggleSession(s.key)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.sessionIcon}>{s.icon}</Text>
                  <Text style={[styles.sessionLabel, active && styles.sessionLabelActive]}>{s.label}</Text>
                  {active && <Icon name="check" size={14} color={TEAL} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Meal Timing */}
          <Text style={styles.fieldLabel}>Liên quan đến bữa ăn</Text>
          <View style={styles.mealRow}>
            {MEAL_OPTIONS.filter(opt => opt.value !== 'DURING_MEAL').map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.mealBtn, mealTiming === opt.value && styles.mealBtnActive]}
                onPress={() => setMealTiming(opt.value as any)}
              >
                <Text style={[styles.mealText, mealTiming === opt.value && styles.mealTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <FormField label="Ghi chú (Tùy chọn)" value={notes} onChange={setNotes} placeholder="Cách pha, uống với nước ấm..." multiline />
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
  header: { backgroundColor: TEAL, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, minHeight: 52 },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#fff' },
  headerBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  headerBtnText: { fontSize: 16, fontWeight: '500', color: '#fff' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 20, marginHorizontal: 16, marginTop: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1C1C1E', marginBottom: 20 },
  field: { marginBottom: 20 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#4B5563', marginBottom: 8 },
  fieldInput: { borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, color: '#1C1C1E', backgroundColor: '#FAFAFA' },
  fieldMultiline: { minHeight: 80, textAlignVertical: 'top' },
  
  // Sessions
  sessionsRow: { flexDirection: 'row', gap: 10, marginBottom: 20, flexWrap: 'wrap' },
  sessionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1.5, borderColor: '#E5E5EA', backgroundColor: '#fff' },
  sessionBtnActive: { borderColor: TEAL, backgroundColor: TEAL + '10' },
  sessionIcon: { fontSize: 16 },
  sessionLabel: { fontSize: 14, fontWeight: '500', color: '#6B7280' },
  sessionLabelActive: { color: TEAL, fontWeight: '700' },
  
  // Quantity
  quantityRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  quantityInput: { flex: 1, borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, fontSize: 16, color: '#1C1C1E', fontWeight: '600', backgroundColor: '#FAFAFA' },
  unitPicker: { flexDirection: 'row', gap: 6 },
  unitBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: '#E5E5EA', backgroundColor: '#fff' },
  unitBtnActive: { borderColor: TEAL, backgroundColor: TEAL + '12' },
  unitText: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  unitTextActive: { color: TEAL, fontWeight: '700' },
  
  // Meal Timing
  mealRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  mealBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: '#E5E5EA', backgroundColor: '#fff' },
  mealBtnActive: { borderColor: TEAL, backgroundColor: TEAL + '12' },
  mealText: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  mealTextActive: { color: TEAL, fontWeight: '700' },
});
