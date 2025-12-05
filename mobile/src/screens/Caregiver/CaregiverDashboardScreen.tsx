import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { getPatients } from '../../services/caregiver.service';
import { DashboardScreen } from '../Dashboard/DashboardScreen';
import { ReportScreen } from '../Report/ReportScreen';
import { User } from '../../types';
import { COLORS } from '../../utils/constants';
import { Avatar } from '../../components/Avatar';
import { StatCard } from '../../components/StatCard';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { EmptyState } from '../../components/EmptyState';
import { AppHeader } from '../../components/AppHeader';

export const CaregiverDashboardScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const [patient, setPatient] = useState<User | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPatient();
  }, []);

  const fetchPatient = async () => {
    try {
      const data = await getPatients();
      if (data.patients.length > 0) {
        setPatient(data.patients[0]);
      }
    } catch (error) {
      console.error('Failed to fetch patient:', error);
    } finally {
      setLoading(false);
    }
  };

  const [adherenceRate, setAdherenceRate] = useState(0);

  useEffect(() => {
    if (patient) {
      // Calculate adherence rate from reminders
      // This would need to fetch reminders and calculate
      setAdherenceRate(85); // Mock for now
    }
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
          onPress={() => navigation.navigate('Link')}
        >
          <Text style={styles.linkButtonText}>Liên kết ngay</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
        <TouchableOpacity
          style={styles.callButton}
          onPress={() => Linking.openURL(`tel:${patient.phone}`)}
        >
          <Text style={styles.callButtonText}>📞</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Stats */}
      <View style={styles.quickStats}>
        <StatCard 
          value={`${adherenceRate}%`} 
          label="Tuân thủ thuốc" 
          color={COLORS.primary}
        />
        <StatCard 
          value="Ổn định" 
          label="Tình trạng" 
          color={COLORS.success}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Lịch uống thuốc hôm nay</Text>
        <DashboardScreen targetUserId={patient._id} readOnly={true} hideSOS={true} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Báo cáo sức khỏe</Text>
        <ReportScreen route={{ params: { userId: patient._id } }} />
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
});





