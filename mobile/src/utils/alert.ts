import { AlertType } from '../components/CustomAlert';

// This will be set by AlertProvider
let alertContext: {
  showAlert: (type: AlertType, title: string, message: string, buttons?: Array<{
    text: string;
    onPress?: () => void;
    style?: 'default' | 'cancel' | 'destructive';
  }>) => void;
} | null = null;

export const setAlertContext = (context: typeof alertContext) => {
  alertContext = context;
};

export const showAlert = (
  type: AlertType,
  title: string,
  message: string,
  buttons?: Array<{
    text: string;
    onPress?: () => void;
    style?: 'default' | 'cancel' | 'destructive';
  }>
) => {
  if (alertContext) {
    alertContext.showAlert(type, title, message, buttons);
  } else {
    // Fallback to native Alert if context not available
    const { Alert } = require('react-native');
    Alert.alert(title, message, buttons);
  }
};

// Convenience functions
export const showSuccess = (title: string, message: string, onPress?: () => void) => {
  showAlert('success', title, message, [
    { text: 'OK', onPress: onPress || (() => {}) },
  ]);
};

export const showError = (title: string, message: string, onPress?: () => void) => {
  showAlert('error', title, message, [
    { text: 'OK', onPress: onPress || (() => {}) },
  ]);
};

export const showWarning = (title: string, message: string, onPress?: () => void) => {
  showAlert('warning', title, message, [
    { text: 'OK', onPress: onPress || (() => {}) },
  ]);
};

export const showInfo = (title: string, message: string, onPress?: () => void) => {
  showAlert('info', title, message, [
    { text: 'OK', onPress: onPress || (() => {}) },
  ]);
};

export const showConfirm = (
  title: string,
  message: string,
  onConfirm: () => void,
  onCancel?: () => void
) => {
  showAlert('warning', title, message, [
    { text: 'Hủy', onPress: onCancel || (() => {}), style: 'cancel' },
    { text: 'Xóa', onPress: onConfirm, style: 'destructive' },
  ]);
};

