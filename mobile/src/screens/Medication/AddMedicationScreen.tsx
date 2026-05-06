import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  ScrollView, Image, Dimensions, Animated,
} from 'react-native';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { scanPrescriptionBase64 } from '../../services/prescription.service';
import { requestCameraPermission, requestStoragePermission } from '../../utils/permissions';
import { showError } from '../../utils/alert';
import { COLORS } from '../../theme/tokens';
import { MedicalDisclaimer } from '../../components/MedicalDisclaimer';

const TEAL = COLORS.primary;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Scan steps for multi-step loading ──
const SCAN_STEPS = [
  { icon: 'cloud-upload', text: 'Đang tải ảnh lên...' },
  { icon: 'psychology', text: 'AI đang đọc đơn thuốc...' },
  { icon: 'verified', text: 'Đang xác minh độ chính xác...' },
  { icon: 'check-circle', text: 'Hoàn tất!' },
];

// ── Scan tips ──
const SCAN_TIPS = [
  { icon: '📸', tip: 'Đặt đơn thuốc trên mặt phẳng, nền sáng' },
  { icon: '💡', tip: 'Đảm bảo đủ ánh sáng, không có bóng đổ' },
  { icon: '📐', tip: 'Chụp thẳng từ trên xuống, không nghiêng' },
  { icon: '🔍', tip: 'Đảm bảo toàn bộ chữ rõ ràng, không bị cắt' },
];

// ── Image quality minimum dimensions ──
const MIN_IMAGE_WIDTH = 400;
const MIN_IMAGE_HEIGHT = 400;

export const AddMedicationScreen = ({ navigation }: any) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [previewBase64, setPreviewBase64] = useState<string | null>(null);
  const [previewMimeType, setPreviewMimeType] = useState<string>('image/jpeg');
  const [currentStep, setCurrentStep] = useState(0);
  const [showTips, setShowTips] = useState(false);

  // ── Image quality check ──
  const checkImageQuality = useCallback((asset: any): string | null => {
    const w = asset.width || 0;
    const h = asset.height || 0;

    if (w < MIN_IMAGE_WIDTH || h < MIN_IMAGE_HEIGHT) {
      return `Ảnh quá nhỏ (${w}x${h}). Cần tối thiểu ${MIN_IMAGE_WIDTH}x${MIN_IMAGE_HEIGHT} pixel để đọc rõ đơn thuốc.`;
    }

    // Check file size (>5MB warning)
    const fileSize = asset.fileSize || 0;
    if (fileSize > 5 * 1024 * 1024) {
      return 'Ảnh quá lớn (>5MB). Vui lòng chụp lại với chất lượng thấp hơn.';
    }

    return null;
  }, []);

  // ── Multi-step loading simulation ──
  const advanceSteps = useCallback(() => {
    setCurrentStep(0);

    // Step 0 → 1 after 1s (uploading → analyzing)
    setTimeout(() => setCurrentStep(1), 1000);
    // Step 1 → 2 after 4s (analyzing → verifying)
    setTimeout(() => setCurrentStep(2), 4000);
  }, []);

  // ── Process & scan image ──
  const handleScanImage = useCallback(async () => {
    if (!previewBase64) return;

    setIsProcessing(true);
    advanceSteps();

    try {
      // Navigate to View screen with loading
      navigation.navigate('PrescriptionView', { loading: true });

      // Scan with AI/OCR (dual-pass verification on server)
      // Pass mimeType so backend sends correct Content-Type to Gemini
      const { prescription } = await scanPrescriptionBase64(previewBase64, previewMimeType);

      // Step 3: complete
      setCurrentStep(3);

      // Navigate to View screen with result
      navigation.navigate('PrescriptionView', { prescription, loading: false });
    } catch (error: any) {
      showError('Lỗi', error?.message || 'Không thể phân tích ảnh đơn thuốc. Vui lòng thử lại.');
      navigation.goBack();
    } finally {
      setIsProcessing(false);
      setPreviewUri(null);
      setPreviewBase64(null);
      setPreviewMimeType('image/jpeg');
      setCurrentStep(0);
    }
  }, [previewBase64, previewMimeType, advanceSteps, navigation]);

  // ── Capture from camera ──
  const handleOpenCamera = useCallback(async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      showError('Quyền truy cập', 'Cần quyền truy cập máy ảnh để chụp đơn thuốc.');
      return;
    }

    // Wrap callback in a Promise to ensure proper async handling
    // on all Android devices (some cameras call callback before file is ready)
    await new Promise<void>((resolve) => {
      launchCamera(
        { mediaType: 'photo', quality: 0.8, maxWidth: 1600, maxHeight: 1600, includeBase64: true },
        (response) => {
          if (response.didCancel || !response.assets?.[0]) {
            resolve();
            return;
          }
          const asset = response.assets[0];

          // Quality check
          const qualityIssue = checkImageQuality(asset);
          if (qualityIssue) {
            showError('Chất lượng ảnh', qualityIssue);
            resolve();
            return;
          }

          if (!asset.base64) {
            showError('Lỗi', 'Không thể đọc ảnh. Vui lòng thử lại.');
            resolve();
            return;
          }

          // Detect actual mimeType from asset (camera may return PNG/HEIC on some devices)
          const detectedMime = (asset.type && asset.type.startsWith('image/'))
            ? asset.type
            : 'image/jpeg';

          setPreviewMimeType(detectedMime);
          setPreviewUri(asset.uri || null);
          setPreviewBase64(asset.base64);
          resolve();
        }
      );
    });
  }, [checkImageQuality]);

  // ── Pick from library ──
  const handlePickImage = useCallback(async () => {
    const hasPermission = await requestStoragePermission();
    if (!hasPermission) {
      showError('Quyền truy cập', 'Cần quyền truy cập thư viện ảnh.');
      return;
    }

    await new Promise<void>((resolve) => {
      launchImageLibrary(
        { mediaType: 'photo', quality: 0.8, maxWidth: 1600, maxHeight: 1600, includeBase64: true },
        (response) => {
          if (response.didCancel || !response.assets?.[0]) {
            resolve();
            return;
          }
          const asset = response.assets[0];

          const qualityIssue = checkImageQuality(asset);
          if (qualityIssue) {
            showError('Chất lượng ảnh', qualityIssue);
            resolve();
            return;
          }

          if (!asset.base64) {
            showError('Lỗi', 'Không thể đọc ảnh. Vui lòng thử lại.');
            resolve();
            return;
          }

          const detectedMime = (asset.type && asset.type.startsWith('image/'))
            ? asset.type
            : 'image/jpeg';

          setPreviewMimeType(detectedMime);
          setPreviewUri(asset.uri || null);
          setPreviewBase64(asset.base64);
          resolve();
        }
      );
    });
  }, [checkImageQuality]);

  const handleCancelPreview = useCallback(() => {
    setPreviewUri(null);
    setPreviewBase64(null);
    setPreviewMimeType('image/jpeg');
  }, []);

  const handleClose = () => navigation.goBack();

  // ─────────────────────────────────────────────────────────
  // RENDER: Processing state
  // ─────────────────────────────────────────────────────────
  if (isProcessing) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <View style={styles.headerPlaceholder} />
          <Text style={styles.headerTitle}>Quét đơn thuốc</Text>
          <View style={styles.headerPlaceholder} />
        </View>
        <View style={styles.processingContainer}>
          <View style={styles.processingIconWrap}>
            <ActivityIndicator size="large" color={TEAL} />
          </View>
          {SCAN_STEPS.map((step, idx) => (
            <View
              key={idx}
              style={[
                styles.stepRow,
                idx <= currentStep && styles.stepRowActive,
                idx < currentStep && styles.stepRowDone,
              ]}
            >
              <View style={[
                styles.stepDot,
                idx <= currentStep && styles.stepDotActive,
                idx < currentStep && styles.stepDotDone,
              ]}>
                {idx < currentStep ? (
                  <Icon name="check" size={14} color="#fff" />
                ) : idx === currentStep ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : null}
              </View>
              <Text style={[
                styles.stepText,
                idx <= currentStep && styles.stepTextActive,
                idx < currentStep && styles.stepTextDone,
              ]}>
                {step.text}
              </Text>
            </View>
          ))}
          <Text style={styles.processingNote}>
            AI đang phân tích 2 lần để đảm bảo độ chính xác cao nhất
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────────────────
  // RENDER: Image Preview state
  // ─────────────────────────────────────────────────────────
  if (previewUri) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancelPreview} activeOpacity={0.7} style={styles.headerBtn}>
            <Icon name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Xác nhận ảnh</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.previewScrollContent}>
          {/* Image Preview */}
          <View style={styles.previewImageWrap}>
            <Image source={{ uri: previewUri }} style={styles.previewImage} resizeMode="contain" />
          </View>

          {/* Quality Notice */}
          <View style={styles.qualityNotice}>
            <Icon name="info-outline" size={18} color={TEAL} />
            <Text style={styles.qualityNoticeText}>
              Kiểm tra ảnh rõ ràng, đọc được chữ. Nếu không rõ, hãy chụp lại.
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.previewActions}>
            <TouchableOpacity style={styles.btnPrimary} onPress={handleScanImage} activeOpacity={0.8}>
              <Icon name="document-scanner" size={20} color="#FFFFFF" />
              <Text style={styles.btnPrimaryText}>Quét đơn thuốc</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnSecondary} onPress={handleCancelPreview} activeOpacity={0.8}>
              <Icon name="replay" size={20} color="#6B7280" />
              <Text style={styles.btnSecondaryText}>Chụp lại</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.verifyBadge}>
            <Icon name="verified-user" size={16} color={TEAL} />
            <Text style={styles.verifyBadgeText}>AI sẽ phân tích 2 lần + xác minh tên thuốc</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────────────────
  // RENDER: Default state — Camera/Library selection + Tips
  // ─────────────────────────────────────────────────────────
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
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Icon name="document-scanner" size={48} color={TEAL} />
          </View>

          <Text style={styles.heading}>Chụp ảnh đơn thuốc</Text>
          <Text style={styles.subtitle}>
            AI sẽ phân tích 2 lần và xác minh chéo để đảm bảo{'\n'}độ chính xác cao nhất cho đơn thuốc của bạn.
          </Text>

          {/* Dual-verification badge */}
          <View style={styles.dualBadge}>
            <View style={styles.dualBadgeItem}>
              <View style={styles.dualBadgeIcon}>
                <Icon name="visibility" size={16} color={TEAL} />
              </View>
              <Text style={styles.dualBadgeLabel}>Pass 1</Text>
              <Text style={styles.dualBadgeDesc}>Đọc ảnh</Text>
            </View>
            <View style={styles.dualBadgeArrow}>
              <Icon name="arrow-forward" size={14} color="#C7C7CC" />
            </View>
            <View style={styles.dualBadgeItem}>
              <View style={styles.dualBadgeIcon}>
                <Icon name="fact-check" size={16} color="#E67E22" />
              </View>
              <Text style={styles.dualBadgeLabel}>Pass 2</Text>
              <Text style={styles.dualBadgeDesc}>Xác minh</Text>
            </View>
            <View style={styles.dualBadgeArrow}>
              <Icon name="arrow-forward" size={14} color="#C7C7CC" />
            </View>
            <View style={styles.dualBadgeItem}>
              <View style={styles.dualBadgeIcon}>
                <Icon name="verified" size={16} color="#27AE60" />
              </View>
              <Text style={styles.dualBadgeLabel}>Kết quả</Text>
              <Text style={styles.dualBadgeDesc}>Chính xác</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonsContainer}>
            <TouchableOpacity style={styles.btnPrimary} onPress={handleOpenCamera} activeOpacity={0.8}>
              <Icon name="photo-camera" size={20} color="#FFFFFF" />
              <Text style={styles.btnPrimaryText}>Mở máy ảnh</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnSecondary} onPress={handlePickImage} activeOpacity={0.8}>
              <Icon name="photo-library" size={20} color="#6B7280" />
              <Text style={styles.btnSecondaryText}>Chọn từ thư viện</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.btnTertiary} 
              onPress={() => navigation.navigate('ManualMedicationAdd')} 
              activeOpacity={0.8}
            >
              <Icon name="edit-note" size={20} color={TEAL} />
              <Text style={styles.btnTertiaryText}>Nhập thuốc thủ công</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Scan Tips Section ── */}
        <TouchableOpacity
          style={styles.tipsToggle}
          onPress={() => setShowTips(!showTips)}
          activeOpacity={0.7}
        >
          <Icon name="lightbulb-outline" size={18} color="#E67E22" />
          <Text style={styles.tipsToggleText}>Mẹo chụp đơn thuốc chính xác</Text>
          <Icon name={showTips ? 'expand-less' : 'expand-more'} size={20} color="#8E8E93" />
        </TouchableOpacity>

        {showTips && (
          <View style={styles.tipsContainer}>
            {SCAN_TIPS.map((tip, idx) => (
              <View key={idx} style={styles.tipRow}>
                <Text style={styles.tipIcon}>{tip.icon}</Text>
                <Text style={styles.tipText}>{tip.tip}</Text>
              </View>
            ))}
            <View style={styles.tipHighlight}>
              <Icon name="warning-amber" size={16} color="#E67E22" />
              <Text style={styles.tipHighlightText}>
                Ảnh càng rõ nét → kết quả càng chính xác. Tránh chụp mờ, nghiêng, hoặc thiếu sáng.
              </Text>
            </View>
          </View>
        )}

        <MedicalDisclaimer />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },

  // Header
  header: { backgroundColor: TEAL, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, minHeight: 52 },
  headerPlaceholder: { width: 50 },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#FFFFFF', textAlign: 'center' },
  headerClose: { width: 50, alignItems: 'flex-end' },
  headerCloseText: { fontSize: 15, fontWeight: '500', color: '#FFFFFF' },
  headerBtn: { width: 50, alignItems: 'flex-start' },

  // Scroll
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  previewScrollContent: { paddingBottom: 32 },

  // Body
  body: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingTop: 32, paddingBottom: 16 },
  iconContainer: { width: 88, height: 88, borderRadius: 44, backgroundColor: TEAL + '12', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  heading: { fontSize: 22, fontWeight: '700', color: '#1C1C1E', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#8E8E93', textAlign: 'center', lineHeight: 21, marginBottom: 20, paddingHorizontal: 8 },

  // Dual Badge
  dualBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 24, width: '100%', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  dualBadgeItem: { alignItems: 'center', flex: 1 },
  dualBadgeIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  dualBadgeLabel: { fontSize: 11, fontWeight: '700', color: '#1C1C1E', marginBottom: 2 },
  dualBadgeDesc: { fontSize: 10, color: '#8E8E93' },
  dualBadgeArrow: { paddingHorizontal: 4, paddingBottom: 16 },

  // Buttons
  buttonsContainer: { width: '100%', gap: 12 },
  btnPrimary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: TEAL, paddingVertical: 16, borderRadius: 12, shadowColor: TEAL, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  btnPrimaryText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  btnSecondary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#FFFFFF', paddingVertical: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E5E5EA' },
  btnSecondaryText: { fontSize: 16, fontWeight: '500', color: '#6B7280' },
  btnTertiary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#E0F2F1', paddingVertical: 16, borderRadius: 12, borderWidth: 1, borderColor: '#B2DFDB' },
  btnTertiaryText: { fontSize: 16, fontWeight: '600', color: '#00796B' },

  // ── Processing ──
  processingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  processingIconWrap: { marginBottom: 32 },
  stepRow: { flexDirection: 'row', alignItems: 'center', width: '100%', paddingVertical: 12, paddingHorizontal: 16, gap: 12, opacity: 0.3 },
  stepRowActive: { opacity: 1 },
  stepRowDone: { opacity: 0.7 },
  stepDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E5E5EA', alignItems: 'center', justifyContent: 'center' },
  stepDotActive: { backgroundColor: TEAL },
  stepDotDone: { backgroundColor: '#27AE60' },
  stepText: { fontSize: 15, color: '#C7C7CC', fontWeight: '500' },
  stepTextActive: { color: '#1C1C1E', fontWeight: '600' },
  stepTextDone: { color: '#27AE60' },
  processingNote: { marginTop: 24, fontSize: 12, color: '#8E8E93', textAlign: 'center', fontStyle: 'italic' },

  // ── Preview ──
  previewImageWrap: { marginHorizontal: 16, marginTop: 16, borderRadius: 12, overflow: 'hidden', backgroundColor: '#000', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 5 },
  previewImage: { width: '100%', height: SCREEN_WIDTH * 1.2, borderRadius: 12 },
  qualityNotice: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 12, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: TEAL + '0A', borderRadius: 10, borderWidth: 1, borderColor: TEAL + '20' },
  qualityNoticeText: { flex: 1, fontSize: 13, color: '#4A5568', lineHeight: 18 },
  previewActions: { marginHorizontal: 16, marginTop: 16, gap: 12 },
  verifyBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16, paddingVertical: 10 },
  verifyBadgeText: { fontSize: 12, color: TEAL, fontWeight: '500' },

  // ── Scan Tips ──
  tipsToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 16, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff', borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  tipsToggleText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1C1C1E' },
  tipsContainer: { marginHorizontal: 16, marginTop: 4, backgroundColor: '#fff', borderRadius: 12, padding: 16, gap: 12 },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tipIcon: { fontSize: 20, width: 28, textAlign: 'center' },
  tipText: { flex: 1, fontSize: 13, color: '#4A5568', lineHeight: 18 },
  tipHighlight: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 4, padding: 12, backgroundColor: '#FFF8E1', borderRadius: 8, borderWidth: 1, borderColor: '#FFE0B2' },
  tipHighlightText: { flex: 1, fontSize: 12, color: '#E67E22', lineHeight: 17 },
});
