import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { getPrescriptions, Prescription } from '../../services/prescription.service';
import { PrescriptionCard, PrescriptionData } from '../../components/PrescriptionCard';
import { MedicalDisclaimer } from '../../components/MedicalDisclaimer';
import { COLORS } from '../../theme/tokens';

const TEAL = COLORS.primary;

export const SavedPrescriptionsScreen = () => {
  const navigation = useNavigation<any>();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const result = await getPrescriptions();
      setPrescriptions(result.prescriptions || []);
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
      fetchData();
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleView = (p: Prescription) => {
    navigation.navigate('PrescriptionView', { prescription: p });
  };

  const handleEdit = (p: Prescription) => {
    navigation.navigate('PrescriptionEdit', { prescription: p });
  };

  const mapToCard = (p: Prescription): PrescriptionData => ({
    id: p._id,
    name: p.diagnosis || 'ĐƠN THUỐC',
    doctorName: p.doctorName || '—',
    patientName: p.patientName || '—',
    startDate: p.startDate || '—',
    notes: p.notes || undefined,
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
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
              key={item._id}
              data={mapToCard(item)}
              onEdit={() => handleEdit(item)}
              onViewDetail={() => handleView(item)}
            />
          ))
        )}
        <MedicalDisclaimer />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, minHeight: 52 },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#FFFFFF' },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 24 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 40 },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: '#1C1C1E', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#8E8E93', textAlign: 'center', lineHeight: 21 },
  emptyText: { fontSize: 14, color: '#8E8E93' },
});
