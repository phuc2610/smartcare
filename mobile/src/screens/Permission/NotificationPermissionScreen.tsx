import React, { useState } from 'react';
import { View, StyleSheet, Linking, Platform, Alert } from 'react-native';
import { Screen } from '../../ui/Screen';
import { Text } from '../../ui/Text';
import { Button } from '../../ui/Button';
import { Logo } from '../../components/Logo';
import { requestNotificationPermission } from '../../services/notification.service';
import { requestNotificationPermission as requestAndroidPermission } from '../../utils/permissions';
import notifee from '@notifee/react-native';

interface NotificationPermissionScreenProps {
  onPermissionGranted: () => void;
}

export const NotificationPermissionScreen: React.FC<NotificationPermissionScreenProps> = ({
  onPermissionGranted,
}) => {
  const [isRequesting, setIsRequesting] = useState(false);

  const checkPermission = async (): Promise<boolean> => {
    try {
      const settings = await notifee.getNotificationSettings();
      return settings.authorizationStatus >= 1; // 1 = AUTHORIZED, 2 = PROVISIONAL
    } catch (error) {
      console.error('Error checking notification permission:', error);
      return false;
    }
  };

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    try {
      // Request Notifee permission (works for both iOS and Android)
      const notifeeGranted = await requestNotificationPermission();
      
      // For Android 13+, also request system permission
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        await requestAndroidPermission();
      }

      // Check if permission was granted
      const hasPermission = await checkPermission();
      
      if (hasPermission) {
        onPermissionGranted();
      } else {
        Alert.alert(
          'Cần quyền thông báo',
          'Ứng dụng cần quyền thông báo để nhắc nhở bạn về thuốc và các nhiệm vụ sức khỏe. Vui lòng bật quyền thông báo trong cài đặt.',
          [
            { text: 'Hủy', style: 'cancel' },
            {
              text: 'Mở cài đặt',
              onPress: () => {
                if (Platform.OS === 'android') {
                  Linking.openSettings();
                } else {
                  Linking.openURL('app-settings:');
                }
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      Alert.alert(
        'Lỗi',
        'Không thể yêu cầu quyền thông báo. Vui lòng thử lại.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <Screen style={styles.container}>
      <View style={styles.content}>
        <Logo size="large" showText={false} />
        
        <View style={styles.textContainer}>
          <Text variant="h2" style={styles.title}>
            Cần quyền thông báo
          </Text>
          
          <Text variant="body" style={styles.description}>
            SmartCare cần quyền thông báo để:
          </Text>
          
          <View style={styles.featuresList}>
            <Text variant="body" style={styles.feature}>
              • Nhắc nhở bạn uống thuốc đúng giờ
            </Text>
            <Text variant="body" style={styles.feature}>
              • Thông báo về các nhiệm vụ sức khỏe
            </Text>
            <Text variant="body" style={styles.feature}>
              • Cảnh báo khi bạn trễ hẹn
            </Text>
            <Text variant="body" style={styles.feature}>
              • Thông báo từ người thân
            </Text>
          </View>
          
          <Text variant="body" style={styles.note}>
            Ứng dụng chỉ hoạt động khi bạn cấp quyền thông báo.
          </Text>
        </View>
        
        <Button
          label="Cho phép thông báo"
          onPress={handleRequestPermission}
          loading={isRequesting}
          style={styles.button}
        />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  textContainer: {
    width: '100%',
    marginTop: 32,
    marginBottom: 40,
  },
  title: {
    textAlign: 'center',
    marginBottom: 16,
    color: '#1f2937',
  },
  description: {
    textAlign: 'center',
    marginBottom: 24,
    color: '#6b7280',
  },
  featuresList: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  feature: {
    marginBottom: 12,
    color: '#374151',
    lineHeight: 24,
  },
  note: {
    textAlign: 'center',
    color: '#ef4444',
    fontWeight: '600',
    marginTop: 8,
  },
  button: {
    width: '100%',
    marginTop: 16,
  },
});

