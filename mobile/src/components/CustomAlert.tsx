import React from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, Animated } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme';
import { Text } from '../ui/Text';
import { Card } from '../ui/Card';

export type AlertType = 'success' | 'error' | 'warning' | 'info';

interface CustomAlertProps {
  visible: boolean;
  type: AlertType;
  title: string;
  message: string;
  onClose: () => void;
  buttons?: Array<{
    text: string;
    onPress: () => void;
    style?: 'default' | 'cancel' | 'destructive';
  }>;
}

const getAlertConfig = (type: AlertType) => {
  switch (type) {
    case 'success':
      return {
        icon: 'check-circle',
        iconColor: COLORS.success,
        backgroundColor: COLORS.success + '15',
      };
    case 'error':
      return {
        icon: 'error',
        iconColor: COLORS.error,
        backgroundColor: COLORS.error + '15',
      };
    case 'warning':
      return {
        icon: 'warning',
        iconColor: COLORS.warning,
        backgroundColor: COLORS.warning + '15',
      };
    case 'info':
      return {
        icon: 'info',
        iconColor: COLORS.info,
        backgroundColor: COLORS.info + '15',
      };
  }
};

export const CustomAlert: React.FC<CustomAlertProps> = ({
  visible,
  type,
  title,
  message,
  onClose,
  buttons,
}) => {
  const config = getAlertConfig(type);
  const scaleAnim = React.useRef(new Animated.Value(0)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  const handleButtonPress = (onPress: () => void) => {
    onPress();
    onClose();
  };

  const defaultButton = buttons && buttons.length > 0 
    ? buttons[0] 
    : { text: 'OK', onPress: onClose, style: 'default' as const };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: opacityAnim,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Card style={[styles.alertCard, SHADOWS.floating]}>
            {/* Icon */}
            <View style={[styles.iconContainer, { backgroundColor: config.backgroundColor }]}>
              <Icon name={config.icon} size={32} color={config.iconColor} />
            </View>

            {/* Title */}
            <Text variant="section" color="text" style={styles.title}>
              {title}
            </Text>

            {/* Message */}
            <Text variant="body" color="textSecondary" style={styles.message}>
              {message}
            </Text>

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              {buttons && buttons.length > 1 ? (
                <View style={styles.buttonsRow}>
                  {buttons.map((button, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.button,
                        styles.buttonHalf,
                        button.style === 'destructive' && styles.buttonDestructive,
                        button.style === 'cancel' && styles.buttonCancel,
                      ]}
                      onPress={() => handleButtonPress(button.onPress)}
                      activeOpacity={0.7}
                    >
                      <Text
                        variant="body"
                        color={button.style === 'destructive' ? 'error' : 'text'}
                        semibold
                      >
                        {button.text}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.buttonFull,
                    defaultButton.style === 'destructive' && styles.buttonDestructive,
                  ]}
                  onPress={() => handleButtonPress(defaultButton.onPress)}
                  activeOpacity={0.7}
                >
                  <Text
                    variant="body"
                    color={defaultButton.style === 'destructive' ? 'error' : defaultButton.style === 'cancel' ? 'text' : 'surface'}
                    semibold
                    style={defaultButton.style === 'default' && styles.buttonFullText}
                  >
                    {defaultButton.text}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </Card>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.overlay,
  },
  container: {
    width: '85%',
    maxWidth: 400,
  },
  alertCard: {
    padding: SPACING['2xl'],
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  message: {
    marginBottom: SPACING['2xl'],
    textAlign: 'center',
    lineHeight: 20,
  },
  buttonContainer: {
    width: '100%',
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  button: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  buttonFull: {
    width: '100%',
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  buttonFullText: {
    color: COLORS.surface,
  },
  buttonHalf: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
  },
  buttonDestructive: {
    backgroundColor: COLORS.error + '15',
    borderColor: COLORS.error,
  },
  buttonCancel: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
  },
});

