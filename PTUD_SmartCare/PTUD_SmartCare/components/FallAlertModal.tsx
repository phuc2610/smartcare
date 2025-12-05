
import React, { useEffect, useState, useRef } from 'react';
import { AlertTriangle, X, PhoneCall } from 'lucide-react';
import { getCurrentPositionAsync } from '../services/locationService';
import { triggerEmergencySOS } from '../services/databaseService';
import { useAuth } from '../contexts/AuthContext';

interface FallAlertModalProps {
  visible: boolean;
  onDismiss: () => void; // "I'm OK"
  onTriggerSOS: () => void; // Timeout or manual SOS
}

const COUNTDOWN_SECONDS = 30;

export const FallAlertModal: React.FC<FallAlertModalProps> = ({ visible, onDismiss, onTriggerSOS }) => {
  const { user } = useAuth();
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [status, setStatus] = useState<'COUNTING' | 'SENDING' | 'SENT'>('COUNTING');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<any>(null);

  // Sound Effect Management
  useEffect(() => {
    if (visible) {
      // Alarm Sound URL
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.loop = true;
      audio.volume = 1.0;
      audioRef.current = audio;
      
      // Auto-play might be blocked by browsers without interaction, but works in Expo/Native
      audio.play().catch(e => console.log("Audio autoplay blocked:", e));

      // Reset State
      setCountdown(COUNTDOWN_SECONDS);
      setStatus('COUNTING');

      // Start Timer
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            handleTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      cleanup();
    }

    return () => cleanup();
  }, [visible]);

  const cleanup = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const handleTimeout = async () => {
    cleanup(); // Stop sound and timer
    setStatus('SENDING');
    
    try {
        if (user) {
            const coords = await getCurrentPositionAsync();
            await triggerEmergencySOS(user, coords);
            setStatus('SENT');
            onTriggerSOS(); // Callback to App
        }
    } catch (error) {
        console.error("SOS Failed", error);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-red-600 flex flex-col items-center justify-center p-6 animate-pulse-slow">
      {/* Background Pulse Animation */}
      <div className="absolute inset-0 bg-red-500 animate-ping opacity-20"></div>

      {status === 'COUNTING' && (
        <>
          <div className="bg-white rounded-full p-6 mb-8 shadow-2xl animate-bounce">
            <AlertTriangle className="w-20 h-20 text-red-600" />
          </div>
          
          <h1 className="text-white text-3xl font-bold mb-2 text-center">PHÁT HIỆN TÉ NGÃ!</h1>
          <p className="text-red-100 text-lg mb-8 text-center max-w-xs">
            Hệ thống sẽ gửi vị trí cho người thân sau <span className="font-bold text-white text-2xl">{countdown}s</span>
          </p>

          <div className="w-full max-w-xs space-y-4 z-10">
            <button
              onClick={onDismiss}
              className="w-full py-5 bg-white text-red-600 rounded-2xl font-bold text-xl shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
            >
              <X className="w-6 h-6" /> TÔI ỔN, HỦY BÁO ĐỘNG
            </button>
            
            <button
              onClick={handleTimeout}
              className="w-full py-4 bg-red-800 text-white rounded-2xl font-bold text-lg border-2 border-red-400 active:scale-95 transition-transform flex items-center justify-center gap-2"
            >
              <PhoneCall className="w-5 h-5" /> GỌI SOS NGAY
            </button>
          </div>
        </>
      )}

      {status === 'SENDING' && (
        <div className="text-white flex flex-col items-center">
            <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mb-4"></div>
            <h2 className="text-2xl font-bold">ĐANG GỬI VỊ TRÍ...</h2>
        </div>
      )}

      {status === 'SENT' && (
         <div className="text-white flex flex-col items-center">
             <div className="bg-green-500 p-4 rounded-full mb-4">
                 <PhoneCall className="w-10 h-10 text-white" />
             </div>
             <h2 className="text-2xl font-bold text-center">ĐÃ GỬI BÁO ĐỘNG!</h2>
             <p className="mt-2 text-white/80">Người thân đã nhận được vị trí của bạn.</p>
             <button 
                onClick={onDismiss}
                className="mt-8 px-8 py-3 bg-white/20 rounded-full text-white font-bold"
             >
                Đóng
             </button>
         </div>
      )}
    </div>
  );
};
