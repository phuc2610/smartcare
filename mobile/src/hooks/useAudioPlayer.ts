import { useState, useEffect, useRef } from 'react';
import TrackPlayer, { Capability, State } from 'react-native-track-player';

interface AudioState {
  isPlaying: boolean;
  currentTrackId: string | null;
  duration: number;
  position: number;
}

export const useAudioPlayer = () => {
  const [playerState, setPlayerState] = useState<AudioState>({
    isPlaying: false,
    currentTrackId: null,
    duration: 0,
    position: 0,
  });

  useEffect(() => {
    const setupPlayer = async () => {
      await TrackPlayer.setupPlayer();
      await TrackPlayer.updateOptions({
        capabilities: [Capability.Play, Capability.Pause, Capability.Stop],
        compactCapabilities: [Capability.Play, Capability.Pause],
      });
    };
    setupPlayer();

    return () => {
      TrackPlayer.destroy();
    };
  }, []);

  const stop = async () => {
    await TrackPlayer.stop();
    await TrackPlayer.reset();
    setPlayerState(prev => ({ ...prev, isPlaying: false, position: 0 }));
  };

  const playSound = async (id: string, uri: string) => {
    try {
      const state = await TrackPlayer.getState();
      
      if (playerState.currentTrackId === id && state === State.Playing) {
        await TrackPlayer.pause();
        setPlayerState(prev => ({ ...prev, isPlaying: false }));
        return;
      }

      if (playerState.currentTrackId === id && state === State.Paused) {
        await TrackPlayer.play();
        setPlayerState(prev => ({ ...prev, isPlaying: true }));
        return;
      }

      await TrackPlayer.reset();
      await TrackPlayer.add({
        id,
        url: uri,
        title: 'Wellness Sound',
      });
      await TrackPlayer.play();
      
      const track = await TrackPlayer.getTrack(0);
      setPlayerState({
        isPlaying: true,
        currentTrackId: id,
        duration: track?.duration || 0,
        position: 0,
      });
    } catch (err) {
      console.error('Audio playback error:', err);
    }
  };

  return {
    ...playerState,
    playSound,
    stop,
  };
};





