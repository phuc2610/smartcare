import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../../contexts/AuthContext';
import { PrescriptionCard, PrescriptionData } from '../../components/PrescriptionCard';
import { MedicalDisclaimer } from '../../components/MedicalDisclaimer';
import { showInfo } from '../../utils/alert';

const TEAL = '#458B81';

/**
 * Saved Prescriptions Screen (Màn hình 2)
 * Displays all saved prescriptions with PrescriptionCard
 */
export const SavedPrescriptionsScreen = () => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [prescriptions, setPrescriptions] = useState<PrescriptionData[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchPrescriptions = async () => {
    try {
      // Try to load medications from service
      const { getMedications } = require('../../services/medication.service');
      const result = await getMedications();
      const meds = result.medications || [];

      const mapped: PrescriptionData[] = meds.map((med: any) => ({
        id: med._id,
        name: med.name || 'ĐƠN THUỐC',
        doctorName: med.prescribedBy || '—',
        patientName: user?.name?.toUpperCase() || '—',
        startDate: med.startDate
          ? new Date(med.startDate).toLocaleDateString('vi-VN', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })
          : '—',
        notes: med.notes || med.instructions || undefined,
      }));

      setPrescriptions(mapped);
    } catch (error) {
      console.error('Failed to fetch prescriptions:', error);
      setPrescriptions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchPrescriptions();
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPrescriptions();
  };

  const handleEdit = (item: PrescriptionData) => {
    showInfo('Chỉnh sửa', `Chức năng chỉnh sửa đơn thuốc "${item.name}" đang được phát triển.`);
  };

  const handleViewDetail = (item: PrescriptionData) => {
    showInfo('Chi tiết', `Xem chi tiết đơn thuốc "${item.name}" đang được phát triển.`);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tất cả đơn thuốc</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={TEAL} />}
      >
        {loading ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Đang tải...</Text>
          </View>
        ) : prescriptions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrap}>
              <Icon name="description" size={48} color="#D1D5DB" />
            </View>
            <Text style={styles.emptyTitle}>Chưa có đơn thuốc</Text>
            <Text style={styles.emptySubtitle}>
              Nhấn nút Camera ở thanh điều hướng để quét đơn thuốc đầu tiên.
            </Text>
          </View>
        ) : (
          prescriptions.map((item) => (
            <PrescriptionCard
              key={item.id}
              data={item}
              onEdit={() => handleEdit(item)}
              onViewDetail={() => handleViewDetail(item)}
            />
          ))
        )}

        {/* Footer */}
        <MedicalDisclaimer />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: TEAL,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    minHeight: 52,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 21,
  },
  emptyText: {
    fontSize: 14,
    color: '#8E8E93',
  },
});
