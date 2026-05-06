import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import TrackPlayer from 'react-native-track-player';
import notifee, { EventType } from '@notifee/react-native';

// Register the main app component
AppRegistry.registerComponent(appName, () => App);

// Register TrackPlayer service for background playback
TrackPlayer.registerPlaybackService(() => require('./src/services/trackPlayerService.js'));

import { updateReminderStatus } from './src/services/medication.service';
import { scheduleMedicationReminder } from './src/services/notification.service';
import { ReminderStatus } from './src/types';

// Register background notification handler (must be at root level, not in component)
notifee.onBackgroundEvent(async ({ type, detail }) => {
  const { notification, pressAction } = detail;

  if (type === EventType.ACTION_PRESS && pressAction?.id) {
    console.log(`[NOTIF] Action pressed: ${pressAction.id}`);
    
    const reminderId = notification?.data?.reminderId;
    
    if (pressAction.id === 'mark_taken' && reminderId) {
      // Mark medication as taken via API
      try {
        await updateReminderStatus(reminderId, ReminderStatus.TAKEN);
        if (notification?.id) {
          await notifee.cancelNotification(notification.id);
        }
      } catch (err) {
        console.error('Failed to mark as taken from background action', err);
      }
    } else if (pressAction.id === 'snooze_15' && reminderId) {
      // Snooze for 15 minutes
      const snoozeTime = new Date();
      snoozeTime.setMinutes(snoozeTime.getMinutes() + 15);
      
      const title = notification?.title || 'Nhắc nhở uống thuốc (Báo lại)';
      const body = notification?.body || 'Đến giờ uống thuốc';
      
      try {
        await scheduleMedicationReminder(title, body, snoozeTime, reminderId);
        if (notification?.id) {
          await notifee.cancelNotification(notification.id);
        }
      } catch (err) {
        console.error('Failed to snooze from background action', err);
      }
    }
  } else if (type === EventType.PRESS) {
    // User pressed the notification from background
    console.log('[NOTIF] Background notification pressed', notification?.data);
  }
});





