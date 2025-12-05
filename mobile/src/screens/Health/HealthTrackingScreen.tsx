import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { createHealthLog } from '../../services/health.service';
import { estimateCalories } from '../../services/ai.service';
import { HealthLogType } from '../../types';
import { COLORS } from '../../utils/constants';
import { AppHeader } from '../../components/AppHeader';

type Tab = 'meal' | 'exercise' | 'symptom';

export const HealthTrackingScreen = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('meal');
  const [isEstimating, setIsEstimating] = useState(false);

  // Meal
  const [foodName, setFoodName] = useState('');
  const [calories, setCalories] = useState('');

  // Exercise
  const [exerciseType, setExerciseType] = useState('');
  const [duration, setDuration] = useState('');
  const [caloriesBurned, setCaloriesBurned] = useState('');

  // Symptom
  const [symptomName, setSymptomName] = useState('');
  const [severity, setSeverity] = useState(5);
  const [note, setNote] = useState('');

  const handleEstimate = async () => {
    setIsEstimating(true);
    try {
      if (activeTab === 'meal') {
        if (!foodName) {
          Alert.alert('Lỗi', 'Vui lòng nhập tên món ăn');
          return;
        }
        const result = await estimateCalories(foodName, 'food');
        setCalories(result.calories.toString());
      } else if (activeTab === 'exercise') {
        if (!exerciseType || !duration) {
          Alert.alert('Lỗi', 'Vui lòng nhập loại vận động và thời gian');
          return;
        }
        const query = `${exerciseType} trong ${duration} phút`;
        const result = await estimateCalories(query, 'exercise');
        setCaloriesBurned(result.calories.toString());
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể ước lượng lúc này');
    } finally {
      setIsEstimating(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;

    let details: any = {};
    if (activeTab === 'meal') {
      if (!foodName) {
        Alert.alert('Lỗi', 'Vui lòng nhập tên món ăn');
        return;
      }
      details = { foodName, calories: Number(calories) || 0 };
    } else if (activeTab === 'exercise') {
      if (!exerciseType) {
        Alert.alert('Lỗi', 'Vui lòng nhập loại vận động');
        return;
      }
      details = {
        exerciseType,
        durationMinutes: Number(duration),
        caloriesBurned: Number(caloriesBurned) || 0,
      };
    } else {
      if (!symptomName) {
        Alert.alert('Lỗi', 'Vui lòng nhập triệu chứng');
        return;
      }
      details = { symptomName, severity, note };
    }

    try {
      await createHealthLog(activeTab, details);
      Alert.alert('Thành công', 'Đã ghi nhận');
      // Reset form
      setFoodName('');
      setCalories('');
      setExerciseType('');
      setDuration('');
      setCaloriesBurned('');
      setSymptomName('');
      setSeverity(5);
      setNote('');
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.error || 'Không thể lưu');
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Theo dõi sức khỏe" />
      <ScrollView style={styles.scrollView}>
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'meal' && styles.tabActive]}
          onPress={() => setActiveTab('meal')}
        >
          <Text style={[styles.tabText, activeTab === 'meal' && styles.tabTextActive]}>Bữa ăn</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'exercise' && styles.tabActive]}
          onPress={() => setActiveTab('exercise')}
        >
          <Text style={[styles.tabText, activeTab === 'exercise' && styles.tabTextActive]}>Vận động</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'symptom' && styles.tabActive]}
          onPress={() => setActiveTab('symptom')}
        >
          <Text style={[styles.tabText, activeTab === 'symptom' && styles.tabTextActive]}>Triệu chứng</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        {activeTab === 'meal' && (
          <>
            <Text style={styles.label}>Tên món ăn</Text>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.flex1]}
                placeholder="Phở bò, Cơm tấm..."
                value={foodName}
                onChangeText={setFoodName}
              />
              <TouchableOpacity
                style={[styles.estimateButton, (isEstimating || !foodName) && styles.estimateButtonDisabled]}
                onPress={handleEstimate}
                disabled={isEstimating || !foodName}
              >
                <Text style={styles.estimateButtonText}>
                  {isEstimating ? '⏳' : '✨'}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.label}>Lượng Calo (kcal)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ví dụ: 500"
              value={calories}
              onChangeText={setCalories}
              keyboardType="numeric"
            />
          </>
        )}

        {activeTab === 'exercise' && (
          <>
            <Text style={styles.label}>Loại hình</Text>
            <TextInput
              style={styles.input}
              placeholder="Chạy bộ, Gym, Yoga..."
              value={exerciseType}
              onChangeText={setExerciseType}
            />
            <Text style={styles.label}>Thời gian (phút)</Text>
            <TextInput
              style={styles.input}
              placeholder="30"
              value={duration}
              onChangeText={setDuration}
              keyboardType="numeric"
            />
            <Text style={styles.label}>Calo tiêu thụ (kcal)</Text>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.flex1]}
                placeholder="Ví dụ: 200"
                value={caloriesBurned}
                onChangeText={setCaloriesBurned}
                keyboardType="numeric"
              />
              <TouchableOpacity
                style={styles.estimateButton}
                onPress={handleEstimate}
                disabled={isEstimating || !exerciseType || !duration}
              >
                <Text style={styles.estimateButtonText}>
                  {isEstimating ? '...' : '✨'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {activeTab === 'symptom' && (
          <>
            <Text style={styles.label}>Triệu chứng</Text>
            <TextInput
              style={styles.input}
              placeholder="Đau đầu, Chóng mặt..."
              value={symptomName}
              onChangeText={setSymptomName}
            />
            <Text style={styles.label}>
              Mức độ khó chịu: <Text style={styles.severity}>{severity}/10</Text>
            </Text>
            <View style={styles.sliderContainer}>
              <Text style={styles.sliderLabel}>Nhẹ</Text>
              <View style={styles.slider}>
                <View style={[styles.sliderTrack, { width: `${(severity / 10) * 100}%` }]} />
                <TouchableOpacity
                  style={[styles.sliderThumb, { left: `${(severity / 10) * 100}%` }]}
                  onPressIn={() => {}}
                />
              </View>
              <Text style={styles.sliderLabel}>Nghiêm trọng</Text>
            </View>
            <View style={styles.severityButtons}>
              {[1, 3, 5, 7, 10].map(val => (
                <TouchableOpacity
                  key={val}
                  style={[styles.severityButton, severity === val && styles.severityButtonActive]}
                  onPress={() => setSeverity(val)}
                >
                  <Text style={[styles.severityButtonText, severity === val && styles.severityButtonTextActive]}>
                    {val}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>Ghi chú thêm</Text>
            <TextInput
              style={styles.input}
              placeholder="Xảy ra sau khi uống thuốc..."
              value={note}
              onChangeText={setNote}
              multiline
            />
          </>
        )}

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Lưu lại</Text>
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
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: COLORS.primaryLight,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.primary,
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
  row: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  flex1: {
    flex: 1,
  },
  estimateButton: {
    width: 52,
    height: 52,
    backgroundColor: COLORS.secondary + '20',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.secondary + '40',
  },
  estimateButtonDisabled: {
    opacity: 0.5,
  },
  estimateButtonText: {
    fontSize: 20,
  },
  severity: {
    color: COLORS.primary,
    fontSize: 18,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sliderLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  slider: {
    flex: 1,
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    marginHorizontal: 8,
    position: 'relative',
  },
  sliderTrack: {
    position: 'absolute',
    height: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  sliderThumb: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    top: -8,
    marginLeft: -10,
  },
  severityButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  severityButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  severityButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  severityButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.textSecondary,
  },
  severityButtonTextActive: {
    color: '#fff',
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});





