/**
 * PatientListScreen
 * Quản lý nhiều bệnh nhân với search, filters, và patient cards
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { Screen } from '../../ui/Screen';
import { AppHeader } from '../../components/AppHeader';
import { Text } from '../../ui/Text';
import { Input } from '../../ui/Input';
import { Chip } from '../../ui/Chip';
import { Card } from '../../ui/Card';
import { Fab } from '../../ui/Fab';
import { BottomSheet } from '../../ui/BottomSheet';
import { Button } from '../../ui/Button';
import { Loading } from '../../ui/Loading';
import { EmptyState } from '../../ui/EmptyState';
import { Avatar } from '../../components/Avatar';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../theme';
import { getPatientList } from '../../services/caregiverPlus.service';
import { submitLinkCode } from '../../services/caregiver.service';
import { PatientSummary, PatientFilter } from '../../types';
import { showSuccess, showError as showErrorUtil } from '../../utils/alert';
import { logger } from '../../utils/logger';

const AnimatedCard = Animated.createAnimatedComponent(Card);

export const PatientListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<PatientFilter>('all');
  const [fabSheetVisible, setFabSheetVisible] = useState(false);
  const [linkCode, setLinkCode] = useState('');
  const [submittingCode, setSubmittingCode] = useState(false);

  useEffect(() => {
    fetchPatients();
  }, [filter]);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPatientList(filter);
      setPatients(data.patients);
    } catch (err: any) {
      setError(err.message || 'Không thể tải danh sách bệnh nhân');
      logger.error('Fetch patients error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const filteredPatients = patients.filter(patient => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      patient.name.toLowerCase().includes(query) ||
      patient._id.toLowerCase().includes(query) ||
      (patient.medicalCondition?.toLowerCase().includes(query) ?? false)
    );
  });

  const handleSubmitLinkCode = async () => {
    if (!linkCode.trim()) {
      showErrorUtil('Lỗi', 'Vui lòng nhập mã liên kết');
      return;
    }

    try {
      setSubmittingCode(true);
      const result = await submitLinkCode(linkCode.trim());
      showSuccess('Thành công', `Đã liên kết với ${result.patientName}`);
      setFabSheetVisible(false);
      setLinkCode('');
      fetchPatients();
    } catch (err: any) {
      showErrorUtil('Lỗi', err.message || 'Mã liên kết không hợp lệ');
    } finally {
      setSubmittingCode(false);
    }
  };

  const handlePatientPress = (patientId: string) => {
    navigation.navigate('PatientDetail', { patientId });
  };

  if (loading && patients.length === 0) {
    return (
      <Screen>
        <AppHeader title="Quản lý bệnh nhân" />
        <Loading message="Đang tải danh sách..." />
      </Screen>
    );
  }

  if (error && patients.length === 0) {
    return (
      <Screen>
        <AppHeader title="Quản lý bệnh nhân" />
        <EmptyState
          icon="⚠️"
          title="Đã xảy ra lỗi"
          message={error}
          actionLabel="Thử lại"
          onAction={fetchPatients}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <AppHeader title="Quản lý bệnh nhân" />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Input
            placeholder="Tìm theo tên, mã..."
            value={searchQuery}
            onChangeText={handleSearch}
            leftIcon={<Icon name="search" size={20} color={COLORS.textSecondary} />}
            containerStyle={styles.searchInput}
          />
        </View>

        {/* Filter Chips */}
        <View style={styles.filterContainer}>
          <Chip
            label="Tất cả"
            variant={filter === 'all' ? 'primary' : 'default'}
            onPress={() => setFilter('all')}
          />
          <Chip
            label="Cần chú ý"
            variant={filter === 'needsAttention' ? 'primary' : 'default'}
            onPress={() => setFilter('needsAttention')}
          />
          <Chip
            label="Mới cập nhật"
            variant={filter === 'recentUpdate' ? 'primary' : 'default'}
            onPress={() => setFilter('recentUpdate')}
          />
        </View>

        {/* Patient List */}
        {filteredPatients.length === 0 ? (
          <EmptyState
            icon="👤"
            title={searchQuery ? "Không tìm thấy" : "Chưa có bệnh nhân"}
            message={searchQuery ? "Thử tìm kiếm với từ khóa khác" : "Liên kết với bệnh nhân để bắt đầu theo dõi"}
            actionLabel={!searchQuery ? "Liên kết bệnh nhân" : undefined}
            onAction={!searchQuery ? () => setFabSheetVisible(true) : undefined}
          />
        ) : (
          <View style={styles.patientList}>
            {filteredPatients.map((patient, index) => (
              <AnimatedCard
                key={patient._id}
                index={index}
                onPress={() => handlePatientPress(patient._id)}
                style={styles.patientCard}
              >
                <View style={styles.patientCardHeader}>
                  <Avatar name={patient.name} size={48} avatarUrl={patient.avatar} />
                  <View style={styles.patientCardInfo}>
                    <Text variant="section" color="text" semibold>
                      {patient.name}
                    </Text>
                    {patient.age && (
                      <Text variant="caption" color="textSecondary">
                        {patient.age} tuổi
                      </Text>
                    )}
                  </View>
                  {patient.needsAttention && (
                    <View style={styles.attentionBadge}>
                      <Icon name="warning" size={16} color={COLORS.warning} />
                    </View>
                  )}
                </View>

                {patient.medicalCondition && patient.medicalCondition !== 'Normal' && (
                  <View style={styles.conditionTags}>
                    <Chip
                      label={patient.medicalCondition}
                      variant="secondary"
                      style={styles.conditionTag}
                    />
                  </View>
                )}

                <View style={styles.patientCardFooter}>
                  <View style={styles.footerItem}>
                    <Text variant="caption" color="textSecondary">
                      Cập nhật gần nhất
                    </Text>
                    <Text variant="bodySmall" color="text" semibold>
                      {patient.lastUpdate
                        ? new Date(patient.lastUpdate).toLocaleDateString('vi-VN', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Chưa có'}
                    </Text>
                  </View>
                  
                  {patient.adherenceRate !== undefined && (
                    <View style={styles.adherenceContainer}>
                      <Text variant="caption" color="textSecondary" style={styles.adherenceLabel}>
                        Tuân thủ
                      </Text>
                      <View style={styles.progressBar}>
                        <View
                          style={[
                            styles.progressFill,
                            { width: `${patient.adherenceRate}%` },
                          ]}
                        />
                      </View>
                      <Text variant="caption" color="primary" semibold>
                        {patient.adherenceRate}%
                      </Text>
                    </View>
                  )}
                </View>
              </AnimatedCard>
            ))}
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <Fab
        onPress={() => setFabSheetVisible(true)}
        style={styles.fab}
      />

      {/* Link Code Bottom Sheet */}
      <BottomSheet
        visible={fabSheetVisible}
        onClose={() => {
          setFabSheetVisible(false);
          setLinkCode('');
        }}
        height={300}
      >
        <Text variant="title" color="text" style={styles.sheetTitle}>
          Liên kết bệnh nhân
        </Text>
        <Text variant="bodySmall" color="textSecondary" style={styles.sheetDescription}>
          Nhập mã liên kết 6 chữ số từ bệnh nhân
        </Text>

        <Input
          placeholder="Nhập mã liên kết"
          value={linkCode}
          onChangeText={setLinkCode}
          keyboardType="number-pad"
          maxLength={6}
          containerStyle={styles.linkInput}
        />

        <View style={styles.sheetActions}>
            <Button
              title="Quét QR"
              onPress={() => {
                // TODO: Implement QR scanner
                showErrorUtil('Thông báo', 'Tính năng quét QR đang được phát triển');
              }}
            variant="outline"
            size="medium"
            style={styles.sheetButton}
          />
          <Button
            title="Xác nhận"
            onPress={handleSubmitLinkCode}
            variant="primary"
            size="medium"
            loading={submittingCode}
            style={styles.sheetButton}
          />
        </View>
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
  searchContainer: {
    marginBottom: SPACING.lg,
  },
  searchInput: {
    marginBottom: 0,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
    flexWrap: 'wrap',
  },
  patientList: {
    gap: SPACING.md,
  },
  patientCard: {
    marginBottom: 0,
  },
  patientCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  patientCardInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  attentionBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.warning + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  conditionTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  conditionTag: {
    marginRight: 0,
  },
  patientCardFooter: {
    gap: SPACING.sm,
  },
  footerItem: {
    gap: SPACING.xs / 2,
  },
  adherenceContainer: {
    marginTop: SPACING.xs,
  },
  adherenceLabel: {
    marginBottom: SPACING.xs / 2,
  },
  progressBar: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    marginBottom: SPACING.xs / 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
  },
  fab: {
    bottom: SPACING['2xl'],
    right: SPACING.lg,
  },
  sheetTitle: {
    marginBottom: SPACING.xs,
  },
  sheetDescription: {
    marginBottom: SPACING.lg,
  },
  linkInput: {
    marginBottom: SPACING.lg,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  sheetButton: {
    flex: 1,
  },
});

