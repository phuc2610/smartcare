import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking, Modal } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../../contexts/AuthContext';
import { getPatients } from '../../services/caregiver.service';
import { getMedicationAdherence } from '../../services/caregiverPlus.service';
import { DashboardScreen } from '../Dashboard/DashboardScreen';
import { ReportScreen } from '../Report/ReportScreen';
import { User } from '../../types';
import { COLORS } from '../../utils/constants';
import { Avatar } from '../../components/Avatar';
import { StatCard } from '../../components/StatCard';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { EmptyState } from '../../components/EmptyState';
import { AppHeader } from '../../components/AppHeader';
import { Button } from '../../ui/Button';

export const CaregiverDashboardScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const [patients, setPatients] = useState<User[]>([]);
  const [patient, setPatient] = useState<User | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [showPatientPicker, setShowPatientPicker] = useState(false);

  useEffect(() => {
    fetchPatient();
  }, []);

  const fetchPatient = async () => {
    try {
      const data = await getPatients();
      setPatients(data.patients || []);
      if (data.patients.length > 0) {
        setPatient(data.patients[0]);
      }
    } catch (error) {
      console.error('Failed to fetch patient:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchPatient = () => {
    if (!patient || patients.length === 0) return;
    setShowPatientPicker(true);
  };

  const handleSelectPatient = (p: User) => {
    setPatient(p);
    setShowPatientPicker(false);
  };

  const [adherenceRate, setAdherenceRate] = useState<number | null>(null);

  useEffect(() => {
    const loadAdherence = async () => {
      if (!patient?._id) {
        setAdherenceRate(null);
        return;
      }
      try {
        const data = await getMedicationAdherence(patient._id);
        setAdherenceRate(typeof data.rate === 'number' ? data.rate : null);
      } catch (error) {
        console.error('Failed to fetch adherence:', error);
        setAdherenceRate(null);
      }
    };
    loadAdherence();
  }, [patient]);

  if (loading) {
    return <LoadingSpinner message="Đang tải dữ liệu..." />;
  }

  if (!patient) {
    return (
      <View style={styles.emptyContainer}>
        <EmptyState 
          icon="👤" 
          title="Chưa liên kết người bệnh"
          message="Bạn cần nhập mã kết nối để bắt đầu theo dõi sức khỏe người thân."
        />
        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => navigation.navigate('Profile')}
        >
          <Text style={styles.linkButtonText}>Liên kết ngay</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const mainContent = (
    <>
      <AppHeader title="Theo dõi người thân" />
      <ScrollView style={styles.scrollView}>
        {/* Patient Profile Header */}
        <View style={styles.patientHeader}>
          <View style={styles.patientInfo}>
            <Avatar name={patient.name} size={56} />
            <View style={styles.patientDetails}>
              <Text style={styles.headerLabel}>Đang theo dõi</Text>
              <Text style={styles.patientName}>{patient.name}</Text>
              {patient.medicalCondition && patient.medicalCondition !== 'Normal' && (
                <View style={styles.conditionBadge}>
                  <Text style={styles.conditionText}>{patient.medicalCondition}</Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.callButton}
              onPress={() => Linking.openURL(`tel:${patient.phone}`)}
            >
              <Text style={styles.callButtonText}>📞</Text>
            </TouchableOpacity>
            {patients.length > 1 && (
              <TouchableOpacity
                style={styles.switchButton}
                onPress={handleSwitchPatient}
              >
                <Icon name="swap-horiz" size={24} color={COLORS.primary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.quickStats}>
          <StatCard 
            value={adherenceRate !== null ? `${adherenceRate}%` : '--'} 
            label="Tuân thủ thuốc" 
            color={COLORS.primary}
          />
          <StatCard 
            value="Ổn định" 
            label="Tình trạng" 
            color={COLORS.success}
          />
        </View>

        {/* CaregiverPlus Entry Point */}
        <View style={styles.caregiverPlusSection}>
          <Button
            title="Quản lý bệnh nhân"
            onPress={() => navigation.navigate('PatientList')}
            variant="primary"
            size="medium"
            style={styles.manageButton}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lịch uống thuốc hôm nay</Text>
          <DashboardScreen targetUserId={patient._id} readOnly={true} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Báo cáo sức khỏe</Text>
          <ReportScreen route={{ params: { userId: patient._id } }} />
        </View>
      </ScrollView>
    </>
  );

  return (
    <View style={styles.container}>
      {mainContent}
      <Modal
        visible={showPatientPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPatientPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Chọn người bệnh</Text>
            <ScrollView style={styles.modalList}>
              {patients.map((p) => (
                <TouchableOpacity
                  key={p._id}
                  style={[
                    styles.modalItem,
                    patient?._id === p._id && styles.modalItemActive,
                  ]}
                  onPress={() => handleSelectPatient(p)}
                >
                  <Avatar name={p.name} size={40} />
                  <View style={styles.modalItemInfo}>
                    <Text style={styles.modalItemName}>{p.name}</Text>
                    {p.medicalCondition && p.medicalCondition !== 'Normal' && (
                      <Text style={styles.modalItemCondition}>{p.medicalCondition}</Text>
                    )}
                  </View>
                  {patient?._id === p._id && (
                    <Icon name="check" size={20} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setShowPatientPicker(false)}
            >
              <Text style={styles.modalCloseText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  linkButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 16,
    marginTop: 24,
  },
  linkButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  patientHeader: {
    backgroundColor: COLORS.primary,
    padding: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  patientInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  patientDetails: {
    flex: 1,
  },
  headerLabel: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  patientName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  conditionBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  conditionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  callButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  callButtonText: {
    fontSize: 20,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  switchButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxHeight: '70%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  modalList: {
    maxHeight: 320,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalItemActive: {
    backgroundColor: COLORS.background,
  },
  modalItemInfo: {
    flex: 1,
  },
  modalItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  modalItemCondition: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  modalClose: {
    marginTop: 12,
    alignSelf: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  modalCloseText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  quickStats: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  caregiverPlusSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  manageButton: {
    width: '100%',
  },
});





