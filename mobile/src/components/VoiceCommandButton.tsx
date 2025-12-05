import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet, Text } from 'react-native';
import Voice from '@react-native-voice/voice';
import Tts from 'react-native-tts';
import { COLORS } from '../utils/constants';

interface VoiceCommandButtonProps {
  onMarkTaken: () => void;
}

export const VoiceCommandButton: React.FC<VoiceCommandButtonProps> = ({ onMarkTaken }) => {
  const [isListening, setIsListening] = useState(false);
  const [processing, setProcessing] = useState(false);

  React.useEffect(() => {
    Voice.onSpeechStart = () => setIsListening(true);
    Voice.onSpeechEnd = () => setIsListening(false);
    Voice.onSpeechResults = (e) => {
      if (e.value && e.value.length > 0) {
        handleCommand(e.value[0]);
      }
    };
    Voice.onSpeechError = (e) => {
      console.error('Voice error:', e);
      setIsListening(false);
    };

    Tts.setDefaultLanguage('vi-VN');

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  const handleStart = async () => {
    try {
      await Voice.start('vi-VN');
    } catch (e) {
      console.error('Failed to start voice:', e);
    }
  };

  const handleStop = async () => {
    try {
      await Voice.stop();
    } catch (e) {
      console.error('Failed to stop voice:', e);
    }
  };

  const handleCommand = (text: string) => {
    setProcessing(true);
    const lowerText = text.toLowerCase();

    let reply = '';
    if (lowerText.includes('uống thuốc') || lowerText.includes('đã uống') || lowerText.includes('xong rồi')) {
      onMarkTaken();
      reply = 'Đã ghi nhận bạn uống thuốc. Giỏi lắm!';
    } else if (lowerText.includes('chào') || lowerText.includes('hello')) {
      reply = 'Chào bạn, chúc bạn một ngày tốt lành.';
    } else {
      reply = `Tôi chưa hiểu lệnh "${text}". Hãy thử nói "Tôi đã uống thuốc".`;
    }

    setTimeout(() => {
      setProcessing(false);
      Tts.speak(reply);
    }, 500);
  };

  return (
    <TouchableOpacity
      style={[styles.button, isListening && styles.buttonListening]}
      onPressIn={handleStart}
      onPressOut={handleStop}
      activeOpacity={0.8}
    >
      <Text style={styles.icon}>{processing ? '...' : isListening ? '🎤' : '🎙️'}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    bottom: 100,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonListening: {
    backgroundColor: COLORS.error,
  },
  icon: {
    fontSize: 24,
  },
});





