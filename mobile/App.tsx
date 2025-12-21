import React, { useEffect, useState } from 'react';
import { StatusBar, AppState, AppStateStatus, LogBox } from 'react-native';
import notifee, { EventType } from '@notifee/react-native';
import { AuthProvider } from './src/contexts/AuthContext';
import { AlertProvider } from './src/contexts/AlertContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { NotificationPermissionScreen } from './src/screens/Permission/NotificationPermissionScreen';
import 'react-native-gesture-handler';
import { syncPendingOperations } from './src/services/sync.service';
import { healthCheck } from './src/utils/api-wrapper';
import { API_BASE_URL, USE_MOCK_API } from './src/utils/constants';
import { logger } from './src/utils/logger';

// Suppress warnings (không ảnh hưởng chức năng)
if (__DEV__) {
  LogBox.ignoreLogs([
    'new NativeEventEmitter',
    'addListener',
    'removeListeners',
    'react-native-config',
    '[ENV] react-native-config not available',
    '[ENV] Using fallback',
  ]);
}

const App = () => {
  const [hasNotificationPermission, setHasNotificationPermission] = useState<boolean | null>(null);
  const [isCheckingPermission, setIsCheckingPermission] = useState(true);

  // Check notification permission on app start
  useEffect(() => {
    const checkPermission = async () => {
      try {
        const settings = await notifee.getNotificationSettings();
        const granted = settings.authorizationStatus >= 1; // 1 = AUTHORIZED, 2 = PROVISIONAL
        setHasNotificationPermission(granted);
      } catch (error) {
        console.error('Error checking notification permission:', error);
        setHasNotificationPermission(false);
      } finally {
        setIsCheckingPermission(false);
      }
    };

    checkPermission();

    // Re-check permission when app comes to foreground
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        checkPermission();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!hasNotificationPermission) {
      return; // Don't setup handlers if permission not granted
    }

    if (__DEV__) {
      console.log('[ENV] API_BASE_URL =', API_BASE_URL);
      console.log('[ENV] USE_MOCK_API =', USE_MOCK_API);
    }

    // Setup foreground notification handler
    // Note: Trigger notifications will display automatically even when app is open
    // This handler is for handling user interactions with notifications
    const unsubscribeForeground = notifee.onForegroundEvent(async ({ type, detail }) => {
      if (type === EventType.TRIGGER_NOTIFICATION_CREATED) {
        // Trigger notification was created - it will display automatically
        logger.log('NOTIF', 'Trigger notification created', detail.notification?.id);
      } else if (type === EventType.DELIVERED) {
        // Notification was delivered
        logger.log('NOTIF', 'Notification delivered', detail.notification?.id);
      } else if (type === EventType.PRESS) {
        // User pressed the notification
        // You can navigate to specific screen based on notification data
        logger.log('NAV', 'Notification pressed', detail.notification?.data);
      }
    });

    const runHealthCheck = async () => {
      const result = await healthCheck();
      if (result.ok) {
        logger.api('Initial healthcheck OK', { baseUrl: API_BASE_URL, data: result.data });
      } else {
        logger.error('Initial healthcheck FAILED', { baseUrl: API_BASE_URL, error: result.error, status: result.status });
      }
    };

    // Sync khi app mở
    syncPendingOperations();
    runHealthCheck();
    
    // Sync khi app trở lại foreground
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        logger.log('SYNC', 'App became active, syncing...');
        syncPendingOperations();
      }
    });
    
    return () => {
      unsubscribeForeground();
      subscription.remove();
    };
  }, [hasNotificationPermission]);

  const handlePermissionGranted = () => {
    setHasNotificationPermission(true);
  };

  // Show permission screen if permission not granted
  if (isCheckingPermission) {
    return null; // Or a loading screen
  }

  if (!hasNotificationPermission) {
    return (
      <ErrorBoundary>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <NotificationPermissionScreen onPermissionGranted={handlePermissionGranted} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <AuthProvider>
        <AlertProvider>
          <StatusBar barStyle="dark-content" backgroundColor="#fff" />
          <RootNavigator />
        </AlertProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
