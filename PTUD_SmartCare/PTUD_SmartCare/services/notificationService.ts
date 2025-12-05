/**
 * SERVICE: Notification System
 * DESCRIPTION: Handles scheduling, permissions, and interaction logic.
 * NOTE: This uses a "Web Polyfill" approach to mimic `expo-notifications` behavior
 * in the browser environment.
 */

import { Reminder } from "../types";

// In a real Expo app, we would import:
// import * as Notifications from 'expo-notifications';
// import { Platform } from 'react-native';

export interface NotificationContent {
  title: string;
  body: string;
  data: any;
}

// 1. SETUP CONFIGURATION
// Expo: Notifications.setNotificationHandler(...)
export const setupNotificationHandler = () => {
  console.log('[System] Notification Handler Configured');
  // In Expo, this controls if alerts show when app is in foreground
};

// 2. PERMISSIONS
export const registerForPushNotificationsAsync = async () => {
  if (!('Notification' in window)) {
    console.log("This browser does not support desktop notification");
    return;
  }

  let permission = Notification.permission;
  if (permission !== 'granted') {
    permission = await Notification.requestPermission();
  }
  
  return permission;
};

// 3. SCHEDULING
/**
 * Schedules a local notification.
 * @param title Notification Title
 * @param body Notification Body
 * @param secondsFromNow Seconds until trigger (simulating scheduled time)
 * @param data Extra data (reminderId) for handling tap action
 */
export const scheduleMedicationReminder = async (
  title: string, 
  body: string, 
  secondsFromNow: number, 
  data: { reminderId: string }
) => {
  console.log(`[Schedule] Notification set for ${secondsFromNow}s from now: ${title}`);

  // WEB SIMULATION of Expo Scheduling
  setTimeout(() => {
    // Check if permission granted
    if (Notification.permission === 'granted') {
      const notif = new Notification(title, {
        body: body,
        icon: 'https://cdn-icons-png.flaticon.com/512/883/883407.png', // Medical Icon
        tag: data.reminderId, // Acts as ID
        requireInteraction: true // Keeps it on screen
      });
      
      notif.onclick = () => {
        window.focus();
        // Dispatch custom event to simulate 'onNotificationResponseReceived'
        const event = new CustomEvent('expo-notification-response', { detail: data });
        window.dispatchEvent(event);
        notif.close();
      };
    } else {
      // Fallback for demo if permissions denied
      console.log(`[Background Trigger] ${title} - ${body}`);
      // Dispatch event anyway for demo purposes in browser
      const event = new CustomEvent('expo-notification-received-foreground', { 
        detail: { title, body, data } 
      });
      window.dispatchEvent(event);
    }
  }, secondsFromNow * 1000);
};

// 4. ACTION HANDLERS (Snooze vs Confirm)

/**
 * Handles the "Snooze" action.
 * Logic: Reschedule notification for 10 minutes (600s) later.
 */
export const handleSnooze = (reminder: Reminder) => {
  console.log('[Action] Snoozing reminder:', reminder._id);
  scheduleMedicationReminder(
    "Nhắc lại thuốc 💤",
    `Đừng quên uống thuốc ${reminder.medicationName} nhé!`,
    10, // Demo: 10 seconds instead of 10 minutes for quick testing
    { reminderId: reminder._id }
  );
};

/**
 * Handles the "Take" action directly from notification context
 */
export const handleTakeFromNotification = (reminderId: string, updateStatusFn: any) => {
  console.log('[Action] Taking medication from notification:', reminderId);
  updateStatusFn(reminderId, 'TAKEN');
};