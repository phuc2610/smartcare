import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { MedicalDisclaimer } from '../../components/MedicalDisclaimer';
import { COLORS } from '../../theme/tokens';
import type { Prescription } from '../../services/prescription.service';

const TEAL = COLORS.primary;

const MED_COLORS = [COLORS.primary, '#E67E22', '#3498DB', '#9B59B6', '#E74C3C', '#2ECC71'];

// ── Confidence helpers ──
const getConfidenceLevel = (score: number) => {
  if (score >= 0.8) return { label: 'Chính xác cao', color: '#27AE60', icon: 'verified', bg: '#E8F5E9' };
  if (score >= 0.5) return { label: 'Cần kiểm tra', color: '#E67E22', icon: 'warning-amber', bg: '#FFF8E1' };
  return { label: 'Không chắc chắn', color: '#E74C3C', icon: 'error-outline', bg: '#FFEBEE' };
};

const getOverallBadge = (score: number) => {
  if (score >= 0.75) return { label: 'Kết quả tốt', color: '#27AE60', icon: 'check-circle', message: 'AI đã xác minh thành công. Vui lòng kiểm tra lại trước khi lưu.' };
  if (score >= 0.45) return { label: 'Cần xem lại', color: '#E67E22', icon: 'warning-amber', message: 'Một số thông tin có thể chưa chính xác. Vui lòng kiểm tra kỹ từng thuốc.' };
  return { label: 'Kết quả kém', color: '#E74C3C', icon: 'error', message: 'AI gặp khó khăn khi đọc đơn thuốc. Nên chụp lại ảnh rõ hơn hoặc nhập tay.' };
};

export const PrescriptionViewScreen = ({ route, navigation }: any) => {
  const prescription: Prescription | undefined = route?.params?.prescription;
  const loading: boolean = route?.params?.loading || false;

  const [showRawText, setShowRawText] = useState(false);

  const handleClose = () => navigation.goBack();
  const handleEdit = () => {
    navigation.navigate('PrescriptionEdit', { prescription });
  };
  const handleRescan = () => {
    // Go back to Add screen to rescan
    navigation.navigate('MainTabs', { screen: 'Add' });
  };

  // ─────────────────────────────────────────────────
  // Loading state
  // ─────────────────────────────────────────────────
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
          <Text style={styles.loadingSub}>AI đang nhận diện và xác minh thông tin</Text>
        </View>
      </SafeAreaView>
    );
  }

  const qualityScore = prescription.qualityScore ?? 0.5;
  const overallBadge = getOverallBadge(qualityScore);

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
        {/* ── Quality Score Banner ── */}
        <View style={[styles.qualityBanner, { backgroundColor: overallBadge.color + '0D', borderColor: overallBadge.color + '30' }]}>
          <View style={styles.qualityBannerTop}>
            <Icon name={overallBadge.icon} size={20} color={overallBadge.color} />
            <Text style={[styles.qualityBannerLabel, { color: overallBadge.color }]}>
              {overallBadge.label}
            </Text>
            <View style={[styles.qualityScoreBadge, { backgroundColor: overallBadge.color }]}>
              <Text style={styles.qualityScoreText}>{Math.round(qualityScore * 100)}%</Text>
            </View>
          </View>
          <Text style={styles.qualityBannerMessage}>{overallBadge.message}</Text>
          {prescription.verificationNotes ? (
            <View style={styles.verifyNotesRow}>
              <Icon name="fact-check" size={14} color="#6B7280" />
              <Text style={styles.verifyNotesText}>AI: {prescription.verificationNotes}</Text>
            </View>
          ) : null}
        </View>

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

        {/* Card 2: Medication List with Confidence */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Danh sách thuốc</Text>
          {prescription.medications && prescription.medications.length > 0 ? (
            prescription.medications.map((med, idx) => {
              const conf = getConfidenceLevel(med.confidence ?? 0.5);
              return (
                <View key={idx} style={styles.medCard}>
                  <View style={styles.medHeader}>
                    <View style={[styles.medIcon, { backgroundColor: MED_COLORS[idx % MED_COLORS.length] + '18' }]}>
                      <Icon name="medication" size={24} color={MED_COLORS[idx % MED_COLORS.length]} />
                    </View>
                    {/* Confidence badge */}
                    <View style={[styles.confBadge, { backgroundColor: conf.bg }]}>
                      <Icon name={conf.icon} size={12} color={conf.color} />
                      <Text style={[styles.confBadgeText, { color: conf.color }]}>{conf.label}</Text>
                    </View>
                  </View>
                  <View style={styles.medInfo}>
                    <Text style={styles.medName}>{med.name}</Text>
                    <Text style={styles.medQuantity}>{med.quantity} {med.unit}</Text>
                    <Text style={styles.medDosage}>{med.dosage}{med.instructions ? ` • ${med.instructions}` : ''}</Text>
                    {med.usage ? <Text style={styles.medUsage}>Công dụng: {med.usage}</Text> : null}
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={styles.emptyMed}>Không nhận diện được thuốc từ đơn</Text>
          )}
        </View>

        {/* ── Raw Text (collapsible) ── */}
        {prescription.rawText ? (
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.rawTextToggle}
              onPress={() => setShowRawText(!showRawText)}
              activeOpacity={0.7}
            >
              <Icon name="text-snippet" size={18} color="#6B7280" />
              <Text style={styles.rawTextToggleLabel}>Văn bản gốc OCR đọc được</Text>
              <Icon name={showRawText ? 'expand-less' : 'expand-more'} size={20} color="#8E8E93" />
            </TouchableOpacity>
            {showRawText && (
              <View style={styles.rawTextBox}>
                <Text style={styles.rawTextContent}>{prescription.rawText}</Text>
                <Text style={styles.rawTextHint}>
                  Đối chiếu text gốc với kết quả AI bên trên để đảm bảo chính xác
                </Text>
              </View>
            )}
          </View>
        ) : null}

        {/* ── Action Buttons ── */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.editBtn} onPress={handleEdit} activeOpacity={0.8}>
            <Icon name="edit" size={18} color="#fff" />
            <Text style={styles.editBtnText}>Chỉnh sửa & Xác nhận</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.rescanBtn} onPress={handleRescan} activeOpacity={0.8}>
            <Icon name="replay" size={18} color={TEAL} />
            <Text style={styles.rescanBtnText}>Quét lại đơn thuốc</Text>
          </TouchableOpacity>
        </View>

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

  // ── Quality Banner ──
  qualityBanner: { marginHorizontal: 16, marginTop: 16, borderRadius: 12, padding: 16, borderWidth: 1 },
  qualityBannerTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  qualityBannerLabel: { flex: 1, fontSize: 15, fontWeight: '700' },
  qualityScoreBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  qualityScoreText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  qualityBannerMessage: { fontSize: 13, color: '#4A5568', lineHeight: 19 },
  verifyNotesRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#E5E5EA' },
  verifyNotesText: { flex: 1, fontSize: 12, color: '#6B7280', fontStyle: 'italic', lineHeight: 17 },

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
  medCard: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  medHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  medIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  medInfo: { flex: 1 },
  medName: { fontSize: 15, fontWeight: '600', color: TEAL, marginBottom: 2 },
  medQuantity: { fontSize: 13, color: '#1C1C1E', fontWeight: '500', marginBottom: 2 },
  medDosage: { fontSize: 12, color: '#6B7280', marginBottom: 2 },
  medUsage: { fontSize: 11, color: '#9CA3AF', fontStyle: 'italic', marginTop: 2 },
  emptyMed: { fontSize: 14, color: '#8E8E93', textAlign: 'center', paddingVertical: 20 },

  // ── Confidence Badge ──
  confBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  confBadgeText: { fontSize: 11, fontWeight: '600' },

  // ── Raw Text ──
  rawTextToggle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rawTextToggleLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1C1C1E' },
  rawTextBox: { marginTop: 12, padding: 12, backgroundColor: '#F9FAFB', borderRadius: 8, borderWidth: 1, borderColor: '#E5E5EA' },
  rawTextContent: { fontSize: 12, color: '#4A5568', lineHeight: 18, fontFamily: 'monospace' },
  rawTextHint: { marginTop: 8, fontSize: 11, color: '#9CA3AF', fontStyle: 'italic' },

  // ── Action Buttons ──
  actionButtons: { marginHorizontal: 16, marginTop: 16, gap: 10 },
  editBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: TEAL, paddingVertical: 14, borderRadius: 12 },
  editBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  rescanBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#fff', paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: TEAL },
  rescanBtnText: { fontSize: 15, fontWeight: '600', color: TEAL },
});
