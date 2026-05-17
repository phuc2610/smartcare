import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING, RADIUS } from '../theme';
import { SHADOWS } from '../theme/shadows';

interface QuickActionSheetProps {
  visible: boolean;
  onClose: () => void;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface ActionItem {
  icon: string;
  emoji?: string;
  label: string;
  sublabel: string;
  route: string;
  color: string;
  bgColor: string;
}

const ACTIONS: ActionItem[] = [
  {
    icon: 'monitor-heart',
    label: 'Theo dõi sức khỏe',
    sublabel: 'Bữa ăn, vận động',
    route: 'HealthTracking',
    color: '#059669',
    bgColor: '#d1fae5',
  },
  {
    icon: 'favorite',
    label: 'Đo nhịp tim',
    sublabel: 'Dùng camera + flash',
    route: 'HeartRate',
    color: '#ef4444',
    bgColor: '#fee2e2',
  },
  {
    icon: 'self-improvement',
    label: 'Wellness',
    sublabel: 'Thư giãn, thiền định',
    route: 'Wellness',
    color: '#8b5cf6',
    bgColor: '#ede9fe',
  },
  {
    icon: 'document-scanner',
    label: 'Quét đơn thuốc',
    sublabel: 'Chụp ảnh toa thuốc',
    route: 'Add',
    color: '#f59e0b',
    bgColor: '#fef3c7',
  },
  {
    icon: 'medication',
    label: 'Thêm thuốc thủ công',
    sublabel: 'Nhập thông tin thuốc',
    route: 'MedicationManage',
    color: '#3b82f6',
    bgColor: '#dbeafe',
  },
  {
    icon: 'smart-toy',
    label: 'Chat với AI',
    sublabel: 'Hỏi trợ lý sức khỏe',
    route: 'Chat',
    color: '#06b6d4',
    bgColor: '#cffafe',
  },
];

export const QuickActionSheet: React.FC<QuickActionSheetProps> = ({ visible, onClose }) => {
  const navigation = useNavigation<any>();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 20,
          stiffness: 200,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleAction = (route: string) => {
    onClose();
    // Delay để animation đóng xong
    setTimeout(() => {
      navigation.navigate(route);
    }, 200);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: backdropAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.5],
              }),
            },
          ]}
        />
      </TouchableWithoutFeedback>

      {/* Bottom Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Handle bar */}
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Thêm nhanh</Text>
            <Text style={styles.headerSub}>Chọn tính năng bạn muốn thực hiện</Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Icon name="close" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Action Grid — 2 cột */}
        <View style={styles.grid}>
          {ACTIONS.map((action, index) => (
            <TouchableOpacity
              key={action.route + index}
              style={styles.actionCell}
              onPress={() => handleAction(action.route)}
              activeOpacity={0.75}
            >
              <View style={[styles.iconCircle, { backgroundColor: action.bgColor }]}>
                <Icon name={action.icon} size={26} color={action.color} />
              </View>
              <Text style={styles.actionLabel} numberOfLines={1}>
                {action.label}
              </Text>
              <Text style={styles.actionSub} numberOfLines={1}>
                {action.sublabel}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Bottom safe area */}
        <View style={{ height: Platform.OS === 'ios' ? 34 : 16 }} />
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 20,
    ...SHADOWS.floating,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e2e8f0',
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // 2-column grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCell: {
    width: '47%',
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    alignItems: 'flex-start',
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  actionSub: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
});
