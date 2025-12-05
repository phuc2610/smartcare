import React, { useEffect } from 'react';
import { StatusBar, AppState, AppStateStatus } from 'react-native';
import { AuthProvider } from './src/contexts/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import 'react-native-gesture-handler';
import { syncPendingOperations } from './src/services/sync.service';
import * as logger from './src/utils/logger';

const App = () => {
  useEffect(() => {
    // Sync khi app mở
    syncPendingOperations();
    
    // Sync khi app trở lại foreground
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        logger.logger.log('SYNC', 'App became active, syncing...');
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

