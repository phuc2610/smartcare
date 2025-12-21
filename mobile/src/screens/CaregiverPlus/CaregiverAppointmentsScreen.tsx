/**
 * CaregiverAppointmentsScreen
 * Quản lý lịch hẹn với upcoming list và add appointment sheet
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen } from '../../ui/Screen';
import { AppHeader } from '../../components/AppHeader';
import { Text } from '../../ui/Text';
import { Card } from '../../ui/Card';
import { BottomSheet } from '../../ui/BottomSheet';
import { Input } from '../../ui/Input';
import { Button } from '../../ui/Button';
import { Loading } from '../../ui/Loading';
import { EmptyState } from '../../ui/EmptyState';
import { DatePicker } from '../../components/DatePicker';
import { TimePicker } from '../../components/TimePicker';
import { COLORS, SPACING } from '../../theme';
import { getPatientAppointments } from '../../services/caregiverPlus.service';
import { createAppointment } from '../../services/appointment.service';
import { Appointment } from '../../types';
import { showError as showErrorUtil, showSuccess } from '../../utils/alert';
import { logger } from '../../utils/logger';

const AnimatedCard = Animated.createAnimatedComponent(Card);

export const CaregiverAppointmentsScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const patientId = route.params?.patientId;

  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [formData, setFormData] = useState({
    doctor: '',
    specialty: '',
    location: '',
    date: '',
    time: '',
    notes: '',
  });

  useEffect(() => {
    if (patientId) {
      fetchAppointments();
    }
  }, [patientId]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const data = await getPatientAppointments(patientId);
      setAppointments(data.appointments.filter((a: Appointment) => a.status === 'upcoming'));
    } catch (err: any) {
      logger.error('Fetch appointments error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAppointment = async () => {
    if (!formData.doctor.trim()) {
      showErrorUtil('Lỗi', 'Vui lòng nhập tên bác sĩ');
      return;
    }

    if (!formData.date) {
      showErrorUtil('Lỗi', 'Vui lòng chọn ngày');
      return;
    }

    try {
      // Convert date from YYYY-MM-DD to ISO string
      const appointmentDate = new Date(formData.date);
      if (isNaN(appointmentDate.getTime())) {
        showErrorUtil('Lỗi', 'Ngày không hợp lệ');
        return;
      }

      await createAppointment({
        doctorName: formData.doctor.trim(),
        doctorSpecialty: formData.specialty.trim(),
        hospitalName: formData.location.trim(),
        appointmentDate: appointmentDate.toISOString(),
        appointmentTime: formData.time || '',
        notes: formData.notes.trim(),
        reminderBefore: 24,
        userId: patientId, // Create appointment for patient
      });

      showSuccess('Thành công', 'Đã thêm lịch hẹn');
      setSheetVisible(false);
      setFormData({ doctor: '', specialty: '', location: '', date: '', time: '', notes: '' });
      fetchAppointments();
    } catch (err: any) {
      logger.error('Create appointment error:', err);
      showErrorUtil('Lỗi', err.message || 'Không thể tạo lịch hẹn');
    }
  };

  if (loading) {
    return (
      <Screen>
        <AppHeader title="Lịch hẹn" showBack onBack={() => navigation.goBack()} />
        <Loading message="Đang tải lịch hẹn..." />
      </Screen>
    );
  }

  return (
    <Screen scrollable>
      <AppHeader title="Lịch hẹn" showBack onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {appointments.length === 0 ? (
          <EmptyState
            icon="📅"
            title="Không có lịch hẹn"
            message="Chưa có lịch hẹn sắp tới"
          />
        ) : (
          <View style={styles.appointmentsList}>
            {appointments.map((appointment, index) => (
              <AnimatedCard
                key={appointment._id}
                entering={FadeInDown.delay(50 + index * 30)}
                style={styles.appointmentCard}
              >
                <View style={styles.appointmentHeader}>
                  <Icon name="event" size={24} color={COLORS.primary} />
                  <View style={styles.appointmentInfo}>
                    <Text variant="body" color="text" semibold>
                      {appointment.doctorName || appointment.title || 'Lịch hẹn'}
                    </Text>
                    {appointment.doctorSpecialty && (
                      <Text variant="caption" color="textSecondary" style={styles.specialty}>
                        {appointment.doctorSpecialty}
                      </Text>
                    )}
                    <Text variant="caption" color="textSecondary">
                      {new Date(appointment.appointmentDate || appointment.date).toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })} {appointment.appointmentTime || appointment.time ? `• ${appointment.appointmentTime || appointment.time}` : ''}
                    </Text>
                  </View>
                </View>
                {(appointment.doctorName || appointment.doctor) && (
                  <View style={styles.appointmentDetail}>
                    <Icon name="person" size={16} color={COLORS.textSecondary} />
                    <Text variant="bodySmall" color="textSecondary">
                      {appointment.doctorName || appointment.doctor}
                    </Text>
                  </View>
                )}
                {(appointment.hospitalName || appointment.location) && (
                  <View style={styles.appointmentDetail}>
                    <Icon name="place" size={16} color={COLORS.textSecondary} />
                    <Text variant="bodySmall" color="textSecondary">
                      {appointment.hospitalName || appointment.location}
                    </Text>
                  </View>
                )}
                {appointment.notes && (
                  <Text variant="bodySmall" color="text" style={styles.notes}>
                    {appointment.notes}
                  </Text>
                )}
              </AnimatedCard>
            ))}
          </View>
        )}
      </ScrollView>

      <BottomSheet
        visible={sheetVisible}
        onClose={() => {
          setSheetVisible(false);
          setFormData({ doctor: '', specialty: '', location: '', date: '', time: '', notes: '' });
        }}
        height="90%"
      >
        <ScrollView
          style={styles.sheetScrollView}
          contentContainerStyle={styles.sheetContent}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled={true}
        >
          <Text variant="title" color="text" style={styles.sheetTitle}>
            Thêm lịch hẹn
          </Text>
          <Input
            label="Tên bác sĩ *"
            placeholder="Nhập tên bác sĩ"
            value={formData.doctor}
            onChangeText={(text) => setFormData({ ...formData, doctor: text })}
            containerStyle={styles.input}
          />
          <Input
            label="Chuyên khoa"
            placeholder="VD: Tim mạch, Nội tiết..."
            value={formData.specialty}
            onChangeText={(text) => setFormData({ ...formData, specialty: text })}
            containerStyle={styles.input}
          />
          <Input
            label="Bệnh viện/Phòng khám"
            placeholder="Nhập tên bệnh viện hoặc phòng khám"
            value={formData.location}
            onChangeText={(text) => setFormData({ ...formData, location: text })}
            containerStyle={styles.input}
          />
          <DatePicker
            label="Ngày (DD/MM/YYYY)"
            value={formData.date || new Date().toISOString().split('T')[0]}
            onChange={(dateStr) => setFormData({ ...formData, date: dateStr })}
          />
          <TimePicker
            label="Giờ (HH:mm)"
            value={formData.time || '08:00'}
            onChange={(timeStr) => setFormData({ ...formData, time: timeStr })}
          />
          <Input
            label="Ghi chú"
            placeholder="Nhập ghi chú (tùy chọn)"
            value={formData.notes}
            onChangeText={(text) => setFormData({ ...formData, notes: text })}
            multiline
            numberOfLines={3}
            containerStyle={styles.input}
          />
          <Button
            title="Thêm lịch hẹn"
            onPress={handleAddAppointment}
            variant="primary"
            size="large"
            style={styles.submitButton}
          />
        </ScrollView>
      </BottomSheet>
    </Screen>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: 100,
  },
  appointmentsList: {
    gap: SPACING.md,
  },
  appointmentCard: {
    marginBottom: 0,
  },
  appointmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  appointmentInfo: {
    flex: 1,
    gap: SPACING.xs / 2,
  },
  specialty: {
    marginTop: SPACING.xs / 2,
  },
  appointmentDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  notes: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  sheetTitle: {
    marginBottom: SPACING.lg,
  },
  input: {
    marginBottom: SPACING.md,
  },
  submitButton: {
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
  },
  sheetScrollView: {
    flex: 1,
  },
  sheetContent: {
    paddingBottom: SPACING['3xl'],
  },
});

