import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { uploadImage } from '../../services/upload.service';
import { scanPrescription } from '../../services/prescription.service';
import { requestCameraPermission, requestStoragePermission } from '../../utils/permissions';
import { showError } from '../../utils/alert';
import { COLORS } from '../../theme/tokens';
import { MedicalDisclaimer } from '../../components/MedicalDisclaimer';

const TEAL = COLORS.primary;

export const AddMedicationScreen = ({ navigation }: any) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const processImage = async (uri: string) => {
    setIsProcessing(true);
    try {
      // 1. Upload image
      const uploadResult = await uploadImage(uri);
      const imageUrl = uploadResult.url;

      // 2. Navigate to View screen with loading
      navigation.navigate('PrescriptionView', { loading: true });

      // 3. Scan with AI/OCR
      const { prescription } = await scanPrescription(imageUrl);

      // 4. Navigate to View screen with result (replace current)
      navigation.navigate('PrescriptionView', { prescription, loading: false });
    } catch (error) {
      showError('Lỗi', 'Không thể phân tích ảnh đơn thuốc. Vui lòng thử lại.');
      navigation.goBack();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenCamera = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      showError('Quyền truy cập', 'Cần quyền truy cập máy ảnh để chụp đơn thuốc.');
      return;
    }
    launchCamera(
      { mediaType: 'photo', quality: 0.8, maxWidth: 1600, maxHeight: 1600 },
      async (response) => {
        if (response.didCancel || !response.assets?.[0]) return;
        await processImage(response.assets[0].uri!);
      }
    );
  };

  const handlePickImage = async () => {
    const hasPermission = await requestStoragePermission();
    if (!hasPermission) {
      showError('Quyền truy cập', 'Cần quyền truy cập thư viện ảnh.');
      return;
    }
    launchImageLibrary(
      { mediaType: 'photo', quality: 0.8, maxWidth: 1600, maxHeight: 1600 },
      async (response) => {
        if (response.didCancel || !response.assets?.[0]) return;
        await processImage(response.assets[0].uri!);
      }
    );
  };

  const handleClose = () => navigation.goBack();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={styles.headerPlaceholder} />
        <Text style={styles.headerTitle}>Quét đơn thuốc</Text>
        <TouchableOpacity onPress={handleClose} activeOpacity={0.7} style={styles.headerClose}>
          <Text style={styles.headerCloseText}>Đóng</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.body}>
          {isProcessing ? (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="large" color={TEAL} />
              <Text style={styles.processingTitle}>Đang phân tích đơn thuốc...</Text>
              <Text style={styles.processingSubtitle}>AI đang nhận diện thông tin từ ảnh của bạn</Text>
            </View>
          ) : (
            <>
              <View style={styles.iconContainer}>
                <Icon name="photo-camera" size={64} color={TEAL} />
              </View>
              <Text style={styles.heading}>Chụp ảnh đơn thuốc của bạn</Text>
              <Text style={styles.subtitle}>
                Đảm bảo đơn thuốc rõ ràng, không bị mờ hoặc lóa sáng.
              </Text>
              <View style={styles.buttonsContainer}>
                <TouchableOpacity style={styles.btnPrimary} onPress={handleOpenCamera} activeOpacity={0.8}>
                  <Icon name="photo-camera" size={20} color="#FFFFFF" />
                  <Text style={styles.btnPrimaryText}>Mở máy ảnh</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnSecondary} onPress={handlePickImage} activeOpacity={0.8}>
                  <Icon name="photo-library" size={20} color="#6B7280" />
                  <Text style={styles.btnSecondaryText}>Chọn từ thư viện</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
        <MedicalDisclaimer />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { backgroundColor: TEAL, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, minHeight: 52 },
  headerPlaceholder: { width: 50 },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#FFFFFF', textAlign: 'center' },
  headerClose: { width: 50, alignItems: 'flex-end' },
  headerCloseText: { fontSize: 15, fontWeight: '500', color: '#FFFFFF' },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 40 },
  iconContainer: { width: 100, height: 100, borderRadius: 50, backgroundColor: TEAL + '12', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  heading: { fontSize: 22, fontWeight: '700', color: '#1C1C1E', textAlign: 'center', marginBottom: 10 },
  subtitle: { fontSize: 14, color: '#8E8E93', textAlign: 'center', lineHeight: 21, marginBottom: 36, paddingHorizontal: 16 },
  buttonsContainer: { width: '100%', gap: 12 },
  btnPrimary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: TEAL, paddingVertical: 16, borderRadius: 12, shadowColor: TEAL, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  btnPrimaryText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  btnSecondary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#FFFFFF', paddingVertical: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E5E5EA' },
  btnSecondaryText: { fontSize: 16, fontWeight: '500', color: '#6B7280' },
  processingContainer: { alignItems: 'center', gap: 16 },
  processingTitle: { fontSize: 18, fontWeight: '600', color: '#1C1C1E' },
  processingSubtitle: { fontSize: 14, color: '#8E8E93', textAlign: 'center' },
});
