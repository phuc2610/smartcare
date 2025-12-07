import React, { useEffect } from 'react';
import { StatusBar, AppState, AppStateStatus, LogBox } from 'react-native';
import { AuthProvider } from './src/contexts/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ErrorBoundary } from './src/components/ErrorBoundary';
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
  useEffect(() => {
    if (__DEV__) {
      console.log('[ENV] API_BASE_URL =', API_BASE_URL);
      console.log('[ENV] USE_MOCK_API =', USE_MOCK_API);
    }

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
      subscription.remove();
    };
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <RootNavigator />
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;

