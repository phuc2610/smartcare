import React, { useState } from 'react';
import { HealthLogType, HealthLogDetails } from '../types';
import { logHealthEvent } from '../services/databaseService';
import { estimateCalories } from '../services/geminiService';
import { Utensils, Dumbbell, Activity, Save, AlertCircle, Sparkles, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface HealthTrackingProps {
  onComplete: () => void;
}

const TabButton = ({ active, label, icon: Icon, onClick }: any) => (
  <button
    onClick={onClick}
    className={`flex-1 flex flex-col items-center gap-2 py-3 border-b-2 transition-all ${
      active 
        ? 'border-primary-600 text-primary-600 bg-primary-50' 
        : 'border-transparent text-gray-400 hover:text-gray-600'
    }`}
  >
    <Icon className="w-5 h-5" />
    <span className="text-xs font-bold uppercase">{label}</span>
  </button>
);

const CustomInput = ({ label, value, onChange, placeholder, type = 'text', suffix }: any) => (
  <div className="mb-4">
    <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">{label}</label>
    <div className="relative">
        <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white px-4 py-3 rounded-xl border-2 border-gray-100 focus:border-primary-500 outline-none transition-colors"
        />
        {suffix && (
            <span className="absolute right-4 top-3.5 text-gray-400 font-bold text-sm pointer-events-none">{suffix}</span>
        )}
    </div>
  </div>
);

export const HealthTracking: React.FC<HealthTrackingProps> = ({ onComplete }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<HealthLogType>('meal');
  const [isLoading, setIsLoading] = useState(false);
  const [isEstimating, setIsEstimating] = useState(false);

  // Form States
  const [foodName, setFoodName] = useState('');
  const [calories, setCalories] = useState('');
  const [exerciseType, setExerciseType] = useState('');
  const [duration, setDuration] = useState('');
  const [caloriesBurned, setCaloriesBurned] = useState('');
  const [symptomName, setSymptomName] = useState('');
  const [severity, setSeverity] = useState(5);
  const [note, setNote] = useState('');

  // --- AI Estimation Logic ---
  const handleEstimate = async () => {
    setIsEstimating(true);
    try {
        if (activeTab === 'meal') {
            if (!foodName) {
                alert("Vui lòng nhập tên món ăn trước!");
                setIsEstimating(false);
                return;
            }
            const val = await estimateCalories(foodName, 'food');
            setCalories(val.toString());
        } else if (activeTab === 'exercise') {
            if (!exerciseType || !duration) {
                alert("Vui lòng nhập loại vận động và thời gian!");
                setIsEstimating(false);
                return;
            }
            // Construct query context
            const query = `${exerciseType} trong ${duration} phút`;
            const val = await estimateCalories(query, 'exercise');
            setCaloriesBurned(val.toString());
        }
    } catch (error) {
        console.error(error);
        alert("Không thể ước lượng lúc này.");
    } finally {
        setIsEstimating(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    setIsLoading(true);
    let details: HealthLogDetails = {};

    if (activeTab === 'meal') {
      if (!foodName) { setIsLoading(false); return; } // Basic validation
      details = { foodName, calories: Number(calories) || 0 };
    } else if (activeTab === 'exercise') {
      if (!exerciseType) { setIsLoading(false); return; }
      details = { exerciseType, durationMinutes: Number(duration), caloriesBurned: Number(caloriesBurned) || 0 };
    } else {
      if (!symptomName) { setIsLoading(false); return; }
      details = { symptomName, severity, note };
    }

    // Simulate API Call
    setTimeout(() => {
      logHealthEvent(user._id, activeTab, details);
      setIsLoading(false);
      onComplete(); // Go back or show report
    }, 500);
  };

  return (
    <div className="animate-fade-in pb-24">
      {/* Tabs */}
      <div className="flex bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <TabButton 
          active={activeTab === 'meal'} 
          label="Bữa ăn" 
          icon={Utensils} 
          onClick={() => setActiveTab('meal')} 
        />
        <TabButton 
          active={activeTab === 'exercise'} 
          label="Vận động" 
          icon={Dumbbell} 
          onClick={() => setActiveTab('exercise')} 
        />
        <TabButton 
          active={activeTab === 'symptom'} 
          label="Triệu chứng" 
          icon={Activity} 
          onClick={() => setActiveTab('symptom')} 
        />
      </div>

      {/* Dynamic Form Content */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        
        {activeTab === 'meal' && (
          <div className="animate-fade-in">
            <h3 className="font-bold text-lg text-gray-800 mb-4">Ghi nhận dinh dưỡng</h3>
            <div className="flex items-end gap-2 mb-4">
                <div className="flex-1 -mb-4">
                    <CustomInput label="Tên món ăn" placeholder="Phở bò, Cơm tấm..." value={foodName} onChange={setFoodName} />
                </div>
                <button 
                    onClick={handleEstimate}
                    disabled={isEstimating || !foodName}
                    className="h-[52px] w-[52px] bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-0 active:scale-95 transition-transform shadow-sm border border-indigo-100"
                    title="AI Tự tính Calo"
                >
                    {isEstimating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                </button>
            </div>
            
            <CustomInput label="Lượng Calo (kcal)" placeholder="Ví dụ: 500" type="number" value={calories} onChange={setCalories} />
            
            <p className="text-xs text-gray-400 italic mb-4">* Bấm vào nút <Sparkles className="w-3 h-3 inline" /> để AI tự tính Calo giúp bạn.</p>
          </div>
        )}

        {activeTab === 'exercise' && (
          <div className="animate-fade-in">
            <h3 className="font-bold text-lg text-gray-800 mb-4">Ghi nhận vận động</h3>
            <CustomInput label="Loại hình" placeholder="Chạy bộ, Gym, Yoga..." value={exerciseType} onChange={setExerciseType} />
            <div className="flex gap-4 mb-4">
              <div className="flex-1">
                <CustomInput label="Thời gian (phút)" placeholder="30" type="number" value={duration} onChange={setDuration} />
              </div>
            </div>

            <div className="flex items-end gap-2 mb-2">
                <div className="flex-1 -mb-4">
                    <CustomInput label="Calo tiêu thụ (kcal)" placeholder="Ví dụ: 200" type="number" value={caloriesBurned} onChange={setCaloriesBurned} />
                </div>
                 <button 
                    onClick={handleEstimate}
                    disabled={isEstimating || !exerciseType || !duration}
                    className="h-[52px] w-[52px] bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-0 active:scale-95 transition-transform shadow-sm border border-indigo-100"
                    title="AI Tự tính Calo"
                >
                    {isEstimating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                </button>
            </div>
            <p className="text-xs text-gray-400 italic mb-4">* Nhập môn tập & thời gian rồi bấm <Sparkles className="w-3 h-3 inline" /> để tính.</p>

          </div>
        )}

        {activeTab === 'symptom' && (
          <div className="animate-fade-in">
            <h3 className="font-bold text-lg text-gray-800 mb-4">Theo dõi triệu chứng</h3>
            <CustomInput label="Triệu chứng" placeholder="Đau đầu, Chóng mặt..." value={symptomName} onChange={setSymptomName} />
            
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">
                Mức độ khó chịu: <span className="text-primary-600 text-lg">{severity}/10</span>
              </label>
              <input 
                type="range" 
                min="1" max="10" 
                value={severity} 
                onChange={(e) => setSeverity(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-2">
                <span>Nhẹ</span>
                <span>Vừa</span>
                <span>Nghiêm trọng</span>
              </div>
            </div>

            <CustomInput label="Ghi chú thêm" placeholder="Xảy ra sau khi uống thuốc..." value={note} onChange={setNote} />
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className="w-full mt-4 py-4 bg-primary-600 text-white rounded-xl font-bold text-lg shadow-lg shadow-primary-200 active:scale-95 transition-transform flex items-center justify-center gap-2"
        >
          {isLoading ? 'Đang lưu...' : (
            <>
              <Save className="w-5 h-5" /> Lưu lại
            </>
          )}
        </button>
      </div>
    </div>
  );
};