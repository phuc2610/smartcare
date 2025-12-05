import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Switch } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { updateProfile as updateProfileAPI } from '../../services/user.service';
import { identifyDisease } from '../../services/ai.service';
import { UserRole } from '../../types';
import { COLORS } from '../../utils/constants';
import { Avatar } from '../../components/Avatar';
import { Badge } from '../../components/Badge';
import { AppHeader } from '../../components/AppHeader';

export const ProfileScreen = ({ navigation, route }: any) => {
  const { user, updateProfile, signOut } = useAuth();
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [conditionInput, setConditionInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);

  useEffect(() => {
    if (user) {
      setHeight(user.height?.toString() || '');
      setWeight(user.weight?.toString() || '');
      setConditionInput(user.medicalCondition && user.medicalCondition !== 'Normal' ? user.medicalCondition : '');
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    setAnalyzing(true);

    try {
      let finalCondition = 'Normal';
      if (conditionInput.trim()) {
        const result = await identifyDisease(conditionInput);
        finalCondition = result.condition;
      }

      const updatedUser = await updateProfileAPI({
        height: Number(height) || undefined,
        weight: Number(weight) || undefined,
        medicalCondition: finalCondition,
      });

      updateProfile(updatedUser.user);
      Alert.alert('Thành công', `Đã lưu hồ sơ!\nHệ thống ghi nhận: ${finalCondition}`);
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.error || 'Không thể lưu');
    } finally {
      setAnalyzing(false);
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader title="Hồ sơ cá nhân" />
      <ScrollView style={styles.scrollView}>
      <View style={styles.header}>
        <Avatar name={user?.name || 'U'} size={96} />
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

      <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
        <Text style={styles.logoutButtonText}>Đăng xuất</Text>
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
  logoutButton: {
    backgroundColor: COLORS.error + '20',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    margin: 16,
  },
  logoutButtonText: {
    color: COLORS.error,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

