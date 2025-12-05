import React, { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { AddMedication } from './components/AddMedication';
import { HealthTracking } from './components/HealthTracking'; 
import { ReportScreen } from './components/ReportScreen';
import { LinkAccountScreen } from './components/LinkAccountScreen'; 
import { CaregiverDashboard } from './components/CaregiverDashboard';
import { ProfileScreen } from './components/ProfileScreen';
import { ChatScreen } from './components/ChatScreen'; 
import { MapScreen } from './components/MapScreen'; 
import { WellnessScreen } from './components/WellnessScreen'; // New Import
import { AuthScreens } from './components/AuthScreens';
import { FallAlertModal } from './components/FallAlertModal';
import { useFallDetection } from './hooks/useFallDetection';

import { initializeMockData, getTodayReminders } from './services/databaseService';
import { registerForPushNotificationsAsync, handleSnooze } from './services/notificationService';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Bell } from 'lucide-react';
import { UserRole } from './types';

// Wrapper component to handle Conditional Rendering based on Auth State
const AppContent = () => {
  const { user, signOut, isLoading } = useAuth();
  
  // Page State
  const [page, setPage] = useState<'dashboard' | 'add' | 'tracking' | 'report' | 'link' | 'profile' | 'chat' | 'map' | 'wellness'>('dashboard');
  
  const [activeNotification, setActiveNotification] = useState<{title: string, body: string, data: any} | null>(null);

  // --- FALL DETECTION HOOK ---
  const { fallDetected, resetState, simulateFall, startMonitoring, stopMonitoring, isMonitoring } = useFallDetection();

  // Auto-start monitoring for patients
  useEffect(() => {
    if (user && user.role === UserRole.PATIENT) {
        startMonitoring();
    } else {
        stopMonitoring();
    }
    return () => stopMonitoring();
  }, [user]);

  useEffect(() => {
    if (user) {
      initializeMockData();
      registerForPushNotificationsAsync();

      const handleForeground = (e: any) => {
        const { title, body, data } = e.detail;
        setActiveNotification({ title, body, data });
      };

      const handleResponse = (e: any) => {
        const { reminderId } = e.detail;
        console.log('User tapped notification for ID:', reminderId);
        setPage('dashboard');
      };

      window.addEventListener('expo-notification-received-foreground', handleForeground);
      window.addEventListener('expo-notification-response', handleResponse);

      return () => {
        window.removeEventListener('expo-notification-received-foreground', handleForeground);
        window.removeEventListener('expo-notification-response', handleResponse);
      };
    }
  }, [user]);

  const handleToastAction = (action: 'TAKE' | 'SNOOZE') => {
    if (!activeNotification || !user) return;
    const reminders = getTodayReminders(user._id); 
    
    if (action === 'TAKE') {
       setPage('dashboard'); 
    } else {
       const dummyReminder = reminders[0];
       if (dummyReminder) handleSnooze(dummyReminder);
    }
    setActiveNotification(null);
  };

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><div className="w-8 h-8 border-4 border-primary-500 rounded-full animate-spin border-t-transparent"></div></div>;
  }

  // --- LOGIC: If no user, show Auth Screens ---
  if (!user) {
    return <AuthScreens />;
  }

  const isCaregiver = user.role === UserRole.CAREGIVER;

  // --- ROUTING LOGIC ---
  const renderContent = () => {
    if (page === 'dashboard') {
        return isCaregiver ? <CaregiverDashboard onNavigate={setPage} /> : <Dashboard />;
    }
    if (page === 'add') {
        return <AddMedication onComplete={() => setPage('dashboard')} />;
    }
    if (page === 'tracking') {
        return <HealthTracking onComplete={() => setPage('report')} />;
    }
    if (page === 'report') {
        return <ReportScreen />;
    }
    if (page === 'link') {
        return <LinkAccountScreen onNavigate={setPage} />;
    }
    if (page === 'profile') {
        return (
            <ProfileScreen 
                // Pass detection props to Profile for manual control/testing
                isMonitoring={isMonitoring} 
                onToggleMonitor={() => isMonitoring ? stopMonitoring() : startMonitoring()}
                onSimulateFall={simulateFall}
            />
        );
    }
    if (page === 'chat') {
        return <ChatScreen />;
    }
    if (page === 'map') {
        return <MapScreen />;
    }
    if (page === 'wellness') {
        return <WellnessScreen />;
    }
    return <Dashboard />;
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 relative">
      <Header currentPage={page} onNavigate={setPage} />
      
      <main className="max-w-3xl mx-auto px-4 py-8">
        {renderContent()}
      </main>

      {/* FALL ALERT OVERLAY */}
      <FallAlertModal 
        visible={fallDetected} 
        onDismiss={resetState}
        onTriggerSOS={() => {
            // SOS triggered via modal, state stays 'SENT' inside modal until dismissed
        }}
      />

      {/* In-App Notification Toast */}
      {activeNotification && (
        <div className="fixed top-4 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 z-[100] animate-bounce-in">
          <div className="flex items-start gap-3">
            <div className="bg-primary-100 p-2 rounded-full">
              <Bell className="w-6 h-6 text-primary-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-gray-900">{activeNotification.title}</h4>
              <p className="text-sm text-gray-600 mb-3">{activeNotification.body}</p>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => handleToastAction('TAKE')}
                  className="flex-1 bg-primary-600 text-white py-2 rounded-lg text-sm font-bold shadow-sm active:scale-95"
                >
                  Xác nhận uống
                </button>
                <button 
                  onClick={() => handleToastAction('SNOOZE')}
                  className="flex-1 bg-gray-100 text-gray-600 py-2 rounded-lg text-sm font-bold active:scale-95"
                >
                  Để sau (10s)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;