import TrackPlayer, { Event } from 'react-native-track-player';

// TrackPlayer service for background playback
// This service handles playback events when app is in background
module.exports = async function() {
  // Register event listeners for remote control
  TrackPlayer.addEventListener(Event.RemotePlay, async () => {
    await TrackPlayer.play();
  });

  TrackPlayer.addEventListener(Event.RemotePause, async () => {
    await TrackPlayer.pause();
  });

  TrackPlayer.addEventListener(Event.RemoteStop, async () => {
    await TrackPlayer.stop();
  });

  TrackPlayer.addEventListener(Event.RemoteNext, async () => {
    // Skip to next track if needed
    // For now, just stop
    await TrackPlayer.stop();
  });

  TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
    // Skip to previous track if needed
    // For now, just stop
    await TrackPlayer.stop();
  });
};

