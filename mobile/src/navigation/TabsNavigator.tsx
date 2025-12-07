import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
import { COLORS } from '../utils/constants';
import { DashboardScreen } from '../screens/Dashboard/DashboardScreen';
import { AddMedicationScreen } from '../screens/Medication/AddMedicationScreen';
import { HealthTrackingScreen } from '../screens/Health/HealthTrackingScreen';
import { ReportScreen } from '../screens/Report/ReportScreen';
import { LinkAccountScreen } from '../screens/Caregiver/LinkAccountScreen';
import { CaregiverDashboardScreen } from '../screens/Caregiver/CaregiverDashboardScreen';
import { ProfileScreen } from '../screens/Profile/ProfileScreen';
import { ChatAIScreen } from '../screens/AI/ChatAIScreen';
import { WellnessScreen } from '../screens/Wellness/WellnessScreen';
import { AppHeader } from '../components/AppHeader';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

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
          tabBarIcon: ({ color, size }) => (
            <Icon name="list" size={size || 24} color={color} />
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
              tabBarIcon: ({ color, size }) => (
                <Icon name="favorite" size={size || 24} color={color} />
              ),
            }}
          />
          <Tab.Screen
            name="Add"
            component={AddMedicationScreen}
            options={{
              tabBarLabel: '',
              tabBarIcon: () => (
                <View style={styles.addButton}>
                  <Icon name="add" size={32} color="#fff" />
                </View>
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
              tabBarIcon: ({ color, size }) => (
                <Icon name="bar-chart" size={size || 24} color={color} />
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
          tabBarIcon: ({ color, size }) => (
            <Icon name="account-circle" size={size || 24} color={color} />
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
        header: ({ route, navigation: nav }) => {
          const titles: Record<string, string> = {
            Link: 'Liên kết',
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
        name="Link" 
        component={LinkAccountScreen} 
        options={{ 
          headerShown: true,
        }} 
      />
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





