import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Switch, ActionSheetIOS, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { launchImageLibrary, launchCamera, ImagePickerResponse, MediaType, PhotoQuality } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../../contexts/AuthContext';
import { updateProfile as updateProfileAPI } from '../../services/user.service';
import { uploadImage } from '../../services/upload.service';
import { identifyDisease } from '../../services/ai.service';
import { UserRole } from '../../types';
import { COLORS } from '../../theme/tokens';
import { Avatar } from '../../components/Avatar';
import { showInfo } from '../../utils/alert';

const TEAL = COLORS.primary;

export const ProfileScreen = ({ navigation, route }: any) => {
  const { user, updateProfile, signOut } = useAuth();
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [conditionInput, setConditionInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (user) {
      setHeight(user.height?.toString() || '');
      setWeight(user.weight?.toString() || '');
      if (user.role === UserRole.PATIENT) {
        if (user.medicalCondition && user.medicalCondition !== 'Normal' && user.medicalCondition !== 'Bình thường' && user.medicalCondition !== 'Other' && user.medicalCondition !== 'Khác') {
          setConditionInput(user.medicalCondition);
        } else { setConditionInput(''); }
      } else { setConditionInput(''); }
    }
  }, [user]);

  const handleChangeAvatar = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions({ options: ['Hủy', 'Chụp ảnh', 'Chọn từ thư viện'], cancelButtonIndex: 0 }, (i) => { if (i === 1) handleImagePicker('camera'); else if (i === 2) handleImagePicker('library'); });
    } else {
      Alert.alert('Đổi ảnh đại diện', '', [{ text: 'Hủy', style: 'cancel' }, { text: 'Chụp ảnh', onPress: () => handleImagePicker('camera') }, { text: 'Chọn từ thư viện', onPress: () => handleImagePicker('library') }]);
    }
  };

  const handleImagePicker = async (source: 'camera' | 'library') => {
    const options = { mediaType: 'photo' as MediaType, quality: 0.8 as PhotoQuality, maxWidth: 1024, maxHeight: 1024 };
    try {
      const response: ImagePickerResponse = source === 'camera' ? await launchCamera(options) : await launchImageLibrary(options);
      if (response.didCancel || !response.assets?.[0]?.uri) return;
      setUploadingAvatar(true);
      const uploadResult = await uploadImage(response.assets[0].uri);
      const updatedUser = await updateProfileAPI({ avatar: uploadResult.url });
      updateProfile(updatedUser.user);
      const { showSuccess } = require('../../utils/alert');
      showSuccess('Thành công', 'Đã cập nhật ảnh đại diện');
    } catch (error: any) {
      Alert.alert('Lỗi', 'Không thể tải ảnh lên');
    } finally { setUploadingAvatar(false); }
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true); setAnalyzing(true);
    try {
      const updateData: any = { height: Number(height) || undefined, weight: Number(weight) || undefined };
      if (user.role === UserRole.PATIENT) {
        let finalCondition = user.medicalCondition || 'Normal';
        if (conditionInput.trim()) { const result = await identifyDisease(conditionInput); finalCondition = result.condition || finalCondition; }
        if (!conditionInput.trim() && !user.medicalCondition) finalCondition = 'Normal';
        updateData.medicalCondition = finalCondition;
      }
      const updatedUser = await updateProfileAPI(updateData);
      updateProfile(updatedUser.user);
      if (user.role === UserRole.PATIENT && updateData.medicalCondition) Alert.alert('Thành công', `Đã lưu hồ sơ!\nHệ thống ghi nhận: ${updateData.medicalCondition}`);
      else Alert.alert('Thành công', 'Đã lưu hồ sơ!');
    } catch (error: any) {
      try {
        const updateData: any = { height: Number(height) || undefined, weight: Number(weight) || undefined };
        if (user.role === UserRole.PATIENT && user.medicalCondition) updateData.medicalCondition = user.medicalCondition;
        const updatedUser = await updateProfileAPI(updateData);
        updateProfile(updatedUser.user);
        Alert.alert('Thành công', 'Đã lưu thông tin');
      } catch (saveError: any) { Alert.alert('Lỗi', saveError.response?.data?.error || 'Không thể lưu'); }
    } finally { setAnalyzing(false); setLoading(false); }
  };

  const handleSignOut = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert('Xóa tài khoản', 'Tính năng này đang được phát triển. Vui lòng liên hệ hỗ trợ để xóa tài khoản.', [{ text: 'OK' }]);
  };

  const menuItems = [
    { icon: 'people-outline', label: 'Người thân & phụ thuộc', onPress: () => navigation?.navigate('Dependents'), color: '#1C1C1E' },
    { icon: 'settings', label: 'Cài đặt', onPress: () => navigation?.navigate('Settings'), color: '#1C1C1E' },
    { icon: 'lock-outline', label: 'Đổi mật khẩu', onPress: () => navigation?.navigate('ChangePassword'), color: '#1C1C1E' },
    { icon: 'info-outline', label: 'Giới thiệu ứng dụng', onPress: () => showInfo('SmartCare', 'Phiên bản 1.0.0\nỨng dụng chăm sóc sức khỏe thông minh'), color: '#1C1C1E' },
    { icon: 'delete-outline', label: 'Xóa tài khoản', onPress: handleDeleteAccount, color: '#9CA3AF' },
    { icon: 'logout', label: 'Đăng xuất', onPress: handleSignOut, color: '#EF4444' },
  ];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Hồ sơ cá nhân</Text>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Profile Card */}
        <View style={s.heroCard}>
          <TouchableOpacity onPress={handleChangeAvatar} disabled={uploadingAvatar} activeOpacity={0.7}>
            <View style={s.avatarWrap}>
              <Avatar name={user?.name || 'U'} size={88} avatarUrl={user?.avatar} backgroundColor={TEAL} />
              {uploadingAvatar && (
                <View style={s.avatarOverlay}><Text style={s.avatarOverlayText}>Đang tải...</Text></View>
              )}
              <View style={s.avatarBadge}><Icon name="camera-alt" size={14} color={TEAL} /></View>
            </View>
          </TouchableOpacity>
          <Text style={s.heroName}>{user?.name}</Text>
          <Text style={s.heroPhone}>{user?.phone}</Text>
          <View style={s.tagsRow}>
            <View style={s.tagRole}><Text style={s.tagRoleText}>{user?.role === UserRole.PATIENT ? 'Người bệnh' : 'Người thân'}</Text></View>
            {user?.role === UserRole.PATIENT && user?.medicalCondition && user.medicalCondition !== 'Normal' && user.medicalCondition !== 'Bình thường' && (
              <View style={s.tagCondition}><Text style={s.tagConditionText}>{user.medicalCondition}</Text></View>
            )}
          </View>
          <TouchableOpacity style={s.editProfileBtn} onPress={handleSave} disabled={loading} activeOpacity={0.8}>
            <Icon name="edit" size={16} color={TEAL} />
            <Text style={s.editProfileText}>{loading ? 'Đang lưu...' : 'Chỉnh sửa'}</Text>
          </TouchableOpacity>
        </View>

        {/* Fall Detection */}
        {user?.role === UserRole.PATIENT && (
          <TouchableOpacity style={s.fallCard} onPress={() => showInfo('Tính năng đang phát triển', 'Chức năng cảnh báo té ngã sẽ được phát triển sớm.')} activeOpacity={0.7}>
            <View style={s.fallRow}>
              <View style={s.fallLeft}>
                <Text style={s.fallIcon}>⚠️</Text>
                <View>
                  <Text style={s.fallTitle}>Cảnh báo té ngã</Text>
                  <Text style={s.fallSub}>{isMonitoring ? 'Đang theo dõi cảm biến' : 'Đã tắt giám sát'}</Text>
                </View>
              </View>
              <Switch value={isMonitoring} onValueChange={() => showInfo('Tính năng đang phát triển', 'Chức năng cảnh báo té ngã sẽ được phát triển sớm.')} trackColor={{ false: '#E5E5EA', true: '#EF4444' }} thumbColor="#fff" />
            </View>
          </TouchableOpacity>
        )}

        {/* Body Metrics Card */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Chỉ số cơ thể</Text>
          <View style={s.fieldRow}>
            <View style={s.fieldHalf}>
              <Text style={s.fieldLabel}>Chiều cao (cm)</Text>
              <TextInput style={s.fieldInput} placeholder="155" value={height} onChangeText={setHeight} keyboardType="numeric" placeholderTextColor="#C7C7CC" />
            </View>
            <View style={s.fieldHalf}>
              <Text style={s.fieldLabel}>Cân nặng (kg)</Text>
              <TextInput style={s.fieldInput} placeholder="50" value={weight} onChangeText={setWeight} keyboardType="numeric" placeholderTextColor="#C7C7CC" />
            </View>
          </View>
          {user?.role === UserRole.PATIENT && (
            <>
              <Text style={s.fieldLabel}>Tình trạng bệnh lý {analyzing && <Text style={s.analyzingText}>AI đang phân tích...</Text>}</Text>
              <TextInput style={s.fieldInput} placeholder="VD: Tôi bị tiểu đường và mỡ máu..." value={conditionInput} onChangeText={setConditionInput} placeholderTextColor="#C7C7CC" />
              <Text style={s.helpText}>* Nhập mô tả bệnh, AI sẽ tự động nhận diện nhóm bệnh</Text>
            </>
          )}
          <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={loading} activeOpacity={0.8}>
            <Text style={s.saveBtnText}>{loading ? 'Đang lưu...' : 'Lưu & Phân tích'}</Text>
          </TouchableOpacity>
        </View>



        {/* Settings Menu */}
        <View style={s.card}>
          {menuItems.map((item, i) => (
            <React.Fragment key={i}>
              {i > 0 && <View style={s.divider} />}
              <TouchableOpacity style={s.menuItem} onPress={item.onPress} activeOpacity={0.6}>
                <Icon name={item.icon} size={22} color={item.color} />
                <Text style={[s.menuLabel, { color: item.color }]}>{item.label}</Text>
                <Icon name="chevron-right" size={20} color="#D1D5DB" />
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { backgroundColor: TEAL, paddingVertical: 14, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#fff' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 16 },
  // Hero Card
  heroCard: { backgroundColor: TEAL, borderRadius: 20, padding: 28, alignItems: 'center', marginTop: 16 },
  avatarWrap: { position: 'relative', marginBottom: 12 },
  avatarOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 44, justifyContent: 'center', alignItems: 'center' },
  avatarOverlayText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  avatarBadge: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: TEAL },
  heroName: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 2 },
  heroPhone: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 12 },
  tagsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tagRole: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20 },
  tagRoleText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  tagCondition: { backgroundColor: '#FEF3C7', paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20 },
  tagConditionText: { fontSize: 12, fontWeight: '600', color: '#D97706' },
  editProfileBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 24 },
  editProfileText: { fontSize: 14, fontWeight: '600', color: TEAL },
  // Fall Detection
  fallCard: { backgroundColor: '#FEF2F2', borderRadius: 12, padding: 16, marginTop: 16, borderWidth: 1, borderColor: '#FECACA' },
  fallRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fallLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  fallIcon: { fontSize: 20 },
  fallTitle: { fontSize: 15, fontWeight: '700', color: '#DC2626' },
  fallSub: { fontSize: 12, color: '#EF4444', opacity: 0.7, marginTop: 2 },
  // Cards
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 20, marginTop: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1C1C1E', marginBottom: 6 },
  cardSub: { fontSize: 13, color: '#8E8E93', marginBottom: 16, lineHeight: 19 },
  // Fields
  fieldRow: { flexDirection: 'row', gap: 12 },
  fieldHalf: { flex: 1 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#6B7280', marginBottom: 6, marginTop: 12 },
  fieldInput: { backgroundColor: '#F5F5F5', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1C1C1E', borderWidth: 1, borderColor: '#ECECEC' },
  analyzingText: { fontSize: 11, color: TEAL, fontWeight: '400' },
  helpText: { fontSize: 11, color: '#9CA3AF', marginTop: 4, marginBottom: 8 },
  // Buttons
  saveBtn: { backgroundColor: TEAL, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  // Menu
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 14 },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#F3F4F6' },
});
