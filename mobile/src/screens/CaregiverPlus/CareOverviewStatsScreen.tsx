/**
 * CareOverviewStatsScreen
 * Thống kê tổng quan với overview across patients, rankings, alerts count, weekly trend
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen } from '../../ui/Screen';
import { AppHeader } from '../../components/AppHeader';
import { Text } from '../../ui/Text';
import { Card } from '../../ui/Card';
import { Loading } from '../../ui/Loading';
import { EmptyState } from '../../ui/EmptyState';
import { COLORS, SPACING } from '../../theme';
import { getPatientList } from '../../services/caregiverPlus.service';
import { PatientSummary } from '../../types';
import { logger } from '../../utils/logger';

const AnimatedCard = Animated.createAnimatedComponent(Card);

export const CareOverviewStatsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<PatientSummary[]>([]);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const data = await getPatientList();
      setPatients(data.patients);
    } catch (err: any) {
      logger.error('Fetch patients error:', err);
    } finally {
      setLoading(false);
    }
  };

  const sortedByAdherence = [...patients].sort((a, b) => (b.adherenceRate || 0) - (a.adherenceRate || 0));
  const totalAlerts = patients.reduce((sum, p) => sum + (p.recentAlerts || 0), 0);
  const avgAdherence = patients.length > 0
    ? patients.reduce((sum, p) => sum + (p.adherenceRate || 0), 0) / patients.length
    : 0;

  if (loading) {
    return (
      <Screen>
        <AppHeader title="Thống kê tổng quan" />
        <Loading message="Đang tải thống kê..." />
      </Screen>
    );
  }

  return (
    <Screen scrollable>
      <AppHeader title="Thống kê tổng quan" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <AnimatedCard entering={FadeInDown.delay(50)} style={styles.summaryCard}>
            <Icon name="people" size={32} color={COLORS.primary} />
            <Text variant="title" color="text" semibold style={styles.summaryValue}>
              {patients.length}
            </Text>
            <Text variant="caption" color="textSecondary">
              Bệnh nhân
            </Text>
          </AnimatedCard>

          <AnimatedCard entering={FadeInDown.delay(100)} style={styles.summaryCard}>
            <Icon name="notifications" size={32} color={COLORS.warning} />
            <Text variant="title" color="text" semibold style={styles.summaryValue}>
              {totalAlerts}
            </Text>
            <Text variant="caption" color="textSecondary">
              Cảnh báo
            </Text>
          </AnimatedCard>

          <AnimatedCard entering={FadeInDown.delay(150)} style={styles.summaryCard}>
            <Icon name="check-circle" size={32} color={COLORS.success} />
            <Text variant="title" color="text" semibold style={styles.summaryValue}>
              {avgAdherence.toFixed(0)}%
            </Text>
            <Text variant="caption" color="textSecondary">
              Tuân thủ TB
            </Text>
          </AnimatedCard>
        </View>

        {/* Adherence Ranking */}
        {sortedByAdherence.length > 0 && (
          <View style={styles.section}>
            <Text variant="section" color="text" semibold style={styles.sectionTitle}>
              Xếp hạng tuân thủ
            </Text>
            <Card style={styles.rankingCard}>
              {sortedByAdherence.map((patient, index) => (
                <View key={patient._id} style={styles.rankingItem}>
                  <View style={styles.rankingLeft}>
                    <Text variant="title" color="text" semibold style={styles.rankNumber}>
                      {index + 1}
                    </Text>
                    <Text variant="body" color="text" semibold>
                      {patient.name}
                    </Text>
                  </View>
                  <Text variant="body" color="primary" semibold>
                    {patient.adherenceRate || 0}%
                  </Text>
                </View>
              ))}
            </Card>
          </View>
        )}

        {patients.length === 0 && (
          <EmptyState
            icon="📊"
            title="Chưa có dữ liệu"
            message="Liên kết với bệnh nhân để xem thống kê"
          />
        )}
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING['3xl'],
  },
  summaryRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING['2xl'],
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    marginBottom: 0,
  },
  summaryValue: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs / 2,
  },
  section: {
    marginBottom: SPACING['2xl'],
  },
  sectionTitle: {
    marginBottom: SPACING.md,
  },
  rankingCard: {
    marginBottom: 0,
  },
  rankingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  rankingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flex: 1,
  },
  rankNumber: {
    width: 32,
    textAlign: 'center',
  },
});

