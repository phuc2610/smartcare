import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useAudioPlayer } from '../../hooks/useAudioPlayer';
import { logWellnessSession } from '../../services/wellness.service';
import { COLORS } from '../../utils/constants';

const RainSound = require('../../assets/Rain.mp3');
const SeaSound = require('../../assets/see.mp3');
const ChillSound = require('../../assets/Chill.mp3');
const ForestSound = require('../../assets/Forest.mp3');

const SOUND_LIBRARY = [
  { id: 'rain', title: 'Mưa Rơi', uri: RainSound },
  { id: 'ocean', title: 'Sóng Biển', uri: SeaSound },
  { id: 'piano', title: 'Thiền Piano', uri: ChillSound },
  { id: 'nature', title: 'Rừng Cây', uri: ForestSound },
];

export const WellnessScreen = () => {
  const [activeTab, setActiveTab] = useState<'sounds' | 'breathing'>('sounds');

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
      <View style={styles.header}>
        <Text style={styles.title}>Góc thư giãn 🌿</Text>
        <Text style={styles.subtitle}>Cân bằng tâm trí, phục hồi năng lượng</Text>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'sounds' && styles.tabActive]}
          onPress={() => setActiveTab('sounds')}
        >
          <Text style={[styles.tabText, activeTab === 'sounds' && styles.tabTextActive]}>Âm thanh</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'breathing' && styles.tabActive]}
          onPress={() => setActiveTab('breathing')}
        >
          <Text style={[styles.tabText, activeTab === 'breathing' && styles.tabTextActive]}>Tập thở</Text>
        </TouchableOpacity>
      </View>

        {activeTab === 'sounds' ? <SoundTherapyTab /> : <BreathingTab />}
      </ScrollView>
    </View>
  );
};

const SoundTherapyTab = () => {
  const { user } = useAuth();
  const { isPlaying, currentTrackId, playSound, stop } = useAudioPlayer();
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (isPlaying && !startTimeRef.current) {
      startTimeRef.current = Date.now();
    } else if (!isPlaying && startTimeRef.current && user) {
      const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
      if (duration > 5) {
        logWellnessSession('music', duration);
      }
      startTimeRef.current = null;
    }
  }, [isPlaying, user]);

  return (
    <View style={styles.soundsGrid}>
      {SOUND_LIBRARY.map(sound => {
        const isActive = currentTrackId === sound.id;
        return (
          <TouchableOpacity
            key={sound.id}
            style={[styles.soundCard, isActive && styles.soundCardActive]}
            onPress={() => playSound(sound.id, sound.uri)}
          >
            <Text style={styles.soundIcon}>🎵</Text>
            <Text style={styles.soundTitle}>{sound.title}</Text>
            {isActive && isPlaying && <Text style={styles.playing}>Đang phát...</Text>}
          </TouchableOpacity>
        );
      })}
      {currentTrackId && (
        <TouchableOpacity style={styles.stopButton} onPress={stop}>
          <Text style={styles.stopButtonText}>Dừng</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const BreathingTab = () => {
  const { user } = useAuth();
  const [isActive, setIsActive] = useState(false);
  const [phase, setPhase] = useState<'IDLE' | 'INHALE' | 'HOLD' | 'EXHALE'>('IDLE');
  const [instruction, setInstruction] = useState('Sẵn sàng?');
  const timerRef = useRef<any>(null);
  const sessionStartRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isActive) {
      setPhase('IDLE');
      setInstruction('Sẵn sàng?');
      if (timerRef.current) clearTimeout(timerRef.current);
      
      if (sessionStartRef.current && user) {
        const duration = Math.round((Date.now() - sessionStartRef.current) / 1000);
        if (duration > 10) {
          logWellnessSession('breathing', duration);
        }
        sessionStartRef.current = null;
      }
      return;
    }

    if (!sessionStartRef.current) sessionStartRef.current = Date.now();

    let currentStep = 0;
    const steps = [
      { p: 'INHALE', text: 'Hít vào... (4s)' },
      { p: 'HOLD', text: 'Giữ hơi... (4s)' },
      { p: 'EXHALE', text: 'Thở ra... (4s)' },
    ];

    const nextStep = () => {
      const s = steps[currentStep];
      setPhase(s.p as any);
      setInstruction(s.text);
      currentStep = (currentStep + 1) % 3;
      timerRef.current = setTimeout(nextStep, 4000);
    };

    nextStep();

    return () => clearTimeout(timerRef.current);
  }, [isActive, user]);

  return (
    <View style={styles.breathingContainer}>
      <View style={[styles.circle, phase === 'INHALE' && styles.circleInhale, phase === 'EXHALE' && styles.circleExhale]}>
        <Text style={styles.breathingText}>{instruction}</Text>
      </View>
      <TouchableOpacity
        style={styles.breathingButton}
        onPress={() => setIsActive(!isActive)}
      >
        <Text style={styles.breathingButtonText}>
          {isActive ? 'Kết thúc' : 'Bắt đầu tập'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  tabs: {
    flexDirection: 'row',
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: COLORS.primaryLight,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  soundsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  soundCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  soundCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  soundIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  soundTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  playing: {
    fontSize: 12,
    color: COLORS.primary,
    marginTop: 4,
  },
  stopButton: {
    width: '100%',
    backgroundColor: COLORS.error,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  stopButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  breathingContainer: {
    alignItems: 'center',
    padding: 32,
  },
  circle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  circleInhale: {
    transform: [{ scale: 1.5 }],
  },
  circleExhale: {
    transform: [{ scale: 1 }],
  },
  breathingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  breathingButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  breathingButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});





