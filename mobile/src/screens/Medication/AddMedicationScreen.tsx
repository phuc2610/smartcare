import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image, ScrollView } from 'react-native';
import { launchImageLibrary, launchCamera, ImagePickerResponse } from 'react-native-image-picker';
import { useAuth } from '../../contexts/AuthContext';
import { createMedication } from '../../services/medication.service';
import { uploadImage } from '../../services/upload.service';
import { parseMedicationFromImage } from '../../services/ai.service';
import { FrequencyType } from '../../types';
import { COLORS } from '../../utils/constants';
import { requestCameraPermission, requestStoragePermission } from '../../utils/permissions';
import { TimePicker } from '../../components/TimePicker';
import { AppHeader } from '../../components/AppHeader';

export const AddMedicationScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [time, setTime] = useState('08:00');
  const [isScanning, setIsScanning] = useState(false);
  const [scannedImage, setScannedImage] = useState<string | null>(null);

  const handleImageSelect = async () => {
    const hasCamera = await requestCameraPermission();
    const hasStorage = await requestStoragePermission();
    
    if (!hasCamera && !hasStorage) {
      Alert.alert('Lỗi', 'Cần quyền camera và storage để quét ảnh');
      return;
    }

    Alert.alert('Chọn ảnh', 'Chọn từ thư viện hoặc chụp ảnh mới', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Thư viện',
        onPress: () => {
          launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, handleImageResult);
        },
      },
      {
        text: 'Camera',
        onPress: () => {
          launchCamera({ mediaType: 'photo', quality: 0.8 }, handleImageResult);
        },
      },
    ]);
  };

  const handleImageResult = async (response: ImagePickerResponse) => {
    if (response.didCancel || !response.assets?.[0]) return;

    const uri = response.assets[0].uri!;
    setScannedImage(uri);
    setIsScanning(true);

    try {
      const uploadResult = await uploadImage(uri);
      const result = await parseMedicationFromImage(uploadResult.url);
      
      if (result.medication.name) setName(result.medication.name);
      if (result.medication.dosage) setDosage(result.medication.dosage);
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể phân tích ảnh. Vui lòng nhập thủ công.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !time) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin');
      return;
    }

    if (!user) return;

    try {
      await createMedication({
        name,
        dosage,
        unit: 'mg',
        frequency: FrequencyType.DAILY,
        times: [time],
        startDate: new Date().toISOString(),
      });
      
      Alert.alert('Thành công', 'Đã thêm thuốc mới', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.error || 'Không thể thêm thuốc');
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Thêm thuốc mới" />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quét đơn thuốc / Vỏ hộp</Text>
        {!scannedImage ? (
          <TouchableOpacity style={styles.scanButton} onPress={handleImageSelect}>
            <Text style={styles.scanButtonText}>📷 Quét ảnh</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.imageContainer}>
            <Image source={{ uri: scannedImage }} style={styles.image} />
            {isScanning && (
              <View style={styles.scanningOverlay}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.scanningText}>Đang quét AI...</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.removeImage}
              onPress={() => {
                setScannedImage(null);
                setName('');
                setDosage('');
              }}
            >
              <Text style={styles.removeImageText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Tên thuốc *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ví dụ: Panadol, Insulin..."
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>Liều lượng</Text>
        <TextInput
          style={styles.input}
          placeholder="Ví dụ: 500mg, 1 viên"
          value={dosage}
          onChangeText={setDosage}
        />

        <TimePicker
          label="Giờ uống thuốc *"
          value={time}
          onChange={setTime}
        />

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Lưu & Đặt lịch</Text>
        </TouchableOpacity>
      </View>
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
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  scanButton: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
  },
  scanButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  imageContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  scanningOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanningText: {
    color: '#fff',
    marginTop: 8,
    fontWeight: 'bold',
  },
  removeImage: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#fff',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeImageText: {
    fontSize: 18,
    color: COLORS.text,
  },
  form: {
    flex: 1,
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
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

