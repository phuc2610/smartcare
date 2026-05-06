/**
 * CustomAlert — SmartCare Design System
 *
 * Phong cách:
 *  - Card trắng, bo 4 góc mềm (RADIUS.xl = 24)
 *  - Accent bar màu theo type ở top
 *  - Icon nhỏ inline với title (không chiếm nhiều không gian)
 *  - Spring animation từ slightly-below + fade
 *  - Nút primary solid teal / nút cancel ghost border
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export type AlertType = 'success' | 'error' | 'warning' | 'info';

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface CustomAlertProps {
  visible: boolean;
  type: AlertType;
  title: string;
  message: string;
  onClose: () => void;
  buttons?: AlertButton[];
}

// ── Config theo type ──
const TYPE_CONFIG: Record<AlertType, {
  icon: string;
  accentColor: string;
  iconBg: string;
}> = {
  success: {
    icon: 'check-circle',
    accentColor: COLORS.success,
    iconBg: COLORS.success + '20',
  },
  error: {
    icon: 'error-outline',
    accentColor: COLORS.error,
    iconBg: COLORS.error + '18',
  },
  warning: {
    icon: 'warning-amber',
    accentColor: COLORS.warning,
    iconBg: COLORS.warning + '18',
  },
  info: {
    icon: 'info-outline',
    accentColor: COLORS.primary,
    iconBg: COLORS.primary + '18',
  },
};

export const CustomAlert: React.FC<CustomAlertProps> = ({
  visible,
  type,
  title,
  message,
  onClose,
  buttons,
}) => {
  const config = TYPE_CONFIG[type];

  // Animations
  const translateY = React.useRef(new Animated.Value(40)).current;
  const opacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 9,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 20,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  // Reset values khi ẩn xong
  React.useEffect(() => {
    if (!visible) {
      const t = setTimeout(() => {
        translateY.setValue(40);
        opacity.setValue(0);
      }, 200);
      return () => clearTimeout(t);
    }
  }, [visible]);

  const handlePress = (btn: AlertButton) => {
    if (btn.onPress) btn.onPress();
    onClose();
  };

  // Resolve buttons
  const resolvedButtons: AlertButton[] =
    buttons && buttons.length > 0
      ? buttons
      : [{ text: 'OK', onPress: onClose, style: 'default' }];

  const primaryBtn = resolvedButtons.find(
    (b) => b.style === 'default' || b.style === 'destructive' || !b.style
  ) || resolvedButtons[resolvedButtons.length - 1];

  const cancelBtn = resolvedButtons.find((b) => b.style === 'cancel');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, { opacity }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
      </Animated.View>

      {/* Card */}
      <View style={styles.centered} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.card,
            { transform: [{ translateY }], opacity },
          ]}
        >
          {/* ── Accent bar ── */}
          <View style={[styles.accentBar, { backgroundColor: config.accentColor }]} />

          {/* ── Body ── */}
          <View style={styles.body}>
            {/* Title row: icon + text inline */}
            <View style={styles.titleRow}>
              <View style={[styles.iconWrap, { backgroundColor: config.iconBg }]}>
                <Icon name={config.icon} size={20} color={config.accentColor} />
              </View>
              <Text style={styles.title} numberOfLines={2}>
                {title}
              </Text>
            </View>

            {/* Message */}
            {!!message && (
              <Text style={styles.message}>{message}</Text>
            )}

            {/* ── Buttons ── */}
            <View style={styles.buttonsContainer}>
              {/* Cancel button (ghost) — hiện nếu có */}
              {cancelBtn && (
                <TouchableOpacity
                  style={styles.btnCancel}
                  onPress={() => handlePress(cancelBtn)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.btnCancelText}>{cancelBtn.text}</Text>
                </TouchableOpacity>
              )}

              {/* Primary / Destructive button */}
              <TouchableOpacity
                style={[
                  styles.btnPrimary,
                  primaryBtn.style === 'destructive'
                    ? styles.btnDestructive
                    : { backgroundColor: config.accentColor },
                  cancelBtn ? styles.btnHalf : styles.btnFull,
                ]}
                onPress={() => handlePress(primaryBtn)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.btnPrimaryText,
                    primaryBtn.style === 'destructive' && styles.btnDestructiveText,
                  ]}
                >
                  {primaryBtn.text}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  // Backdrop
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },

  // Centering wrapper
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING['2xl'],
  },

  // Card
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,          // 24 — mềm mại
    overflow: 'hidden',
    ...(SHADOWS.floating as object),
  },

  // Accent bar top (6px height)
  accentBar: {
    height: 6,
    width: '100%',
  },

  // Body padding
  body: {
    paddingHorizontal: SPACING['2xl'],
    paddingTop: SPACING.xl,
    paddingBottom: SPACING['2xl'],
  },

  // Title row
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },

  // Icon nhỏ inline
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,       // 8 — vuông vắn nhẹ
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },

  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    lineHeight: 22,
    letterSpacing: -0.2,
  },

  message: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.xl,
    marginLeft: 36 + SPACING.md,   // align với title (qua icon)
  },

  // Buttons container
  buttonsContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },

  // Cancel (ghost border)
  btnCancel: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  btnCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },

  // Primary (solid color)
  btnPrimary: {
    paddingVertical: 13,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnFull: {
    flex: 1,
  },
  btnHalf: {
    flex: 1,
  },
  btnPrimaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.1,
  },

  // Destructive variant
  btnDestructive: {
    backgroundColor: COLORS.error + '15',
    borderWidth: 1.5,
    borderColor: COLORS.error,
  },
  btnDestructiveText: {
    color: COLORS.error,
  },
});
