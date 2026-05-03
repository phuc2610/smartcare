import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
import { COLORS, SPACING } from '../theme/tokens';
import { SHADOWS } from '../theme/shadows';
import { SPRING } from '../theme/motion';
import { DashboardScreen } from '../screens/Dashboard/DashboardScreen';
import { AddMedicationScreen } from '../screens/Medication/AddMedicationScreen';
import { SavedPrescriptionsScreen } from '../screens/Medication/SavedPrescriptionsScreen';
import { HealthTrackingScreen } from '../screens/Health/HealthTrackingScreen';
import { ReportScreen } from '../screens/Report/ReportScreen';
import { CaregiverDashboardScreen } from '../screens/Caregiver/CaregiverDashboardScreen';
import { ProfileScreen } from '../screens/Profile/ProfileScreen';
import { ChatAIScreen } from '../screens/AI/ChatAIScreen';
import { WellnessScreen } from '../screens/Wellness/WellnessScreen';
import { SettingsScreen } from '../screens/Settings/SettingsScreen';
import { ChangePasswordScreen } from '../screens/Settings/ChangePasswordScreen';
import { CustomReminderScreen } from '../screens/Reminders/CustomReminderScreen';
import { AppointmentScreen } from '../screens/Appointments/AppointmentScreen';
import { AppHeader } from '../components/AppHeader';
import { PatientListScreen } from '../screens/CaregiverPlus/PatientListScreen';
import { PatientDetailScreen } from '../screens/CaregiverPlus/PatientDetailScreen';
import { PatientTasksScreen } from '../screens/CaregiverPlus/PatientTasksScreen';
import { MedicationDetailScreen } from '../screens/CaregiverPlus/MedicationDetailScreen';
import { MealDetailScreen } from '../screens/CaregiverPlus/MealDetailScreen';
import { AlertsCenterScreen } from '../screens/CaregiverPlus/AlertsCenterScreen';
import { DailyHealthScreen } from '../screens/CaregiverPlus/DailyHealthScreen';
import { ReportsAnalyticsScreen } from '../screens/CaregiverPlus/ReportsAnalyticsScreen';
import { CaregiverAppointmentsScreen } from '../screens/CaregiverPlus/CaregiverAppointmentsScreen';
import { SafetyLocationScreen } from '../screens/CaregiverPlus/SafetyLocationScreen';
import { CareNotesChatScreen } from '../screens/CaregiverPlus/CareNotesChatScreen';
import { CareOverviewStatsScreen } from '../screens/CaregiverPlus/CareOverviewStatsScreen';
import { ActivityHistoryScreen } from '../screens/CaregiverPlus/ActivityHistoryScreen';
import { EmergencyContactsScreen } from '../screens/CaregiverPlus/EmergencyContactsScreen';
import { CaregiverRequestsScreen } from '../screens/CaregiverRequests/CaregiverRequestsScreen';
import { NotificationsScreen } from '../screens/Notifications/NotificationsScreen';
import { ConversationListScreen } from '../screens/Chat/ConversationListScreen';
import { ChatDetailScreen } from '../screens/Chat/ChatDetailScreen';
import { PrescriptionViewScreen } from '../screens/Prescription/PrescriptionViewScreen';
import { PrescriptionEditScreen } from '../screens/Prescription/PrescriptionEditScreen';
import { DependentsScreen } from '../screens/Profile/DependentsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Animated Tab Icon Component
const AnimatedTabIcon = React.memo(({ name, size, color, focused }: { name: string; size: number; color: string; focused: boolean }) => {
  const scale = useSharedValue(focused ? 1.1 : 1);
  
  React.useEffect(() => {
    scale.value = withSpring(focused ? 1.1 : 1, SPRING.smooth);
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
      scale.value = withSpring(1.1, SPRING.bouncy);
      rotation.value = withSpring(90, SPRING.smooth);
    } else {
      scale.value = withSpring(1, SPRING.smooth);
      rotation.value = withSpring(0, SPRING.smooth);
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
      <Icon name="photo-camera" size={28} color="#fff" />
    </Animated.View>
  );
});

const DashboardStack = React.memo(() => {
  return (
    <Stack.Navigator
      screenOptions={{
        header: () => <AppHeader title="Lịch uống thuốc" variant="dashboard" />,
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
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarIconStyle: styles.tabBarIcon,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen
        name="Home"
        component={isCaregiver ? CaregiverDashboardScreen : DashboardStack}
        options={{
          tabBarLabel: 'Trang chủ',
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabIcon name="home" size={size || 24} color={color} focused={focused} />
          ),
        }}
      />
      {!isCaregiver && (
        <>
          <Tab.Screen
            name="Prescriptions"
            component={SavedPrescriptionsScreen}
            options={{
              tabBarLabel: 'Đơn thuốc',
              tabBarIcon: ({ color, size, focused }) => (
                <AnimatedTabIcon name="description" size={size || 24} color={color} focused={focused} />
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
          tabBarLabel: 'Cá nhân',
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabIcon name="person" size={size || 24} color={color} focused={focused} />
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
        name="ChatDetail" 
        component={ChatDetailScreen} 
        options={{ 
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="ConversationList" 
        component={ConversationListScreen} 
        options={{ 
          headerShown: false,
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
      <Stack.Screen 
        name="CustomReminder" 
        component={CustomReminderScreen} 
        options={{ 
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="Appointment" 
        component={AppointmentScreen} 
        options={{ 
          headerShown: false,
        }} 
      />
      {/* CaregiverPlus Screens */}
      <Stack.Screen 
        name="PatientList" 
        component={PatientListScreen} 
        options={{ 
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="PatientDetail" 
        component={PatientDetailScreen} 
        options={{ 
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="PatientTasks" 
        component={PatientTasksScreen} 
        options={{ 
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="MedicationDetail" 
        component={MedicationDetailScreen} 
        options={{ 
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="MealDetail" 
        component={MealDetailScreen} 
        options={{ 
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="AlertsCenter" 
        component={AlertsCenterScreen} 
        options={{ 
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="DailyHealth" 
        component={DailyHealthScreen} 
        options={{ 
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="ReportsAnalytics" 
        component={ReportsAnalyticsScreen} 
        options={{ 
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="CaregiverAppointments" 
        component={CaregiverAppointmentsScreen} 
        options={{ 
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="SafetyLocation" 
        component={SafetyLocationScreen} 
        options={{ 
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="CareNotes" 
        component={CareNotesChatScreen} 
        options={{ 
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="CareOverviewStats" 
        component={CareOverviewStatsScreen} 
        options={{ 
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="ActivityHistory" 
        component={ActivityHistoryScreen} 
        options={{ 
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="EmergencyContacts" 
        component={EmergencyContactsScreen} 
        options={{ 
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="CaregiverRequests" 
        component={CaregiverRequestsScreen} 
        options={{ 
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="Notifications" 
        component={NotificationsScreen} 
        options={{ 
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="PrescriptionView" 
        component={PrescriptionViewScreen} 
        options={{ 
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="PrescriptionEdit" 
        component={PrescriptionEditScreen} 
        options={{ 
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="Dependents" 
        component={DependentsScreen} 
        options={{ 
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="HealthTracking" 
        component={HealthTrackingScreen} 
        options={{ 
          headerShown: false,
        }} 
      />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    height: 64,
    paddingBottom: SPACING.sm,
    paddingTop: SPACING.sm,
    ...SHADOWS.tabBar,
  },
  tabBarLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: SPACING.xs,
  },
  tabBarIcon: {
    marginTop: SPACING.xs,
  },
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -28,
    borderWidth: 4,
    borderColor: COLORS.surface,
    ...SHADOWS.floating,
  },
  addButtonContainer: {
    top: -10,
  },
});






