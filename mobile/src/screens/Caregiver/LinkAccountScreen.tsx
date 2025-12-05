import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types';
import { generateLinkCode, submitLinkCode } from '../../services/caregiver.service';
import { COLORS } from '../../utils/constants';
import { AppHeader } from '../../components/AppHeader';

export const LinkAccountScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [inputCode, setInputCode] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleGenerateCode = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await generateLinkCode();
      setGeneratedCode(data.code);
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.error || 'Không thể tạo mã');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitCode = async () => {
    if (!user || !inputCode) return;
    setLoading(true);
    try {
      const res = await submitLinkCode(inputCode);
      setSuccessMsg(`Đã liên kết thành công với bệnh nhân: ${res.patientName}`);
      setTimeout(() => {
        navigation.navigate('Home');
      }, 2000);
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.error || 'Không thể liên kết');
    } finally {
      setLoading(false);
    }
  };

  if (user?.role === UserRole.PATIENT) {
    return (
      <View style={styles.container}>
        <AppHeader title="Mã liên kết" />
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.title}>Liên kết người thân</Text>
          <Text style={styles.subtitle}>
            Chia sẻ mã bên dưới cho người thân để họ có thể theo dõi sức khỏe của bạn.
          </Text>

          {!generatedCode ? (
            <TouchableOpacity
              style={styles.button}
              onPress={handleGenerateCode}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Đang tạo...' : 'Tạo mã liên kết'}
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
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Kết nối người bệnh" />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      <View style={styles.card}>
        <Text style={styles.title}>Kết nối người bệnh</Text>
        <Text style={styles.subtitle}>
          Nhập mã 6 chữ số từ ứng dụng của người bệnh để bắt đầu theo dõi.
        </Text>

        {successMsg ? (
          <View style={styles.success}>
            <Text style={styles.successText}>{successMsg}</Text>
          </View>
        ) : (
          <>
            <TextInput
              style={styles.input}
              placeholder="Nhập mã 6 số..."
              value={inputCode}
              onChangeText={(text) => setInputCode(text.replace(/[^0-9]/g, '').slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              textAlign="center"
            />

            <TouchableOpacity
              style={[styles.button, inputCode.length !== 6 && styles.buttonDisabled]}
              onPress={handleSubmitCode}
              disabled={loading || inputCode.length !== 6}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Đang kết nối...' : 'Kết nối ngay'}
              </Text>
            </TouchableOpacity>
          </>
        )}
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
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    width: '100%',
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#e5e7eb',
  },
  buttonText: {
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
  input: {
    width: '100%',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 8,
    padding: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#e5e7eb',
    marginBottom: 24,
    textAlign: 'center',
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





