
import React, { useState, useEffect, useRef } from 'react';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { useAuth } from '../contexts/AuthContext';
import { logWellnessSession } from '../services/databaseService';
import { Play, Pause, Square, Music, Wind, Waves, CloudRain, Sprout, Volume2 } from 'lucide-react';

// --- MOCK DATA FOR SOUNDS ---
const SOUND_LIBRARY = [
  {
    id: 'rain',
    title: 'Mưa Rơi',
    icon: CloudRain,
    color: 'bg-blue-50 text-blue-600',
    uri: 'https://assets.mixkit.co/active_storage/sfx/1253/1253-preview.mp3'
  },
  {
    id: 'ocean',
    title: 'Sóng Biển',
    icon: Waves,
    color: 'bg-cyan-50 text-cyan-600',
    uri: 'https://assets.mixkit.co/active_storage/sfx/1196/1196-preview.mp3'
  },
  {
    id: 'piano',
    title: 'Thiền Piano',
    icon: Music,
    color: 'bg-purple-50 text-purple-600',
    uri: 'https://assets.mixkit.co/active_storage/sfx/565/565-preview.mp3'
  },
  {
    id: 'nature',
    title: 'Rừng Cây',
    icon: Sprout,
    color: 'bg-green-50 text-green-600',
    uri: 'https://assets.mixkit.co/active_storage/sfx/1210/1210-preview.mp3'
  }
];

// --- TAB 1: SOUND THERAPY ---
const SoundTherapyTab = () => {
  const { user } = useAuth();
  const { isPlaying, currentTrackId, playSound, stop } = useAudioPlayer();
  
  // Logic tracking time
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (isPlaying) {
        // Started playing
        startTimeRef.current = Date.now();
    } else {
        // Stopped or Paused
        if (startTimeRef.current && user) {
            const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
            if (duration > 5) {
                logWellnessSession(user._id, 'music', duration);
            }
            startTimeRef.current = null;
        }
    }
  }, [isPlaying, user]);

  const currentTrack = SOUND_LIBRARY.find(t => t.id === currentTrackId);

  return (
    <div className="flex flex-col h-full relative pb-20">
      <div className="grid grid-cols-2 gap-4">
        {SOUND_LIBRARY.map((sound) => {
          const isActive = currentTrackId === sound.id;
          return (
            <button
              key={sound.id}
              onClick={() => playSound(sound.id, sound.uri)}
              className={`relative p-4 rounded-2xl border-2 transition-all active:scale-95 flex flex-col items-center justify-center gap-3 h-32 ${
                isActive 
                  ? 'border-primary-500 bg-primary-50 shadow-md' 
                  : 'border-transparent bg-white shadow-sm hover:bg-gray-50'
              }`}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${sound.color}`}>
                <sound.icon className="w-6 h-6" />
              </div>
              <span className={`font-bold text-sm ${isActive ? 'text-primary-700' : 'text-gray-600'}`}>
                {sound.title}
              </span>
              
              {/* Animation Bars when playing */}
              {isActive && isPlaying && (
                 <div className="absolute top-3 right-3 flex gap-0.5 items-end h-3">
                    <div className="w-1 bg-primary-500 animate-[bounce_1s_infinite] h-full"></div>
                    <div className="w-1 bg-primary-500 animate-[bounce_1.2s_infinite] h-2/3"></div>
                    <div className="w-1 bg-primary-500 animate-[bounce_0.8s_infinite] h-1/2"></div>
                 </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Mini Player */}
      {currentTrackId && (
        <div className="fixed bottom-20 left-4 right-4 bg-gray-900 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between z-30 animate-slide-up">
          <div className="flex items-center gap-3">
             <div className={`w-10 h-10 rounded-full flex items-center justify-center ${currentTrack?.color || 'bg-gray-700'}`}>
                 {currentTrack && <currentTrack.icon className="w-5 h-5" />}
             </div>
             <div>
                 <p className="font-bold text-sm">{currentTrack?.title}</p>
                 <p className="text-xs text-gray-400">{isPlaying ? 'Đang phát...' : 'Đã tạm dừng'}</p>
             </div>
          </div>
          
          <div className="flex items-center gap-3">
             <button 
                onClick={() => currentTrack && playSound(currentTrack.id, currentTrack.uri)}
                className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center active:scale-90 transition-transform"
             >
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
             </button>
             <button 
                onClick={stop}
                className="p-2 text-gray-400 hover:text-white transition-colors"
             >
                <Square className="w-5 h-5 fill-current" />
             </button>
          </div>
        </div>
      )}
    </div>
  );
};

// --- TAB 2: BREATHING EXERCISE ---
const BreathingTab = () => {
  const { user } = useAuth();
  const [isActive, setIsActive] = useState(false);
  const [phase, setPhase] = useState<'IDLE' | 'INHALE' | 'HOLD' | 'EXHALE'>('IDLE');
  const [instruction, setInstruction] = useState('Sẵn sàng?');
  const timerRef = useRef<any>(null);
  const sessionStartRef = useRef<number | null>(null);

  // 4-4-4 Technique
  const CYCLE_DURATION = 4000;

  useEffect(() => {
    if (!isActive) {
      setPhase('IDLE');
      setInstruction('Sẵn sàng?');
      if (timerRef.current) clearTimeout(timerRef.current);
      
      // LOGIC: End Session & Save Log
      if (sessionStartRef.current && user) {
          const duration = Math.round((Date.now() - sessionStartRef.current) / 1000);
          if (duration > 10) { // Only log if > 10 seconds
            logWellnessSession(user._id, 'breathing', duration);
          }
          sessionStartRef.current = null;
      }
      return;
    }

    // LOGIC: Start Session
    if (!sessionStartRef.current) sessionStartRef.current = Date.now();

    let currentStep = 0;
    const steps = [
        { p: 'INHALE', text: 'Hít vào... (4s)' },
        { p: 'HOLD', text: 'Giữ hơi... (4s)' },
        { p: 'EXHALE', text: 'Thở ra... (4s)' }
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

  const getCircleStyle = () => {
    switch(phase) {
      case 'IDLE': return 'scale-100 bg-blue-100';
      case 'INHALE': return 'scale-[1.7] bg-blue-300 duration-[4000ms]';
      case 'HOLD': return 'scale-[1.7] bg-blue-400 duration-0';
      case 'EXHALE': return 'scale-100 bg-blue-100 duration-[4000ms]';
      default: return 'scale-100';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-[60vh] relative">
       {/* Background Circles */}
       <div className={`absolute w-48 h-48 rounded-full opacity-30 transition-all ease-in-out ${getCircleStyle()}`}></div>
       <div className={`absolute w-32 h-32 rounded-full opacity-50 transition-all ease-in-out delay-75 ${getCircleStyle()}`}></div>
       
       {/* Main Circle & Text */}
       <div className="z-10 bg-white/80 w-40 h-40 rounded-full flex flex-col items-center justify-center backdrop-blur-sm shadow-sm">
           <Wind className={`w-8 h-8 mb-2 transition-colors ${phase === 'HOLD' ? 'text-blue-600' : 'text-blue-400'}`} />
           <p className="font-bold text-gray-700 text-lg transition-all">{instruction}</p>
       </div>

       <div className="absolute bottom-0 w-full px-8">
          {!isActive ? (
             <button 
                onClick={() => setIsActive(true)}
                className="w-full py-4 bg-primary-600 text-white rounded-xl font-bold shadow-lg shadow-primary-200 active:scale-95 transition-transform"
             >
                Bắt đầu tập
             </button>
          ) : (
             <button 
                onClick={() => setIsActive(false)}
                className="w-full py-4 bg-gray-100 text-gray-600 rounded-xl font-bold active:scale-95 transition-transform"
             >
                Kết thúc
             </button>
          )}
       </div>
    </div>
  );
};

// --- MAIN SCREEN ---
export const WellnessScreen = () => {
  const [activeTab, setActiveTab] = useState<'sounds' | 'breathing'>('sounds');

  return (
    <div className="animate-fade-in">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-gray-800">Góc thư giãn 🌿</h2>
        <p className="text-gray-500 text-sm">Cân bằng tâm trí, phục hồi năng lượng</p>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-gray-100 rounded-xl mb-6">
        <button
          onClick={() => setActiveTab('sounds')}
          className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'sounds' 
              ? 'bg-white text-primary-600 shadow-sm' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Volume2 className="w-4 h-4" /> Âm thanh
        </button>
        <button
          onClick={() => setActiveTab('breathing')}
          className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'breathing' 
              ? 'bg-white text-primary-600 shadow-sm' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Wind className="w-4 h-4" /> Tập thở
        </button>
      </div>

      <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 min-h-[500px]">
        {activeTab === 'sounds' ? <SoundTherapyTab /> : <BreathingTab />}
      </div>
    </div>
  );
};
