import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { ANIMATION_CONFIG } from '../utils/animations';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
import { COLORS } from '../utils/constants';
import { DashboardScreen } from '../screens/Dashboard/DashboardScreen';
import { AddMedicationScreen } from '../screens/Medication/AddMedicationScreen';
import { HealthTrackingScreen } from '../screens/Health/HealthTrackingScreen';
import { ReportScreen } from '../screens/Report/ReportScreen';
import { CaregiverDashboardScreen } from '../screens/Caregiver/CaregiverDashboardScreen';
import { ProfileScreen } from '../screens/Profile/ProfileScreen';
import { ChatAIScreen } from '../screens/AI/ChatAIScreen';
import { WellnessScreen } from '../screens/Wellness/WellnessScreen';
import { SettingsScreen } from '../screens/Settings/SettingsScreen';
import { ChangePasswordScreen } from '../screens/Settings/ChangePasswordScreen';
import { AppHeader } from '../components/AppHeader';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Animated Tab Icon Component
const AnimatedTabIcon = React.memo(({ name, size, color, focused }: { name: string; size: number; color: string; focused: boolean }) => {
  const scale = useSharedValue(focused ? 1.1 : 1);
  
  React.useEffect(() => {
    scale.value = withSpring(focused ? 1.1 : 1, ANIMATION_CONFIG.smoothSpring);
  }, [focused]);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  
  return (
    <Animated.View style={animatedStyle}>
      <Icon name={name} size={size} color={color} />
    </Animated.View>
  );
});

// Animated Add Button
const AnimatedAddButton = React.memo(({ focused }: { focused: boolean }) => {
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  
  React.useEffect(() => {
    if (focused) {
      scale.value = withSpring(1.1, ANIMATION_CONFIG.spring);
      rotation.value = withSpring(90, ANIMATION_CONFIG.smoothSpring);
    } else {
      scale.value = withSpring(1, ANIMATION_CONFIG.smoothSpring);
      rotation.value = withSpring(0, ANIMATION_CONFIG.smoothSpring);
    }
  }, [focused]);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));
  
  return (
    <Animated.View style={[styles.addButton, animatedStyle]}>
      <Icon name="add" size={32} color="#fff" />
    </Animated.View>
  );
});

const DashboardStack = React.memo(() => {
  return (
    <Stack.Navigator
      screenOptions={{
        header: () => <AppHeader title="Lịch uống thuốc" />,
      }}
    >
      <Stack.Screen
        name="DashboardMain"
        component={DashboardScreen}
        options={{ headerShown: true }}
      />
    </Stack.Navigator>
  );
});

const MainTabs = () => {
  const { user } = useAuth();
  const isCaregiver = user?.role === UserRole.CAREGIVER;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarIconStyle: styles.tabBarIcon,
      }}
    >
      <Tab.Screen
        name="Home"
        component={isCaregiver ? CaregiverDashboardScreen : DashboardStack}
        options={{
          tabBarLabel: 'Trang chủ',
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabIcon name="list" size={size || 24} color={color} focused={focused} />
          ),
        }}
      />
      {!isCaregiver && (
        <>
          <Tab.Screen
            name="Tracking"
            component={HealthTrackingScreen}
            options={{
              tabBarLabel: 'Theo dõi',
              tabBarIcon: ({ color, size, focused }) => (
                <AnimatedTabIcon name="favorite" size={size || 24} color={color} focused={focused} />
              ),
            }}
          />
          <Tab.Screen
            name="Add"
            component={AddMedicationScreen}
            options={{
              tabBarLabel: '',
              tabBarIcon: ({ focused }: { focused: boolean }) => (
                <AnimatedAddButton focused={focused} />
              ),
              tabBarButton: (props) => (
                <TouchableOpacity
                  {...props}
                  style={[props.style, styles.addButtonContainer]}
                  activeOpacity={0.8}
                />
              ),
            }}
          />
          <Tab.Screen
            name="Report"
            component={ReportScreen}
            options={{
              tabBarLabel: 'Báo cáo',
              tabBarIcon: ({ color, size, focused }) => (
                <AnimatedTabIcon name="bar-chart" size={size || 24} color={color} focused={focused} />
              ),
            }}
          />
        </>
      )}
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Hồ sơ',
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabIcon name="account-circle" size={size || 24} color={color} focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export const TabsNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        animation: 'slide_from_right',
        animationDuration: 300,
        header: ({ route, navigation: nav }) => {
          const titles: Record<string, string> = {
            Chat: 'Trợ lý AI',
            Wellness: 'Góc thư giãn',
          };
          return (
            <AppHeader 
              title={titles[route.name] || route.name} 
              showBack 
              onBack={() => {
                if (nav.canGoBack()) {
                  nav.goBack();
                }
              }} 
            />
          );
        },
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen 
        name="Chat" 
        component={ChatAIScreen} 
        options={{ 
          headerShown: true,
        }} 
      />
      <Stack.Screen 
        name="Wellness" 
        component={WellnessScreen} 
        options={{ 
          headerShown: true,
        }} 
      />
      <Stack.Screen 
        name="Settings" 
        component={SettingsScreen} 
        options={{ 
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="ChangePassword" 
        component={ChangePasswordScreen} 
        options={{ 
          headerShown: false,
        }} 
      />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    height: 60,
    paddingBottom: 8,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  tabBarLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
  tabBarIcon: {
    marginTop: 4,
  },
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -28,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  addButtonContainer: {
    top: -10,
  },
});





