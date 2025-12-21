/**
 * EmergencyContactsScreen
 * Liên lạc khẩn cấp với contacts list, call buttons, SOS summary settings
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen } from '../../ui/Screen';
import { AppHeader } from '../../components/AppHeader';
import { Text } from '../../ui/Text';
import { Card } from '../../ui/Card';
import { Loading } from '../../ui/Loading';
import { EmptyState } from '../../ui/EmptyState';
import { COLORS, SPACING } from '../../theme';
import { getEmergencyContacts } from '../../services/caregiverPlus.service';
import { EmergencyContact } from '../../types';
import { logger } from '../../utils/logger';

const AnimatedCard = Animated.createAnimatedComponent(Card);

export const EmergencyContactsScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const patientId = route.params?.patientId;

  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);

  useEffect(() => {
    if (patientId) {
      fetchContacts();
    }
  }, [patientId]);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const data = await getEmergencyContacts(patientId);
      setContacts(data.contacts);
    } catch (err: any) {
      logger.error('Fetch contacts error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  if (loading) {
    return (
      <Screen>
        <AppHeader title="Liên lạc khẩn cấp" showBack onBack={() => navigation.goBack()} />
        <Loading message="Đang tải danh bạ..." />
      </Screen>
    );
  }

  return (
    <Screen scrollable>
      <AppHeader title="Liên lạc khẩn cấp" showBack onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {contacts.length === 0 ? (
          <EmptyState
            icon="📞"
            title="Chưa có liên hệ"
            message="Chưa có số liên lạc khẩn cấp nào được thiết lập"
          />
        ) : (
          <View style={styles.contactsList}>
            {contacts.map((contact, index) => (
              <AnimatedCard
                key={contact._id}
                entering={FadeInDown.delay(50 + index * 30)}
                style={styles.contactCard}
              >
                <View style={styles.contactHeader}>
                  <View style={styles.contactInfo}>
                    <View style={styles.contactNameRow}>
                      <Text variant="body" color="text" semibold>
                        {contact.name}
                      </Text>
                      {contact.isPrimary && (
                        <View style={styles.primaryBadge}>
                          <Text variant="caption" color="text" style={styles.primaryText}>
                            Chính
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text variant="bodySmall" color="textSecondary">
                      {contact.relationship}
                    </Text>
                    <Text variant="body" color="primary" semibold style={styles.phoneNumber}>
                      {contact.phone}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.callButton}
                    onPress={() => handleCall(contact.phone)}
                  >
                    <Icon name="phone" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
              </AnimatedCard>
            ))}
          </View>
        )}

        {/* SOS Summary */}
        <Card style={styles.sosCard}>
          <Text variant="section" color="text" semibold style={styles.sosTitle}>
            Cài đặt SOS
          </Text>
          <Text variant="bodySmall" color="textSecondary" style={styles.sosDescription}>
            Khi bệnh nhân nhấn nút SOS, hệ thống sẽ tự động gửi vị trí đến các số liên lạc khẩn cấp
          </Text>
          <Text variant="caption" color="textSecondary" style={styles.sosStatus}>
            Trạng thái: Đã kích hoạt
          </Text>
        </Card>
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
  contactsList: {
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  contactCard: {
    marginBottom: 0,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contactInfo: {
    flex: 1,
    gap: SPACING.xs / 2,
  },
  contactNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  primaryBadge: {
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },
  primaryText: {
    color: COLORS.primary,
    fontSize: 10,
  },
  phoneNumber: {
    marginTop: SPACING.xs / 2,
  },
  callButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.md,
  },
  sosCard: {
    marginTop: SPACING.lg,
    marginBottom: 0,
  },
  sosTitle: {
    marginBottom: SPACING.sm,
  },
  sosDescription: {
    marginBottom: SPACING.sm,
    lineHeight: 20,
  },
  sosStatus: {
    marginTop: SPACING.xs,
  },
});

