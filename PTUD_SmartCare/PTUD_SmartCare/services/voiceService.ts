
/**
 * SERVICE: Voice Command Service
 * Uses Web Speech API to simulate React Native's 'react-native-voice' and 'expo-speech'.
 */

// Define SpeechRecognition types (not available in standard TS lib by default)
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

// --- TEXT TO SPEECH (TTS) ---
export const speak = (text: string) => {
  if (!('speechSynthesis' in window)) {
    console.warn("Text-to-Speech not supported in this browser.");
    return;
  }

  // Cancel current speaking
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'vi-VN'; // Vietnamese
  utterance.rate = 1.0;
  
  // Try to find a Vietnamese voice if available
  const voices = window.speechSynthesis.getVoices();
  const vnVoice = voices.find(v => v.lang.includes('vi'));
  if (vnVoice) utterance.voice = vnVoice;

  window.speechSynthesis.speak(utterance);
};

// --- SPEECH TO TEXT (STT) ---
let recognition: any = null;

export const initVoiceRecognition = () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'vi-VN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
  }
};

export const startListening = (
  onResult: (text: string) => void, 
  onError: (error: string) => void
) => {
  if (!recognition) initVoiceRecognition();
  if (!recognition) {
    onError("Trình duyệt không hỗ trợ nhận diện giọng nói.");
    return;
  }

  recognition.onstart = () => {
    console.log('[Voice] Listening started...');
  };

  recognition.onresult = (event: any) => {
    const transcript = event.results[0][0].transcript;
    console.log('[Voice] Result:', transcript);
    onResult(transcript);
  };

  recognition.onerror = (event: any) => {
    console.error('[Voice] Error:', event.error);
    onError(event.error);
  };

  try {
    recognition.start();
  } catch (e) {
    console.warn("Recognition already started");
  }
};

export const stopListening = () => {
  if (recognition) {
    recognition.stop();
  }
};

// --- LOGIC: Command Processor ---
export const processVoiceCommand = (
  text: string, 
  onAction: { markTaken: () => void }
): string => {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('uống thuốc') || lowerText.includes('đã uống') || lowerText.includes('xong rồi')) {
    onAction.markTaken();
    return "Đã ghi nhận bạn uống thuốc. Giỏi lắm!";
  }
  
  if (lowerText.includes('chào') || lowerText.includes('hello')) {
    return "Chào bạn, chúc bạn một ngày tốt lành.";
  }

  return `Tôi chưa hiểu lệnh "${text}". Hãy thử nói "Tôi đã uống thuốc".`;
};
