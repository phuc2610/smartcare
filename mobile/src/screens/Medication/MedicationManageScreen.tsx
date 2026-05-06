import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { getMedications, batchDeleteMedications } from '../../services/medication.service';
import { getPrescriptions, deletePrescription } from '../../services/prescription.service';
import { COLORS, SPACING } from '../../theme/tokens';

export const MedicationManageScreen = () => {
  const navigation = useNavigation();
  const [medications, setMedications] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter state
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState<string | null>(null);
  
  // Selection state
  const [selectedMedicationIds, setSelectedMedicationIds] = useState<string[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [medRes, presRes] = await Promise.all([
        getMedications(selectedPrescriptionId || undefined),
        getPrescriptions()
      ]);
      setMedications(medRes.medications || []);
      setPrescriptions(presRes.prescriptions || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách thuốc');
    } finally {
      setLoading(false);
    }
  }, [selectedPrescriptionId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle selection
  const toggleSelection = (id: string) => {
    setSelectedMedicationIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedMedicationIds.length === medications.length) {
      setSelectedMedicationIds([]);
    } else {
      setSelectedMedicationIds(medications.map(m => m._id));
    }
  };

  // Handle deletion
  const handleBatchDelete = async () => {
    if (selectedMedicationIds.length === 0) return;
    
    Alert.alert(
      'Xác nhận xóa',
      `Bạn có chắc chắn muốn xóa ${selectedMedicationIds.length} thuốc đã chọn?\nLưu ý: Các nhắc nhở liên quan cũng sẽ bị xóa.`,
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Xóa', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await batchDeleteMedications(selectedMedicationIds);
              setSelectedMedicationIds([]);
              fetchData();
            } catch (error) {
              Alert.alert('Lỗi', 'Không thể xóa thuốc');
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleDeletePrescription = async () => {
    if (!selectedPrescriptionId) return;

    const presName = prescriptions.find(p => p._id === selectedPrescriptionId)?.diagnosis || 'Đơn thuốc này';

    Alert.alert(
      'Xóa toàn bộ đơn thuốc',
      `Bạn sẽ xóa hoàn toàn đơn thuốc "${presName}", bao gồm cả hình ảnh và tất cả các loại thuốc + nhắc nhở liên quan.\nHành động này không thể hoàn tác!`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa ngay',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await deletePrescription(selectedPrescriptionId);
              setSelectedPrescriptionId(null);
              setSelectedMedicationIds([]);
              fetchData();
            } catch (error) {
              Alert.alert('Lỗi', 'Không thể xóa đơn thuốc');
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const renderMedication = ({ item }: { item: any }) => {
    const isSelected = selectedMedicationIds.includes(item._id);
    const presName = item.prescriptionId?.diagnosis || 'Thuốc thêm thủ công';
    
    return (
      <TouchableOpacity 
        activeOpacity={0.7} 
        onPress={() => toggleSelection(item._id)}
        style={[styles.medItem, isSelected && styles.medItemActive]}
      >
        <Icon 
          name={isSelected ? 'check-box' : 'check-box-outline-blank'} 
          size={24} 
          color={isSelected ? COLORS.primary : COLORS.textSecondary} 
        />
        <View style={styles.medInfo}>
          <Text style={styles.medName}>{item.name}</Text>
          <Text style={styles.medDesc}>
            {item.dosage} • {item.sessions?.join(', ')}
          </Text>
          <View style={styles.presBadge}>
            <Icon name="description" size={12} color={COLORS.textSecondary} />
            <Text style={styles.presBadgeText}>{presName}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Icon name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quản lý thuốc</Text>
        <TouchableOpacity onPress={toggleSelectAll} style={styles.headerBtnRight}>
          <Text style={styles.selectAllText}>
            {selectedMedicationIds.length === medications.length && medications.length > 0 ? 'Bỏ chọn' : 'Chọn tất cả'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Lọc theo đơn thuốc:</Text>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[{ _id: null, diagnosis: 'Tất cả' }, ...prescriptions]}
          keyExtractor={(item) => item._id || 'all'}
          renderItem={({ item }) => {
            const isActive = selectedPrescriptionId === item._id;
            return (
              <TouchableOpacity
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() => {
                  setSelectedPrescriptionId(item._id);
                  setSelectedMedicationIds([]); // Reset selection on filter change
                }}
              >
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                  {item.diagnosis || 'Không rõ'}
                </Text>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.filterList}
        />
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : medications.length === 0 ? (
        <View style={styles.center}>
          <Icon name="medication" size={64} color={COLORS.border} />
          <Text style={styles.emptyText}>Không có thuốc nào</Text>
        </View>
      ) : (
        <FlatList
          data={medications}
          keyExtractor={(item) => item._id}
          renderItem={renderMedication}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Action Bar */}
      {(selectedMedicationIds.length > 0 || selectedPrescriptionId) && (
        <View style={styles.actionBar}>
          {selectedMedicationIds.length > 0 && (
            <TouchableOpacity 
              style={[styles.actionBtn, styles.actionBtnDelete]} 
              onPress={handleBatchDelete}
            >
              <Icon name="delete" size={20} color="#fff" />
              <Text style={styles.actionBtnText}>
                Xóa {selectedMedicationIds.length} đã chọn
              </Text>
            </TouchableOpacity>
          )}

          {selectedPrescriptionId && selectedMedicationIds.length === 0 && (
            <TouchableOpacity 
              style={[styles.actionBtn, styles.actionBtnDanger]} 
              onPress={handleDeletePrescription}
            >
              <Icon name="delete-forever" size={20} color="#D32F2F" />
              <Text style={[styles.actionBtnText, { color: '#D32F2F' }]}>
                Xóa toàn bộ đơn thuốc này
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
    padding: SPACING.md, backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border
  },
  headerBtn: { padding: SPACING.xs },
  headerBtnRight: { padding: SPACING.xs, minWidth: 60, alignItems: 'flex-end' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  selectAllText: { color: COLORS.primary, fontWeight: '600' },
  
  filterSection: { paddingVertical: SPACING.sm, backgroundColor: COLORS.surface },
  filterLabel: { paddingHorizontal: SPACING.md, marginBottom: SPACING.xs, color: COLORS.textSecondary, fontSize: 13 },
  filterList: { paddingHorizontal: SPACING.sm },
  chip: { 
    paddingHorizontal: 16, paddingVertical: 8, 
    backgroundColor: COLORS.background, borderRadius: 20, 
    marginHorizontal: 4, borderWidth: 1, borderColor: COLORS.border
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { color: COLORS.text, fontSize: 14 },
  chipTextActive: { color: '#fff', fontWeight: 'bold' },
  
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { marginTop: SPACING.md, color: COLORS.textSecondary },
  
  listContent: { padding: SPACING.md },
  medItem: {
    flexDirection: 'row', alignItems: 'center', padding: SPACING.md,
    backgroundColor: COLORS.surface, borderRadius: 12, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border
  },
  medItemActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '10' },
  medInfo: { marginLeft: SPACING.md, flex: 1 },
  medName: { fontSize: 16, fontWeight: 'bold', color: COLORS.text, marginBottom: 4 },
  medDesc: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 6 },
  presBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  presBadgeText: { fontSize: 12, color: COLORS.textSecondary, marginLeft: 4 },
  
  actionBar: {
    padding: SPACING.md, backgroundColor: COLORS.surface,
    borderTopWidth: 1, borderTopColor: COLORS.border,
    flexDirection: 'row', justifyContent: 'space-around',
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 10
  },
  actionBtn: { 
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', 
    paddingVertical: 12, borderRadius: 8, marginHorizontal: 4
  },
  actionBtnDelete: { backgroundColor: '#F44336' },
  actionBtnDanger: { backgroundColor: '#FFEBEE', borderWidth: 1, borderColor: '#FFCDD2' },
  actionBtnText: { color: '#fff', fontWeight: 'bold', marginLeft: 8 },
});
