import React, { lazy, Suspense } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { TabsNavigator } from './TabsNavigator';
import { OnboardingNavigator } from './OnboardingNavigator';
import { ActivityIndicator, View, Text } from 'react-native';
import { logger } from '../utils/logger';

const Stack = createNativeStackNavigator();

// Fallback screen nếu AuthScreen không load được
const FallbackScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
    <Text style={{ fontSize: 16, textAlign: 'center', color: '#666' }}>
      Đang tải ứng dụng...
    </Text>
    <ActivityIndicator size="large" style={{ marginTop: 20 }} />
  </View>
);

// Lazy load AuthScreen với error boundary
let AuthScreenComponent: React.ComponentType<any> = FallbackScreen;
let ForgotPasswordScreenComponent: React.ComponentType<any> = FallbackScreen;

try {
  // Try to load AuthScreen - if it fails, use fallback
  const AuthScreenModule = require('../screens/Auth/AuthScreen');
  const LoadedAuthScreen = AuthScreenModule?.AuthScreen || AuthScreenModule?.default;
  if (LoadedAuthScreen && typeof LoadedAuthScreen === 'function') {
    AuthScreenComponent = LoadedAuthScreen;
  }
} catch (error) {
  logger.nav('Failed to load AuthScreen module (using fallback)', error);
  // AuthScreenComponent already set to FallbackScreen
}

try {
  // Try to load ForgotPasswordScreen
  const ForgotPasswordModule = require('../screens/Auth/ForgotPasswordScreen');
  const LoadedForgotPassword = ForgotPasswordModule?.ForgotPasswordScreen || ForgotPasswordModule?.default;
  if (LoadedForgotPassword && typeof LoadedForgotPassword === 'function') {
    ForgotPasswordScreenComponent = LoadedForgotPassword;
  }
} catch (error) {
  logger.nav('Failed to load ForgotPasswordScreen module (using fallback)', error);
}

export const RootNavigator = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator 
        screenOptions={{ 
          headerShown: false,
          animation: 'fade',
          animationDuration: 300,
        }}
      >
        {!user ? (
          // 1. Chưa đăng nhập -> Auth
          <>
            <Stack.Screen 
              name="Auth" 
              component={AuthScreenComponent}
              options={{ animation: 'fade' }}
            />
            <Stack.Screen 
              name="ForgotPassword" 
              component={ForgotPasswordScreenComponent}
              options={{ 
                headerShown: true, 
                title: 'Quên mật khẩu',
                animation: 'slide_from_right',
              }}
            />
          </>
        ) : !user.isOnboardingCompleted && user.role === 'PATIENT' ? (
          // 2. Đã đăng nhập nhưng chưa Onboarding (chỉ áp dụng cho PATIENT)
          <Stack.Screen 
            name="Onboarding" 
            component={OnboardingNavigator}
            options={{ animation: 'fade' }}
          />
        ) : (
          // 3. Đã Onboarding hoặc không phải PATIENT -> Trang chủ
          <Stack.Screen 
            name="Main" 
            component={TabsNavigator}
            options={{ animation: 'fade' }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};





