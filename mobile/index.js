import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import TrackPlayer from 'react-native-track-player';

// Register the main app component
AppRegistry.registerComponent(appName, () => App);

// Register TrackPlayer service for background playback
TrackPlayer.registerPlaybackService(() => require('./src/services/trackPlayerService.js'));





