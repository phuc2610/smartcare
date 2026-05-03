import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../../contexts/AuthContext';
import { generateLinkCode, submitLinkCode } from '../../services/caregiver.service';
import { linkDoctor, getMyDoctors, revokeDoctor } from '../../services/doctor.service';
import { UserRole } from '../../types';
import { COLORS } from '../../theme/tokens';
import { showInfo } from '../../utils/alert';

const TEAL = COLORS.primary;

export const DependentsScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const [linkLoading, setLinkLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [inputCode, setInputCode] = useState('');
  const [linkSuccessMsg, setLinkSuccessMsg] = useState('');
  const [doctorCode, setDoctorCode] = useState('');
  const [linkDoctorLoading, setLinkDoctorLoading] = useState(false);
  const [myDoctors, setMyDoctors] = useState<any[]>([]);

  const fetchMyDoctors = useCallback(async () => {
    try {
      if (user?.role === UserRole.PATIENT) {
        const res = await getMyDoctors();
        setMyDoctors(res.doctors || []);
      }
    } catch (err) { console.warn('Failed to fetch doctors', err); }
  }, [user]);

  useEffect(() => { fetchMyDoctors(); }, [fetchMyDoctors]);

  const handleGenerateCode = async () => {
    if (!user) return; setLinkLoading(true);
    try { const data = await generateLinkCode(); setGeneratedCode(data.code); }
    catch (error: any) { const status = error?.response?.status; const message = error?.response?.data?.error || error?.message || 'Không thể tạo mã'; Alert.alert('Lỗi', status === 429 ? 'Bạn thao tác quá nhanh, vui lòng thử lại sau.' : message); }
    finally { setLinkLoading(false); }
  };

  const handleSubmitCode = async () => {
    if (!user || !inputCode) return; setLinkLoading(true);
    try { const res = await submitLinkCode(inputCode); setLinkSuccessMsg(`Đã liên kết thành công với bệnh nhân: ${res.patientName}`); setInputCode(''); setTimeout(() => setLinkSuccessMsg(''), 3000); }
    catch (error: any) { Alert.alert('Lỗi', error.response?.data?.error || 'Không thể liên kết'); }
    finally { setLinkLoading(false); }
  };

  const handleLinkDoctor = async () => {
    if (!user || !doctorCode) return; setLinkDoctorLoading(true);
    try { const res = await linkDoctor(doctorCode); showInfo('Kết nối thành công', `Đã liên kết với bác sĩ ${res.doctor.name}`); setDoctorCode(''); fetchMyDoctors(); }
    catch (error: any) { Alert.alert('Lỗi', error.message || 'Không thể liên kết bác sĩ'); }
    finally { setLinkDoctorLoading(false); }
  };

  const handleRevokeDoctor = async (doctorId: string) => {
    Alert.alert('Thu hồi quyền', 'Bạn có chắc chắn muốn ngừng chia sẻ hồ sơ với bác sĩ này?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đồng ý', style: 'destructive', onPress: async () => {
        try { await revokeDoctor(doctorId); showInfo('Thành công', 'Đã thu hồi quyền truy cập'); fetchMyDoctors(); }
        catch (e: any) { Alert.alert('Lỗi', e.message || 'Không thể thu hồi quyền'); }
      }},
    ]);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.headerBtn}><Icon name="arrow-back-ios" size={20} color="#fff" /></TouchableOpacity>
        <Text style={s.headerTitle}>Người thân & Phụ thuộc</Text>
        <View style={s.headerBtn} />
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Section 1: Liên kết người thân (Patient) */}
        {user?.role === UserRole.PATIENT && (
          <View style={s.card}>
            <View style={s.cardHeader}>
              <View style={s.iconWrap}><Icon name="people" size={22} color={TEAL} /></View>
              <Text style={s.cardTitle}>Liên kết người thân</Text>
            </View>
            <Text style={s.cardDesc}>Chia sẻ mã bên dưới cho người thân để họ có thể theo dõi sức khỏe của bạn.</Text>
            {!generatedCode ? (
              <TouchableOpacity style={s.primaryBtn} onPress={handleGenerateCode} disabled={linkLoading} activeOpacity={0.8}>
                <Icon name="qr-code" size={18} color="#fff" />
                <Text style={s.primaryBtnText}>{linkLoading ? 'Đang tạo...' : 'Tạo mã liên kết'}</Text>
              </TouchableOpacity>
            ) : (
              <View style={s.codeSection}>
                <Text style={s.codeLabel}>MÃ CỦA BẠN (Mã cố định)</Text>
                <View style={s.codeBox}>
                  <Text style={s.codeText}>{generatedCode}</Text>
                </View>
                <Text style={s.codeHelp}>Chia sẻ mã này cho người thân. Mã này không thay đổi.</Text>
                <TouchableOpacity style={s.outlineBtn} onPress={() => navigation.navigate('CaregiverRequests')} activeOpacity={0.7}>
                  <Icon name="mail-outline" size={16} color={TEAL} />
                  <Text style={s.outlineBtnText}>Xem yêu cầu liên kết</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Section 2: Bác sĩ của tôi (Patient) */}
        {user?.role === UserRole.PATIENT && (
          <View style={s.card}>
            <View style={s.cardHeader}>
              <View style={[s.iconWrap, { backgroundColor: '#EEF2FF' }]}><Icon name="medical-services" size={22} color="#6366F1" /></View>
              <Text style={s.cardTitle}>Bác sĩ của tôi</Text>
            </View>
            <Text style={s.cardDesc}>Nhập mã định danh của bác sĩ chuyên khoa hoặc phòng khám để liên kết số liệu y tế.</Text>
            <TextInput style={s.linkInput} placeholder="Mã bác sĩ (VD: ABCD123)" value={doctorCode} onChangeText={setDoctorCode} autoCapitalize="characters" textAlign="center" placeholderTextColor="#C7C7CC" />
            <TouchableOpacity style={[s.primaryBtn, !doctorCode && s.btnDisabled]} onPress={handleLinkDoctor} disabled={linkDoctorLoading || !doctorCode} activeOpacity={0.8}>
              <Icon name="link" size={18} color="#fff" />
              <Text style={s.primaryBtnText}>{linkDoctorLoading ? 'Đang kết nối...' : 'Trao quyền truy cập'}</Text>
            </TouchableOpacity>

            {myDoctors.length > 0 && (
              <View style={s.doctorSection}>
                <View style={s.divider} />
                <Text style={s.subSectionTitle}>Bác sĩ đang kết nối</Text>
                {myDoctors.map((doc: any, i: number) => (
                  <View key={i} style={s.doctorRow}>
                    <View style={s.doctorAvatar}><Icon name="person" size={20} color="#6366F1" /></View>
                    <View style={s.doctorInfo}>
                      <Text style={s.doctorName}>BS. {doc.name}</Text>
                      <Text style={s.doctorSpec}>{doc.specialty}</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleRevokeDoctor(doc.doctorId)} style={s.revokeBtn} activeOpacity={0.7}>
                      <Text style={s.revokeText}>Huỷ</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Section: Kết nối người bệnh (Caregiver) */}
        {user?.role === UserRole.CAREGIVER && (
          <View style={s.card}>
            <View style={s.cardHeader}>
              <View style={s.iconWrap}><Icon name="favorite" size={22} color={TEAL} /></View>
              <Text style={s.cardTitle}>Kết nối người bệnh</Text>
            </View>
            <Text style={s.cardDesc}>Nhập mã 6 chữ số từ ứng dụng của người bệnh để bắt đầu theo dõi.</Text>
            {linkSuccessMsg ? (
              <View style={s.successBox}><Icon name="check-circle" size={18} color="#059669" /><Text style={s.successText}>{linkSuccessMsg}</Text></View>
            ) : (
              <>
                <TextInput style={s.linkInput} placeholder="Nhập mã 6 số..." value={inputCode} onChangeText={(t) => setInputCode(t.replace(/[^0-9]/g, '').slice(0, 6))} keyboardType="number-pad" maxLength={6} textAlign="center" placeholderTextColor="#C7C7CC" />
                <TouchableOpacity style={[s.primaryBtn, inputCode.length !== 6 && s.btnDisabled]} onPress={handleSubmitCode} disabled={linkLoading || inputCode.length !== 6} activeOpacity={0.8}>
                  <Icon name="link" size={18} color="#fff" />
                  <Text style={s.primaryBtnText}>{linkLoading ? 'Đang kết nối...' : 'Kết nối ngay'}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { backgroundColor: TEAL, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 14 },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#fff' },
  headerBtn: { width: 36, alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  // Card
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  iconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: TEAL + '15', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#1C1C1E' },
  cardDesc: { fontSize: 13, color: '#8E8E93', lineHeight: 19, marginBottom: 16 },
  // Buttons
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: TEAL, paddingVertical: 14, borderRadius: 12, marginTop: 4 },
  primaryBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  btnDisabled: { backgroundColor: '#E5E5EA' },
  outlineBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: TEAL + '10', paddingVertical: 12, borderRadius: 12, marginTop: 12 },
  outlineBtnText: { fontSize: 14, fontWeight: '600', color: TEAL },
  // Code
  codeSection: { alignItems: 'center' },
  codeLabel: { fontSize: 11, color: '#8E8E93', marginBottom: 8, fontWeight: '600', letterSpacing: 0.5 },
  codeBox: { backgroundColor: '#F5F5F5', borderRadius: 12, paddingVertical: 16, paddingHorizontal: 24, marginBottom: 8 },
  codeText: { fontSize: 32, fontWeight: '800', color: TEAL, letterSpacing: 8, textAlign: 'center' },
  codeHelp: { fontSize: 12, color: '#9CA3AF', marginBottom: 4, textAlign: 'center' },
  // Link Input
  linkInput: { width: '100%', fontSize: 20, fontWeight: '700', letterSpacing: 6, paddingVertical: 14, backgroundColor: '#F5F5F5', borderRadius: 12, textAlign: 'center', color: '#1C1C1E' },
  // Doctor
  doctorSection: { marginTop: 16 },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginBottom: 16 },
  subSectionTitle: { fontSize: 14, fontWeight: '700', color: '#1C1C1E', marginBottom: 12 },
  doctorRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', padding: 14, borderRadius: 12, marginBottom: 8, gap: 12 },
  doctorAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  doctorInfo: { flex: 1 },
  doctorName: { fontWeight: '600', color: '#1C1C1E', fontSize: 15 },
  doctorSpec: { fontSize: 12, color: '#8E8E93', marginTop: 2 },
  revokeBtn: { backgroundColor: '#FEE2E2', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 },
  revokeText: { color: '#EF4444', fontSize: 12, fontWeight: '600' },
  // Success
  successBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ECFDF5', padding: 16, borderRadius: 12 },
  successText: { color: '#059669', fontSize: 14, fontWeight: '600', flex: 1 },
});
