import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../contexts/AuthContext';
import { updateProfile } from '../../services/user.service';
import { logger } from '../../utils/logger';
import { Check, AlertCircle } from 'lucide-react-native';

const COLORS = {
  primary: '#0891b2',
  background: '#ffffff',
  text: '#1f2937',
  textSecondary: '#6b7280',
  border: '#e5e7eb',
  error: '#ef4444',
  chipBg: '#f3f4f6',
  chipSelectedBg: '#cffafe',
  chipSelectedBorder: '#06b6d4',
};

const COMMON_CONDITIONS = [
  'Tiểu đường', 'Huyết áp cao', 'Huyết áp thấp', 
  'Dạ dày', 'Tim mạch', 'Mỡ máu', 'Gout', 
  'Xương khớp', 'Hen suyễn', 'Bình thường'
];

export const ProfileSetupScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { user, updateProfile: updateLocalUser } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER' | ''>('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [yearOfBirth, setYearOfBirth] = useState(''); // Chỉ nhập năm cho người già dễ thao tác
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [allergies, setAllergies] = useState('');

  const toggleCondition = (condition: string) => {
    if (condition === 'Bình thường') {
      setSelectedConditions(['Bình thường']);
      return;
    }

    let newConditions = selectedConditions.filter(c => c !== 'Bình thường');
    
    if (newConditions.includes(condition)) {
      newConditions = newConditions.filter(c => c !== condition);
    } else {
      newConditions.push(condition);
    }
    
    setSelectedConditions(newConditions);
  };

  const handleFinish = async () => {
    if (!height || !weight) {
      setError('Vui lòng nhập tối thiểu chiều cao và cân nặng để AI tính toán chính xác.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // Format data
      let medicalCondition = 'Normal';
      if (selectedConditions.length > 0 && !selectedConditions.includes('Bình thường')) {
        medicalCondition = selectedConditions.join(', ');
      }

      let dateOfBirth = undefined;
      if (yearOfBirth.length === 4) {
        dateOfBirth = `${yearOfBirth}-01-01`; // Giả định ngày 1 tháng 1 nếu chỉ nhập năm
      }

      const allergyArray = allergies.trim() ? allergies.split(',').map(a => a.trim()) : [];

      // Call API
      const response = await updateProfile({
        height: parseFloat(height),
        weight: parseFloat(weight),
        medicalCondition,
        gender: gender || 'OTHER',
        dateOfBirth,
        allergies: allergyArray,
        isOnboardingCompleted: true
      });

      // Update context
      updateLocalUser(response.user);
      
      // Chú ý: RootNavigator sẽ tự động chuyển sang Main Stack khi isOnboardingCompleted = true
    } catch (err: any) {
      logger.error('Profile Setup Error', err);
      setError(err?.message || 'Có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Hoàn thiện hồ sơ</Text>
          <Text style={styles.subtitle}>
            Thông tin này giúp Trợ lý AI đưa ra gợi ý y tế chính xác và an toàn nhất cho bạn.
          </Text>

          {error ? (
            <View style={styles.errorBox}>
              <AlertCircle color={COLORS.error} size={20} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* CHỈ SỐ CƠ THỂ */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Chỉ số cơ thể (Bắt buộc)</Text>
            
            <View style={styles.row}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Chiều cao (cm)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ví dụ: 165"
                  keyboardType="numeric"
                  value={height}
                  onChangeText={setHeight}
                />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Cân nặng (kg)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ví dụ: 60"
                  keyboardType="numeric"
                  value={weight}
                  onChangeText={setWeight}
                />
              </View>
            </View>
            
            <View style={styles.row}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Năm sinh</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ví dụ: 1960"
                  keyboardType="numeric"
                  maxLength={4}
                  value={yearOfBirth}
                  onChangeText={setYearOfBirth}
                />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Giới tính</Text>
                <View style={styles.genderRow}>
                  <TouchableOpacity 
                    style={[styles.genderBtn, gender === 'MALE' && styles.genderBtnActive]}
                    onPress={() => setGender('MALE')}
                  >
                    <Text style={[styles.genderText, gender === 'MALE' && styles.genderTextActive]}>Nam</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.genderBtn, gender === 'FEMALE' && styles.genderBtnActive]}
                    onPress={() => setGender('FEMALE')}
                  >
                    <Text style={[styles.genderText, gender === 'FEMALE' && styles.genderTextActive]}>Nữ</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* BỆNH LÝ NỀN */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bệnh lý nền (Có thể chọn nhiều)</Text>
            <View style={styles.chipContainer}>
              {COMMON_CONDITIONS.map((condition) => {
                const isSelected = selectedConditions.includes(condition);
                return (
                  <TouchableOpacity
                    key={condition}
                    activeOpacity={0.7}
                    style={[
                      styles.chip,
                      isSelected && styles.chipSelected
                    ]}
                    onPress={() => toggleCondition(condition)}
                  >
                    {isSelected && <Check size={16} color={COLORS.primary} style={{ marginRight: 4 }} />}
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                      {condition}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* DỊ ỨNG */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dị ứng thuốc / Thức ăn (Nếu có)</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Ví dụ: Dị ứng Penicillin, Hải sản..."
              multiline
              numberOfLines={3}
              value={allergies}
              onChangeText={setAllergies}
            />
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.button, loading && { opacity: 0.7 }]} 
            onPress={handleFinish}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Lưu & Bắt đầu sử dụng</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: 24,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    color: COLORS.error,
    marginLeft: 8,
    flex: 1,
    fontSize: 14,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    marginHorizontal: -8,
    marginBottom: 16,
  },
  inputContainer: {
    flex: 1,
    paddingHorizontal: 8,
  },
  label: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
    fontSize: 16,
    color: COLORS.text,
  },
  textArea: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingTop: 12,
    fontSize: 16,
    color: COLORS.text,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  genderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 48,
  },
  genderBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
    backgroundColor: '#f9fafb',
  },
  genderBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.chipSelectedBg,
  },
  genderText: {
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  genderTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  chip: {
    flexDirection: 'row',
    backgroundColor: COLORS.chipBg,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    margin: 4,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
  },
  chipSelected: {
    backgroundColor: COLORS.chipSelectedBg,
    borderColor: COLORS.chipSelectedBorder,
  },
  chipText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  footer: {
    padding: 24,
    paddingTop: 12,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  button: {
    backgroundColor: COLORS.primary,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
