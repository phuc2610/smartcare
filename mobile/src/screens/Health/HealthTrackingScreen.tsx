import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, PanResponder, Animated } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { createHealthLog } from '../../services/health.service';
import { estimateCalories } from '../../services/ai.service';
import { HealthLogType } from '../../types';
import { COLORS } from '../../utils/constants';
import { AppHeader } from '../../components/AppHeader';
import { DatePicker } from '../../components/DatePicker';
import { TimePicker } from '../../components/TimePicker';

type Tab = 'meal' | 'exercise' | 'symptom';

export const HealthTrackingScreen = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('meal');
  const [isEstimating, setIsEstimating] = useState(false);

  // Common schedule fields
  const [scheduledDate, setScheduledDate] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });
  const [scheduledTime, setScheduledTime] = useState('08:00');
  const [enableSchedule, setEnableSchedule] = useState(false);
  
  // For symptom: only date, no schedule
  const [symptomDate, setSymptomDate] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });

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
  const sliderRef = useRef<View>(null);
  const [sliderLayout, setSliderLayout] = useState({ x: 0, width: 0 });
  const thumbPosition = useRef(new Animated.Value(5)).current;

  const updateSeverity = useCallback((newValue: number) => {
    setSeverity(newValue);
    Animated.spring(thumbPosition, {
      toValue: newValue,
      useNativeDriver: false,
      tension: 50,
      friction: 7,
    }).start();
  }, [thumbPosition]);

  const handleSliderPress = (evt: any) => {
    if (!evt?.nativeEvent) return;
    const touchX = evt.nativeEvent.locationX;
    if (sliderLayout.width > 0 && touchX !== undefined) {
      const percentage = Math.max(0, Math.min(1, touchX / sliderLayout.width));
      const newValue = Math.max(1, Math.min(10, Math.round(percentage * 9) + 1));
      updateSeverity(newValue);
    }
  };

  useEffect(() => {
    thumbPosition.setValue(severity);
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        if (!evt?.nativeEvent) return;
        const touchX = evt.nativeEvent.locationX;
        if (sliderLayout.width > 0 && touchX !== undefined) {
          const percentage = Math.max(0, Math.min(1, touchX / sliderLayout.width));
          const newValue = Math.max(1, Math.min(10, Math.round(percentage * 9) + 1));
          thumbPosition.setValue(newValue);
          setSeverity(newValue);
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        if (!evt?.nativeEvent) return;
        const touchX = evt.nativeEvent.locationX;
        if (sliderLayout.width > 0 && touchX !== undefined) {
          const percentage = Math.max(0, Math.min(1, touchX / sliderLayout.width));
          const newValue = Math.max(1, Math.min(10, Math.round(percentage * 9) + 1));
          thumbPosition.setValue(newValue);
          setSeverity(newValue);
        }
      },
    })
  ).current;

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
      let dateToUse: string | undefined;
      let scheduledDateToUse: string | undefined;
      let scheduledTimeToUse: string | undefined;
      
      if (activeTab === 'symptom') {
        // For symptom: use symptomDate as the date field, no schedule
        dateToUse = symptomDate;
      } else {
        // For meal and exercise: use schedule if enabled
        if (enableSchedule) {
          scheduledDateToUse = scheduledDate;
          scheduledTimeToUse = scheduledTime;
        }
      }
      
      await createHealthLog(
        activeTab, 
        details,
        dateToUse, // date field
        scheduledDateToUse, // scheduledDate
        scheduledTimeToUse // scheduledTime
      );
      Alert.alert('Thành công', enableSchedule ? 'Đã đặt lịch nhắc nhở' : 'Đã ghi nhận');
      // Reset form
      setFoodName('');
      setCalories('');
      setExerciseType('');
      setDuration('');
      setCaloriesBurned('');
      setSymptomName('');
      setSeverity(5);
      setNote('');
      setEnableSchedule(false);
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
        {/* Schedule Section - Only show for meal and exercise, not symptom */}
        {activeTab !== 'symptom' && (
          <View style={styles.scheduleSection}>
            <TouchableOpacity
              style={styles.scheduleToggle}
              onPress={() => setEnableSchedule(!enableSchedule)}
            >
              <View style={[styles.checkbox, enableSchedule && styles.checkboxChecked]}>
                {enableSchedule && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.scheduleLabel}>Đặt lịch nhắc nhở</Text>
            </TouchableOpacity>
            {enableSchedule && (
              <View style={styles.scheduleFields}>
                <DatePicker
                  label="Ngày"
                  value={scheduledDate}
                  onChange={setScheduledDate}
                />
                <TimePicker
                  label="Giờ"
                  value={scheduledTime}
                  onChange={setScheduledTime}
                />
              </View>
            )}
          </View>
        )}

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
            {/* Date picker for symptom (no schedule) */}
            <DatePicker
              label="Ngày"
              value={symptomDate}
              onChange={setSymptomDate}
            />
            
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
              <Text style={styles.sliderLabelLeft}>Nhẹ</Text>
              <View 
                style={styles.sliderWrapper}
                {...panResponder.panHandlers}
              >
                <View 
                  style={styles.slider}
                  onLayout={(evt) => {
                    const { x, width } = evt.nativeEvent.layout;
                    setSliderLayout({ x, width });
                  }}
                >
                  <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    activeOpacity={1}
                    onPress={handleSliderPress}
                  />
                  <View style={styles.sliderBackground} />
                  <Animated.View 
                    style={[
                      styles.sliderTrack,
                      {
                        width: thumbPosition.interpolate({
                          inputRange: [1, 10],
                          outputRange: ['0%', '100%'],
                        }),
                      }
                    ]} 
                  />
                  <Animated.View
                    style={[
                      styles.sliderThumb,
                      {
                        left: thumbPosition.interpolate({
                          inputRange: [1, 10],
                          outputRange: ['0%', '100%'],
                        }),
                      }
                    ]}
                  >
                    <View style={styles.sliderThumbInner} />
                  </Animated.View>
                </View>
              </View>
              <Text style={styles.sliderLabelRight}>Nghiêm trọng</Text>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  sliderLabelLeft: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 0,
    minWidth: 60,
  },
  sliderLabelRight: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 0,
    minWidth: 80,
    textAlign: 'right',
  },
  sliderWrapper: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 16,
  },
  slider: {
    width: '100%',
    height: 40,
    position: 'relative',
    justifyContent: 'center',
  },
  sliderBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    top: 18,
  },
  sliderTrack: {
    position: 'absolute',
    height: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
    left: 0,
    top: 18,
    zIndex: 1,
  },
  sliderThumb: {
    position: 'absolute',
    width: 20,
    height: 20,
    top: 10,
    marginLeft: -10,
    zIndex: 2,
  },
  sliderThumbInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
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
  scheduleSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  scheduleToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scheduleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  scheduleFields: {
    marginTop: 8,
  },
});





