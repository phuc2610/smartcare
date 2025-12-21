import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import TrackPlayer from 'react-native-track-player';
import notifee, { EventType } from '@notifee/react-native';

// Register the main app component
AppRegistry.registerComponent(appName, () => App);

// Register TrackPlayer service for background playback
TrackPlayer.registerPlaybackService(() => require('./src/services/trackPlayerService.js'));

// Register background notification handler (must be at root level, not in component)
notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.DELIVERED || type === EventType.TRIGGER_NOTIFICATION_CREATED) {
    // Notification was delivered or created in background
    console.log('[NOTIF] Background notification', detail.notification?.id);
  } else if (type === EventType.PRESS) {
    // User pressed the notification from background
    console.log('[NOTIF] Background notification pressed', detail.notification?.data);
  }
});





