import React, { useState, useEffect, useRef } from 'react';
import { getCurrentPositionAsync } from '../services/locationService';
import { triggerEmergencySOS } from '../services/databaseService';
import { useAuth } from '../contexts/AuthContext';
import { AlertTriangle, Loader2 } from 'lucide-react';

export const SOSButton = () => {
  const { user } = useAuth();
  const [isPressing, setIsPressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'IDLE' | 'SENDING' | 'SENT' | 'ERROR'>('IDLE');
  
  const intervalRef = useRef<any>(null);
  const PRESS_DURATION = 3000; // 3 seconds
  const UPDATE_INTERVAL = 50;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handlePressStart = () => {
    if (status !== 'IDLE') return;
    setIsPressing(true);
    
    let currentElapsed = 0;
    intervalRef.current = setInterval(() => {
      currentElapsed += UPDATE_INTERVAL;
      const percentage = Math.min((currentElapsed / PRESS_DURATION) * 100, 100);
      setProgress(percentage);

      if (currentElapsed >= PRESS_DURATION) {
        clearInterval(intervalRef.current);
        triggerAction();
      }
    }, UPDATE_INTERVAL);
  };

  const handlePressEnd = () => {
    if (status !== 'IDLE') return;
    setIsPressing(false);
    setProgress(0);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const triggerAction = async () => {
    setIsPressing(false);
    setStatus('SENDING');
    setProgress(100);

    try {
      // 1. Get Location
      const coords = await getCurrentPositionAsync();
      
      // 2. Send API Request
      if (user) {
        await triggerEmergencySOS(user, coords);
        setStatus('SENT');
        
        // Reset after 3 seconds
        setTimeout(() => {
            setStatus('IDLE');
            setProgress(0);
        }, 3000);
      }
    } catch (error: any) {
      console.error(error);
      alert(`Lỗi khẩn cấp: ${error.message}`);
      setStatus('ERROR');
      setTimeout(() => setStatus('IDLE'), 2000);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center my-6 relative">
       {/* Instruction Text */}
      {status === 'IDLE' && (
        <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wider">
          {isPressing ? 'Giữ nguyên...' : 'Nhấn giữ 3s để gọi SOS'}
        </p>
      )}

      <button
        onMouseDown={handlePressStart}
        onMouseUp={handlePressEnd}
        onMouseLeave={handlePressEnd}
        onTouchStart={handlePressStart}
        onTouchEnd={handlePressEnd}
        className={`relative w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition-all duration-200 select-none ${
          status === 'SENT' ? 'bg-green-500' : 
          status === 'ERROR' ? 'bg-gray-500' :
          isPressing ? 'scale-110 bg-red-600' : 'bg-red-500'
        }`}
      >
        {/* Progress Ring Logic (Simplified as background overlay) */}
        {isPressing && (
           <div 
             className="absolute inset-0 rounded-full border-4 border-white opacity-50"
             style={{ clipPath: `inset(${100 - progress}% 0 0 0)` }} // Vertical fill effect
           ></div>
        )}

        {status === 'SENDING' ? (
            <Loader2 className="w-8 h-8 text-white animate-spin" />
        ) : status === 'SENT' ? (
            <span className="text-white font-bold text-xs">ĐÃ GỬI</span>
        ) : (
            <AlertTriangle className={`w-8 h-8 text-white ${isPressing ? 'animate-pulse' : ''}`} />
        )}
      </button>

      {/* Ripple Effect for emphasis */}
      {status === 'IDLE' && !isPressing && (
        <div className="absolute w-20 h-20 bg-red-500 rounded-full animate-ping opacity-20 -z-10"></div>
      )}
    </div>
  );
};
