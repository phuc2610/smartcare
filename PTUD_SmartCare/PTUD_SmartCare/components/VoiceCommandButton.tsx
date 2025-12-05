
import React, { useState } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { startListening, stopListening, speak, processVoiceCommand } from '../services/voiceService';

interface VoiceCommandButtonProps {
  onMarkTaken: () => void;
}

export const VoiceCommandButton: React.FC<VoiceCommandButtonProps> = ({ onMarkTaken }) => {
  const [isListening, setIsListening] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleStart = () => {
    setIsListening(true);
    startListening(
      (text) => {
        setIsListening(false);
        handleCommand(text);
      },
      (error) => {
        setIsListening(false);
        alert("Lỗi micro: " + error);
      }
    );
  };

  const handleStop = () => {
    stopListening();
    // Logic usually handled in onresult, but manual stop ensures UI cleanup
    setTimeout(() => setIsListening(false), 200);
  };

  const handleCommand = (text: string) => {
    setProcessing(true);
    const reply = processVoiceCommand(text, {
      markTaken: onMarkTaken
    });
    
    // Simulate AI processing time
    setTimeout(() => {
        setProcessing(false);
        speak(reply);
        // Optionally show toast/alert here
    }, 500);
  };

  return (
    <div className="fixed bottom-24 right-4 z-40">
      {/* Visual Feedback Ring */}
      {isListening && (
        <div className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-75"></div>
      )}

      <button
        onMouseDown={handleStart}
        onMouseUp={handleStop}
        onTouchStart={handleStart} // Mobile support
        onTouchEnd={handleStop}
        className={`relative w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 ${
          isListening 
            ? 'bg-red-500 text-white' 
            : 'bg-primary-600 text-white'
        }`}
      >
        {processing ? (
             <Loader2 className="w-6 h-6 animate-spin" />
        ) : isListening ? (
             <Mic className="w-6 h-6 animate-pulse" />
        ) : (
             <Mic className="w-6 h-6" />
        )}
      </button>
      
      {/* Tooltip hint */}
      {!isListening && !processing && (
        <div className="absolute right-16 top-1/2 -translate-y-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 md:opacity-100 pointer-events-none transition-opacity">
          Giữ để nói
        </div>
      )}
    </div>
  );
};
