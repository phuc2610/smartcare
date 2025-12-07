import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Switch, ActionSheetIOS, Platform } from 'react-native';
import { launchImageLibrary, launchCamera, ImagePickerResponse, MediaType } from 'react-native-image-picker';
import { useAuth } from '../../contexts/AuthContext';
import { updateProfile as updateProfileAPI } from '../../services/user.service';
import { uploadImage } from '../../services/upload.service';
import { identifyDisease } from '../../services/ai.service';
import { generateLinkCode, submitLinkCode } from '../../services/caregiver.service';
import { UserRole } from '../../types';
import { COLORS } from '../../utils/constants';
import { Avatar } from '../../components/Avatar';
import { Badge } from '../../components/Badge';

export const ProfileScreen = ({ navigation, route }: any) => {
  const { user, updateProfile, signOut } = useAuth();
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [conditionInput, setConditionInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  // Link account states
  const [linkLoading, setLinkLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [inputCode, setInputCode] = useState('');
  const [linkSuccessMsg, setLinkSuccessMsg] = useState('');

  useEffect(() => {
    if (user) {
      setHeight(user.height?.toString() || '');
      setWeight(user.weight?.toString() || '');
      // Keep the original medicalCondition description if it exists, otherwise use empty string
      // If medicalCondition is a standard category (Diabetes, Hypertension, etc.), we'll show it
      // If it's 'Normal' or empty, show empty string for user to input
      if (user.medicalCondition && user.medicalCondition !== 'Normal' && user.medicalCondition !== 'Other') {
        // If it's a standard category, we might want to show it or let user edit
        // For now, show empty to let user input their own description
        setConditionInput('');
      } else {
        setConditionInput('');
      }
    }
  }, [user]);

  const handleChangeAvatar = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [
            'Hủy',
            'Chụp ảnh',
            'Chọn từ thư viện',
          ],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            handleImagePicker('camera');
          } else if (buttonIndex === 2) {
            handleImagePicker('library');
          }
        }
      );
    } else {
      Alert.alert(
        'Đổi ảnh đại diện',
        '',
        [
          { text: 'Hủy', style: 'cancel' },
          { text: 'Chụp ảnh', onPress: () => handleImagePicker('camera') },
          { text: 'Chọn từ thư viện', onPress: () => handleImagePicker('library') },
        ]
      );
    }
  };

  const handleImagePicker = async (source: 'camera' | 'library') => {
    const options = {
      mediaType: 'photo' as MediaType,
      quality: 0.8,
      maxWidth: 1024,
      maxHeight: 1024,
    };

    try {
      const response: ImagePickerResponse = source === 'camera'
        ? await launchCamera(options)
        : await launchImageLibrary(options);

      if (response.didCancel || !response.assets || response.assets.length === 0) {
        return;
      }

      const asset = response.assets[0];
      if (!asset.uri) return;

      setUploadingAvatar(true);
      
      // Upload to Cloudinary
      const uploadResult = await uploadImage(asset.uri);
      
      // Update user profile with avatar URL
      const updatedUser = await updateProfileAPI({
        avatar: uploadResult.url,
      });

      updateProfile(updatedUser.user);
      const { showSuccess } = require('../../utils/alert');
      showSuccess('Thành công', 'Đã cập nhật ảnh đại diện');
    } catch (error: any) {
      console.error('[Profile] Avatar upload error:', error);
      Alert.alert('Lỗi', 'Không thể tải ảnh lên');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    setAnalyzing(true);

    try {
      let finalCondition = user.medicalCondition || 'Normal'; // Keep existing condition by default
      
      // Only identify disease if user has entered new input
      if (conditionInput.trim()) {
        const result = await identifyDisease(conditionInput);
        finalCondition = result.condition || finalCondition; // Use identified condition or keep existing
      }
      // If no input and no existing condition, keep as Normal
      if (!conditionInput.trim() && !user.medicalCondition) {
        finalCondition = 'Normal';
      }

      const updatedUser = await updateProfileAPI({
        height: Number(height) || undefined,
        weight: Number(weight) || undefined,
        medicalCondition: finalCondition,
      });

      updateProfile(updatedUser.user);
      Alert.alert('Thành công', `Đã lưu hồ sơ!\nHệ thống ghi nhận: ${finalCondition}`);
    } catch (error: any) {
      console.error('[Profile] Save error:', error);
      // If AI fails, still save other fields but keep existing medicalCondition
      try {
        const updatedUser = await updateProfileAPI({
          height: Number(height) || undefined,
          weight: Number(weight) || undefined,
          // Don't update medicalCondition if AI failed
        });
        updateProfile(updatedUser.user);
        Alert.alert('Thành công', 'Đã lưu chiều cao và cân nặng');
      } catch (saveError: any) {
        Alert.alert('Lỗi', saveError.response?.data?.error || 'Không thể lưu');
      }
    } finally {
      setAnalyzing(false);
      setLoading(false);
    }
  };

  const handleGenerateCode = async () => {
    if (!user) return;
    setLinkLoading(true);
    try {
      const data = await generateLinkCode();
      setGeneratedCode(data.code);
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.error || 'Không thể tạo mã');
    } finally {
      setLinkLoading(false);
    }
  };

  const handleSubmitCode = async () => {
    if (!user || !inputCode) return;
    setLinkLoading(true);
    try {
      const res = await submitLinkCode(inputCode);
      setLinkSuccessMsg(`Đã liên kết thành công với bệnh nhân: ${res.patientName}`);
      setInputCode('');
      // Refresh user data
      setTimeout(() => {
        setLinkSuccessMsg('');
        // Navigation will be handled by context update
      }, 3000);
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.error || 'Không thể liên kết');
    } finally {
      setLinkLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleChangeAvatar}
          disabled={uploadingAvatar}
          activeOpacity={0.7}
        >
          <View style={styles.avatarContainer}>
            <Avatar 
              name={user?.name || 'U'} 
              size={96} 
              avatarUrl={user?.avatar}
            />
            {uploadingAvatar && (
              <View style={styles.uploadingOverlay}>
                <Text style={styles.uploadingText}>Đang tải lên...</Text>
              </View>
            )}
            <View style={styles.editAvatarBadge}>
              <Text style={styles.editAvatarText}>✏️</Text>
            </View>
          </View>
        </TouchableOpacity>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.phone}>{user?.phone}</Text>
        <View style={styles.badges}>
          <Badge 
            text={user?.role === UserRole.PATIENT ? 'Người bệnh' : 'Người thân'} 
            variant="primary"
          />
          {user?.medicalCondition && user.medicalCondition !== 'Normal' && (
            <Badge text={user.medicalCondition} variant="warning" />
          )}
        </View>
      </View>

      {/* Fall Detection Settings (Only for Patient) */}
      {user?.role === UserRole.PATIENT && (
        <View style={styles.fallDetectionCard}>
          <View style={styles.fallDetectionHeader}>
            <Text style={styles.fallDetectionTitle}>⚠️ Cảnh báo té ngã</Text>
            <Switch
              value={isMonitoring}
              onValueChange={setIsMonitoring}
              trackColor={{ false: '#e5e7eb', true: COLORS.error }}
              thumbColor={isMonitoring ? '#fff' : '#f4f3f4'}
            />
          </View>
          <Text style={styles.fallDetectionText}>
            {isMonitoring ? 'Đang theo dõi cảm biến chuyển động.' : 'Đã tắt giám sát.'}
          </Text>
        </View>
      )}

      <View style={styles.form}>
        <Text style={styles.label}>Chiều cao (cm)</Text>
        <TextInput
          style={styles.input}
          placeholder="170"
          value={height}
          onChangeText={setHeight}
          keyboardType="numeric"
        />

        <Text style={styles.label}>Cân nặng (kg)</Text>
        <TextInput
          style={styles.input}
          placeholder="70"
          value={weight}
          onChangeText={setWeight}
          keyboardType="numeric"
        />

        <Text style={styles.label}>
          Tình trạng bệnh lý {analyzing && <Text style={styles.analyzing}>AI đang phân tích...</Text>}
        </Text>
        <TextInput
          style={styles.input}
          placeholder="VD: Tôi bị tiểu đường và mỡ máu..."
          value={conditionInput}
          onChangeText={setConditionInput}
        />
        <Text style={styles.helpText}>
          * Nhập mô tả bệnh, AI sẽ tự động nhận diện nhóm bệnh
        </Text>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
          <Text style={styles.saveButtonText}>
            {loading ? 'Đang lưu...' : 'Lưu & Phân tích'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Link Account Section */}
      <View style={styles.linkSection}>
        {user?.role === UserRole.PATIENT ? (
          <View style={styles.linkCard}>
            <Text style={styles.linkTitle}>🔗 Liên kết người thân</Text>
            <Text style={styles.linkSubtitle}>
              Chia sẻ mã bên dưới cho người thân để họ có thể theo dõi sức khỏe của bạn.
            </Text>

            {!generatedCode ? (
              <TouchableOpacity
                style={styles.linkButton}
                onPress={handleGenerateCode}
                disabled={linkLoading}
              >
                <Text style={styles.linkButtonText}>
                  {linkLoading ? 'Đang tạo...' : 'Tạo mã liên kết'}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.codeContainer}>
                <Text style={styles.codeLabel}>MÃ CỦA BẠN</Text>
                <Text style={styles.code}>{generatedCode}</Text>
                <Text style={styles.codeHelp}>Mã có hiệu lực trong 5 phút</Text>
                <TouchableOpacity onPress={handleGenerateCode}>
                  <Text style={styles.newCodeLink}>Tạo mã mới</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.linkCard}>
            <Text style={styles.linkTitle}>🔗 Kết nối người bệnh</Text>
            <Text style={styles.linkSubtitle}>
              Nhập mã 6 chữ số từ ứng dụng của người bệnh để bắt đầu theo dõi.
            </Text>

            {linkSuccessMsg ? (
              <View style={styles.success}>
                <Text style={styles.successText}>{linkSuccessMsg}</Text>
              </View>
            ) : (
              <>
                <TextInput
                  style={styles.linkInput}
                  placeholder="Nhập mã 6 số..."
                  value={inputCode}
                  onChangeText={(text) => setInputCode(text.replace(/[^0-9]/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                  textAlign="center"
                />

                <TouchableOpacity
                  style={[styles.linkButton, inputCode.length !== 6 && styles.linkButtonDisabled]}
                  onPress={handleSubmitCode}
                  disabled={linkLoading || inputCode.length !== 6}
                >
                  <Text style={styles.linkButtonText}>
                    {linkLoading ? 'Đang kết nối...' : 'Kết nối ngay'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </View>

      <TouchableOpacity
        style={styles.settingsButton}
        onPress={() => navigation?.navigate('Settings')}
      >
        <Text style={styles.settingsButtonText}>⚙️ Cài đặt</Text>
      </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  editAvatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  editAvatarText: {
    fontSize: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 4,
  },
  phone: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
  },
  fallDetectionCard: {
    backgroundColor: '#fee2e2',
    padding: 16,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  fallDetectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fallDetectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.error,
  },
  fallDetectionText: {
    fontSize: 12,
    color: COLORS.error,
    opacity: 0.8,
  },
  form: {
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  analyzing: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: 'normal',
  },
  helpText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  settingsButton: {
    backgroundColor: COLORS.primary + '20',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    margin: 16,
    marginTop: 24,
  },
  settingsButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkSection: {
    padding: 16,
    marginTop: 8,
  },
  linkCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  linkTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  linkSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  linkButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    width: '100%',
    alignItems: 'center',
  },
  linkButtonDisabled: {
    backgroundColor: '#e5e7eb',
  },
  linkButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  codeContainer: {
    width: '100%',
    alignItems: 'center',
  },
  codeLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  code: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.primary,
    letterSpacing: 8,
    marginBottom: 8,
  },
  codeHelp: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  newCodeLink: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  linkInput: {
    width: '100%',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 8,
    padding: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#e5e7eb',
    marginBottom: 24,
    textAlign: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
  },
  success: {
    backgroundColor: COLORS.success + '20',
    padding: 16,
    borderRadius: 12,
    width: '100%',
  },
  successText: {
    color: COLORS.success,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});

