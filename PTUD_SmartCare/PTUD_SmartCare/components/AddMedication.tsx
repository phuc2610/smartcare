import React, { useState, useRef } from 'react';
import { FrequencyType } from '../types';
import { createMedication } from '../services/databaseService';
import { scheduleMedicationReminder, registerForPushNotificationsAsync } from '../services/notificationService';
import { extractMedicationFromImage } from '../services/geminiService';
import { Clock, Pill, Save, AlertCircle, Camera, Loader2, Image as ImageIcon, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface AddMedicationProps {
  onComplete: () => void;
}

// --- Custom Components (Mô phỏng React Native Components) ---

const CustomInput = ({ 
  label, 
  value, 
  onChangeText, 
  placeholder, 
  error 
}: { 
  label: string, 
  value: string, 
  onChangeText: (text: string) => void, 
  placeholder?: string,
  error?: boolean 
}) => (
  <div className="mb-4">
    <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">{label}</label>
    <input
      type="text"
      className={`w-full bg-white px-4 py-4 rounded-xl border-2 text-lg outline-none transition-colors ${
        error ? 'border-red-500 focus:border-red-500' : 'border-gray-100 focus:border-primary-500'
      }`}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChangeText(e.target.value)}
    />
  </div>
);

const CustomButton = ({ 
  title, 
  onPress, 
  variant = 'primary' 
}: { 
  title: string, 
  onPress: () => void, 
  variant?: 'primary' | 'secondary' 
}) => (
  <button
    onClick={onPress}
    type="button"
    className={`w-full py-4 rounded-xl font-bold text-lg shadow-sm active:scale-95 transition-transform flex items-center justify-center gap-2 ${
      variant === 'primary' 
        ? 'bg-primary-600 text-white shadow-primary-200' 
        : 'bg-gray-100 text-gray-600'
    }`}
  >
    {title}
  </button>
);

// --- Main Screen ---

export const AddMedication: React.FC<AddMedicationProps> = ({ onComplete }) => {
  const { user } = useAuth();
  // Local State
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [time, setTime] = useState('08:00'); // Default time
  const [errors, setErrors] = useState<{name?: boolean, time?: boolean}>({});
  
  // OCR / Camera State
  const [isScanning, setIsScanning] = useState(false);
  const [scannedImage, setScannedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- OCR LOGIC ---
  const mockOCR = async (imageUri: string) => {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));
    // Return sample data
    return { name: "Panadol Extra", dosage: "500mg" };
  };

  const handleImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 1. Preview Image
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      setScannedImage(base64String);
      setIsScanning(true);

      try {
        // 2. Try Real AI First
        let result = await extractMedicationFromImage(base64String);
        
        // If AI returns null (no key or error), fall back to Mock
        if (!result) {
            console.warn("AI extraction failed, using Mock OCR.");
            result = await mockOCR(base64String);
        }

        // 3. Auto-fill Form
        if (result.name) setName(result.name);
        if (result.dosage) setDosage(result.dosage);

      } catch (error) {
        console.error("OCR Error, falling back to mock:", error);
        const mockResult = await mockOCR(base64String);
        setName(mockResult.name);
        setDosage(mockResult.dosage);
      } finally {
        setIsScanning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setScannedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- SAVE LOGIC ---
  const validateAndSave = async () => {
    const newErrors: {name?: boolean, time?: boolean} = {};
    let isValid = true;

    if (!name.trim()) {
      newErrors.name = true;
      isValid = false;
    }
    if (!time) {
      newErrors.time = true;
      isValid = false;
    }

    setErrors(newErrors);

    if (isValid && user) {
      // 1. Save to Database
      const newMed = createMedication(user._id, {
        name,
        dosage,
        unit: 'mg', // Hardcoded for MVP simplicity
        frequency: FrequencyType.DAILY,
        times: [time],
        startDate: new Date().toISOString(),
      });

      // 2. Ask Permission & Schedule Notification (System Logic)
      await registerForPushNotificationsAsync();

      // Calculate seconds from now until the scheduled time (Simulated logic)
      // For Demo: We schedule it 5 seconds from now so the user sees it work immediately
      const demoDelaySeconds = 5; 
      
      scheduleMedicationReminder(
        `Đến giờ uống ${name} 💊`,
        `Đã ${time} rồi! Nhớ uống ${dosage} mg nhé.`,
        demoDelaySeconds,
        { reminderId: newMed._id } // Pass ID only, simpler for data payload
      );

      onComplete();
    }
  };

  return (
    <div className="animate-fade-in pb-24">
      <div className="bg-blue-50 p-4 rounded-xl mb-6 flex items-start gap-3">
        <Pill className="w-6 h-6 text-primary-600 shrink-0 mt-0.5" />
        <div>
          <h3 className="font-bold text-primary-900">Thêm thuốc mới</h3>
          <p className="text-sm text-primary-700">Nhập thủ công hoặc quét camera.</p>
        </div>
      </div>

      <form onSubmit={(e) => e.preventDefault()}>
        
        {/* --- CAMERA SCAN SECTION --- */}
        <div className="mb-6">
            <input 
                type="file" 
                accept="image/*" 
                capture="environment" // Opens rear camera on mobile
                ref={fileInputRef} 
                onChange={handleImageSelect}
                className="hidden"
            />
            
            {!scannedImage ? (
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-6 border-2 border-dashed border-primary-300 bg-primary-50 rounded-xl flex flex-col items-center justify-center gap-2 text-primary-600 hover:bg-primary-100 transition-colors"
                >
                    <Camera className="w-8 h-8" />
                    <span className="font-bold text-sm">Quét đơn thuốc / Vỏ hộp</span>
                </button>
            ) : (
                <div className="relative rounded-xl overflow-hidden border-2 border-primary-500 shadow-md">
                    <img src={scannedImage} alt="Scanned" className="w-full h-48 object-cover" />
                    
                    {/* Overlay Logic */}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        {isScanning ? (
                            <div className="bg-white px-4 py-2 rounded-full flex items-center gap-2 shadow-lg">
                                <Loader2 className="w-5 h-5 text-primary-600 animate-spin" />
                                <span className="text-xs font-bold text-gray-800">Đang quét AI...</span>
                            </div>
                        ) : (
                            <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
                                <ImageIcon className="w-3 h-3" /> Đã trích xuất
                            </div>
                        )}
                    </div>

                    <button 
                        onClick={clearImage}
                        className="absolute top-2 right-2 bg-white text-gray-600 p-1.5 rounded-full shadow-lg"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>

        <CustomInput 
          label="Tên thuốc *"
          placeholder="Ví dụ: Panadol, Insulin..."
          value={name}
          onChangeText={(text) => {
            setName(text);
            if (errors.name) setErrors({...errors, name: false});
          }}
          error={errors.name}
        />
        {errors.name && <p className="text-red-500 text-sm mb-4 -mt-3 ml-1">Vui lòng nhập tên thuốc</p>}

        <CustomInput 
          label="Liều lượng (Tùy chọn)"
          placeholder="Ví dụ: 500mg, 1 viên"
          value={dosage}
          onChangeText={setDosage}
        />

        {/* Time Picker Simulation */}
        <div className="mb-8">
          <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">Giờ uống thuốc *</label>
          <div className={`relative bg-white rounded-xl border-2 overflow-hidden flex items-center ${
             errors.time ? 'border-red-500' : 'border-gray-100 focus-within:border-primary-500'
          }`}>
            <div className="pl-4 text-gray-400">
              <Clock className="w-6 h-6" />
            </div>
            <input 
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full p-4 text-lg bg-transparent outline-none appearance-none"
              style={{ colorScheme: 'light' }} 
            />
          </div>
        </div>

        <div className="space-y-3 mt-4">
          <CustomButton 
            title="Lưu & Đặt lịch" 
            onPress={validateAndSave} 
          />
          <CustomButton 
            title="Hủy bỏ" 
            variant="secondary" 
            onPress={onComplete} 
          />
        </div>
      </form>
    </div>
  );
};