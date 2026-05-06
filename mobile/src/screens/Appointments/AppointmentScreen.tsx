import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { showError } from '../../utils/alert';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING, RADIUS } from '../../theme/tokens';
import { Text } from '../../ui/Text';
import { Card } from '../../ui/Card';
import { Screen } from '../../ui/Screen';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { AppHeader } from '../../components/AppHeader';
import { DatePicker } from '../../components/DatePicker';
import { TimePicker } from '../../components/TimePicker';
import { 
  getAppointments, 
  createAppointment, 
  updateAppointment, 
  deleteAppointment,
  Appointment 
} from '../../services/appointment.service';
import { scheduleAppointmentReminder, cancelNotification } from '../../services/notification.service';
import { Loading } from '../../ui/Loading';
import { EmptyState } from '../../ui/EmptyState';

export const AppointmentScreen = () => {
  const navigation = useNavigation<any>();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed'>('upcoming');
  
  // Form state
  const [doctorName, setDoctorName] = useState('');
  const [doctorSpecialty, setDoctorSpecialty] = useState('');
  const [hospitalName, setHospitalName] = useState('');
  const [appointmentDate, setAppointmentDate] = useState(new Date());
  const [appointmentTime, setAppointmentTime] = useState('');
  const [notes, setNotes] = useState('');
  const [reminderBefore, setReminderBefore] = useState(24);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAppointments();
  }, [filter]);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filter === 'upcoming') params.upcoming = true;
      if (filter === 'completed') params.completed = true;
      
      const data = await getAppointments(params);
      setAppointments(data.appointments);
    } catch (error) {
      console.error('Failed to load appointments:', error);
      showError('Lỗi', 'Không thể tải danh sách lịch hẹn');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!doctorName.trim()) {
      showError('Lỗi', 'Vui lòng nhập tên bác sĩ');
      return;
    }

    setSaving(true);
    try {
      const appointmentData = {
        doctorName: doctorName.trim(),
        doctorSpecialty: doctorSpecialty.trim(),
        hospitalName: hospitalName.trim(),
        appointmentDate: appointmentDate.toISOString(),
        appointmentTime: appointmentTime.trim(),
        notes: notes.trim(),
        reminderBefore,
      };

      let savedAppointment;
      if (editingAppointment) {
        // Cancel old notification if exists
        if (editingAppointment.notificationId) {
          await cancelNotification(editingAppointment.notificationId);
        }
        savedAppointment = await updateAppointment(editingAppointment._id, appointmentData);
      } else {
        savedAppointment = await createAppointment(appointmentData);
      }

      // Schedule notification (remind before appointment)
      const appointmentDateTime = new Date(savedAppointment.appointment.appointmentDate);
      if (savedAppointment.appointment.appointmentTime) {
        const [hours, minutes] = savedAppointment.appointment.appointmentTime.split(':').map(Number);
        appointmentDateTime.setHours(hours, minutes);
      }
      const reminderTime = new Date(appointmentDateTime);
      reminderTime.setHours(reminderTime.getHours() - savedAppointment.appointment.reminderBefore);

      if (!savedAppointment.appointment.isCompleted && reminderTime > new Date()) {
        try {
          const notificationId = await scheduleAppointmentReminder(
            `Lịch hẹn với ${savedAppointment.appointment.doctorName}`,
            `${savedAppointment.appointment.hospitalName || 'Bệnh viện'} - ${savedAppointment.appointment.appointmentTime || 'Sắp tới'}`,
            reminderTime,
            savedAppointment.appointment._id
          );
          // Update appointment with notificationId
          await updateAppointment(savedAppointment.appointment._id, { notificationId });
        } catch (error) {
          console.error('Failed to schedule notification:', error);
        }
      }

      setShowAddModal(false);
      setEditingAppointment(null);
      resetForm();
      loadAppointments();
      const { showSuccess } = require('../../utils/alert');
      showSuccess('Thành công', editingAppointment ? 'Đã cập nhật lịch hẹn' : 'Đã tạo lịch hẹn');
    } catch (error: any) {
      showError('Lỗi', error?.message || 'Không thể lưu lịch hẹn');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (appointment: Appointment) => {
    const { showConfirm, showError } = require('../../utils/alert');
    showConfirm(
      'Xác nhận',
      'Bạn có chắc muốn xóa lịch hẹn này?',
      async () => {
        try {
          // Cancel notification if exists
          if (appointment.notificationId) {
            await cancelNotification(appointment.notificationId);
          }
          await deleteAppointment(appointment._id);
          loadAppointments();
        } catch (error: any) {
          showError('Lỗi', error?.message || 'Không thể xóa');
        }
      }
    );
  };

  const handleEdit = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setDoctorName(appointment.doctorName);
    setDoctorSpecialty(appointment.doctorSpecialty);
    setHospitalName(appointment.hospitalName);
    setAppointmentDate(new Date(appointment.appointmentDate));
    setAppointmentTime(appointment.appointmentTime);
    setNotes(appointment.notes);
    setReminderBefore(appointment.reminderBefore);
    setShowAddModal(true);
  };

  const handleComplete = async (id: string) => {
    try {
      await updateAppointment(id, { isCompleted: true });
      loadAppointments();
    } catch (error: any) {
      showError('Lỗi', error?.message || 'Không thể cập nhật');
    }
  };

  const resetForm = () => {
    setDoctorName('');
    setDoctorSpecialty('');
    setHospitalName('');
    setAppointmentDate(new Date());
    setAppointmentTime('');
    setNotes('');
    setReminderBefore(24);
    setEditingAppointment(null);
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const isUpcoming = (date: string) => {
    return new Date(date) >= new Date();
  };

  if (loading) {
    return (
      <Screen>
        <AppHeader title="Lịch tái khám" showBack onBack={() => navigation?.goBack()} />
        <Loading message="Đang tải..." />
      </Screen>
    );
  }

  return (
    <Screen>
      <AppHeader 
        title="Lịch tái khám" 
        showBack 
        onBack={() => navigation?.goBack()}
        rightAction={
          <TouchableOpacity
            onPress={() => {
              resetForm();
              setShowAddModal(true);
            }}
            style={styles.addButton}
          >
            <Icon name="add" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        }
      />
      
      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'upcoming' && styles.filterTabActive]}
          onPress={() => setFilter('upcoming')}
        >
          <Text variant="caption" color={filter === 'upcoming' ? 'text' : 'textSecondary'}>
            Sắp tới
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'completed' && styles.filterTabActive]}
          onPress={() => setFilter('completed')}
        >
          <Text variant="caption" color={filter === 'completed' ? 'text' : 'textSecondary'}>
            Đã hoàn thành
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text variant="caption" color={filter === 'all' ? 'text' : 'textSecondary'}>
            Tất cả
          </Text>
        </TouchableOpacity>
      </View>

      <Screen scrollable>
        {appointments.length === 0 ? (
          <EmptyState
            icon="📅"
            title="Chưa có lịch hẹn"
            message="Tạo lịch hẹn tái khám để được nhắc nhở"
          />
        ) : (
          appointments.map((appointment) => (
            <Card key={appointment._id} style={styles.appointmentCard}>
              <View style={styles.appointmentHeader}>
                <View style={styles.appointmentInfo}>
                  <Text variant="body" color="text" semibold>
                    {appointment.doctorName}
                  </Text>
                  {appointment.doctorSpecialty && (
                    <Text variant="caption" color="textSecondary" style={styles.specialty}>
                      {appointment.doctorSpecialty}
                    </Text>
                  )}
                  {appointment.hospitalName && (
                    <View style={styles.metaRow}>
                      <Icon name="local-hospital" size={16} color={COLORS.textSecondary} />
                      <Text variant="caption" color="textSecondary" style={styles.metaText}>
                        {appointment.hospitalName}
                      </Text>
                    </View>
                  )}
                  <View style={styles.metaRow}>
                    <Icon name="event" size={16} color={COLORS.textSecondary} />
                    <Text variant="caption" color="textSecondary" style={styles.metaText}>
                      {formatDate(appointment.appointmentDate)}
                      {appointment.appointmentTime && ` • ${appointment.appointmentTime}`}
                    </Text>
                  </View>
                  {appointment.notes && (
                    <Text variant="caption" color="textSecondary" style={styles.notes}>
                      {appointment.notes}
                    </Text>
                  )}
                </View>
                <View style={styles.appointmentActions}>
                  {!appointment.isCompleted && isUpcoming(appointment.appointmentDate) && (
                    <TouchableOpacity
                      onPress={() => handleComplete(appointment._id)}
                      style={styles.actionButton}
                    >
                      <Icon name="check-circle" size={20} color={COLORS.success} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={() => handleEdit(appointment)}
                    style={styles.actionButton}
                  >
                    <Icon name="edit" size={20} color={COLORS.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDelete(appointment)}
                    style={styles.actionButton}
                  >
                    <Icon name="delete" size={20} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
              </View>
              {appointment.isCompleted && (
                <View style={styles.completedBadge}>
                  <Text variant="caption" color="success">
                    ✓ Đã hoàn thành
                  </Text>
                </View>
              )}
            </Card>
          ))
        )}
      </Screen>

      {/* Add/Edit Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowAddModal(false);
          resetForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <Card style={styles.modal}>
            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalContent}
            >
              <View style={styles.modalHeader}>
                <Text variant="section" color="text">
                  {editingAppointment ? 'Chỉnh sửa lịch hẹn' : 'Tạo lịch hẹn mới'}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                >
                  <Icon name="close" size={24} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              <Input
                label="Tên bác sĩ *"
                value={doctorName}
                onChangeText={setDoctorName}
                placeholder="Nhập tên bác sĩ"
              />

              <Input
                label="Chuyên khoa"
                value={doctorSpecialty}
                onChangeText={setDoctorSpecialty}
                placeholder="VD: Tim mạch, Nội tiết..."
              />

              <Input
                label="Bệnh viện/Phòng khám"
                value={hospitalName}
                onChangeText={setHospitalName}
                placeholder="Nhập tên bệnh viện"
              />

              <View style={styles.dateTimeSection}>
                <DatePicker
                  value={appointmentDate.toISOString().split('T')[0]}
                  onChange={(dateStr) => {
                    const [year, month, day] = dateStr.split('-').map(Number);
                    setAppointmentDate(new Date(year, month - 1, day));
                  }}
                  label="Ngày hẹn *"
                />
              </View>

              <View style={styles.dateTimeSection}>
                <TimePicker
                  value={appointmentTime}
                  onChange={setAppointmentTime}
                  label="Giờ hẹn"
                />
              </View>

              <View style={styles.reminderSection}>
                <Text variant="bodySmall" color="text" style={styles.label}>
                  Nhắc nhở trước (giờ)
                </Text>
                <View style={styles.reminderOptions}>
                  {[6, 12, 24, 48].map((hours) => (
                    <TouchableOpacity
                      key={hours}
                      style={[
                        styles.reminderOption,
                        reminderBefore === hours && styles.reminderOptionActive,
                      ]}
                      onPress={() => setReminderBefore(hours)}
                    >
                      <Text
                        variant="caption"
                        color={reminderBefore === hours ? 'text' : 'textSecondary'}
                      >
                        {hours}h
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <Input
                label="Ghi chú"
                value={notes}
                onChangeText={setNotes}
                placeholder="Nhập ghi chú (tùy chọn)"
                multiline
              />

              <Button
                title={editingAppointment ? 'Cập nhật' : 'Tạo lịch hẹn'}
                onPress={handleSave}
                variant="primary"
                loading={saving}
                style={styles.saveButton}
              />
            </ScrollView>
          </Card>
        </View>
      </Modal>
    </Screen>
  );
};

const styles = StyleSheet.create({
  addButton: {
    padding: SPACING.xs,
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  filterTab: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterTabActive: {
    backgroundColor: COLORS.primaryLight + '20',
    borderColor: COLORS.primary,
  },
  appointmentCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  appointmentInfo: {
    flex: 1,
  },
  specialty: {
    marginTop: SPACING.xs / 2,
    marginBottom: SPACING.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  metaText: {
    marginLeft: SPACING.xs / 2,
  },
  notes: {
    marginTop: SPACING.xs,
    fontStyle: 'italic',
  },
  appointmentActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  actionButton: {
    padding: SPACING.xs,
  },
  completedBadge: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modal: {
    width: '90%',
    maxHeight: '80%',
    padding: 0,
  },
  modalContent: {
    padding: SPACING.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  dateTimeSection: {
    marginTop: SPACING.md,
  },
  label: {
    marginBottom: SPACING.sm,
  },
  reminderSection: {
    marginTop: SPACING.md,
  },
  reminderOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  reminderOption: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  reminderOptionActive: {
    backgroundColor: COLORS.primaryLight + '20',
    borderColor: COLORS.primary,
  },
  saveButton: {
    marginTop: SPACING.lg,
  },
});

