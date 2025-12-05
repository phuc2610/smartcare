import { useState, useEffect, useRef } from 'react';

interface AudioState {
  isPlaying: boolean;
  currentTrackId: string | null;
  duration: number;
  position: number;
}

/**
 * Hook logic:
 * Manages a single HTML5 Audio instance.
 * Simulates the behavior of expo-av's Sound object for a list of tracks.
 */
export const useAudioPlayer = () => {
  const [playerState, setPlayerState] = useState<AudioState>({
    isPlaying: false,
    currentTrackId: null,
    duration: 0,
    position: 0,
  });

  // Use ref to keep the audio instance persistent across renders without re-triggering effects
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setPlayerState(prev => ({ ...prev, isPlaying: false, position: 0 }));
    }
  };

  const playSound = async (id: string, uri: string) => {
    // If clicking the same playing track -> Pause
    if (playerState.currentTrackId === id && playerState.isPlaying) {
      audioRef.current?.pause();
      setPlayerState(prev => ({ ...prev, isPlaying: false }));
      return;
    }

    // If clicking the same paused track -> Resume
    if (playerState.currentTrackId === id && !playerState.isPlaying) {
      await audioRef.current?.play();
      setPlayerState(prev => ({ ...prev, isPlaying: true }));
      return;
    }

    // New Track Logic
    // 1. Stop previous
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null; // Detach
    }

    // 2. Create new instance
    const audio = new Audio(uri);
    audio.loop = true; // For wellness, looping is usually desired
    audioRef.current = audio;

    // 3. Setup Listeners
    audio.onloadedmetadata = () => {
      setPlayerState(prev => ({ ...prev, duration: audio.duration }));
    };
    
    audio.ontimeupdate = () => {
      setPlayerState(prev => ({ ...prev, position: audio.currentTime }));
    };

    audio.onended = () => {
      setPlayerState(prev => ({ ...prev, isPlaying: false, position: 0 }));
    };

    // 4. Play
    try {
      await audio.play();
      setPlayerState({
        isPlaying: true,
        currentTrackId: id,
        duration: audio.duration || 0,
        position: 0
      });
    } catch (err) {
      console.error("Audio playback error:", err);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  return {
    ...playerState,
    playSound,
    stop,
  };
};