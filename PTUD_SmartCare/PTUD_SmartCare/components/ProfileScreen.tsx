
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { updateUserProfile, getWeeklyAdherenceReport } from '../services/databaseService';
import { generateHTML, printToFileAsync } from '../services/exportService';
import { identifyDisease } from '../services/geminiService';
import { UserRole } from '../types';
import { User as UserIcon, Ruler, Weight, Activity, Save, FileText, Loader2, LogOut, Wand2, Activity as SensorIcon, PlayCircle } from 'lucide-react';

// Props Interface extension for Fall Detection controls
interface ProfileScreenProps {
    isMonitoring?: boolean;
    onToggleMonitor?: () => void;
    onSimulateFall?: () => void;
}

const ProfileInput = ({ icon: Icon, label, value, onChange, type = 'text', suffix, placeholder }: any) => (
  <div className="mb-4">
    <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">{label}</label>
    <div className="relative">
      <div className="absolute left-4 top-3.5 text-gray-400">
        <Icon className="w-5 h-5" />
      </div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-12 pr-10 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-primary-500 transition-colors font-medium text-gray-800"
      />
      {suffix && (
        <span className="absolute right-4 top-3.5 text-gray-400 text-sm font-bold">{suffix}</span>
      )}
    </div>
  </div>
);

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ isMonitoring, onToggleMonitor, onSimulateFall }) => {
  const { user, updateProfile, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  // Form State
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  // UC07: User inputs free text, AI normalizes it
  const [conditionInput, setConditionInput] = useState(''); 
  const [normalizedResult, setNormalizedResult] = useState('');

  useEffect(() => {
    if (user) {
      setHeight(user.height?.toString() || '');
      setWeight(user.weight?.toString() || '');
      // If user already has a standardized condition, show it or allow overwrite
      setConditionInput(user.medicalCondition && user.medicalCondition !== 'Normal' ? user.medicalCondition : '');
      setNormalizedResult(user.medicalCondition || 'Normal');
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    setAnalyzing(true);
    
    try {
      // 1. AI Normalization Step
      let finalCondition = 'Normal';
      if (conditionInput.trim()) {
        finalCondition = await identifyDisease(conditionInput);
      }
      setNormalizedResult(finalCondition);

      // 2. Database Update
      const updatedUser = await updateUserProfile(user._id, {
        height: Number(height) || 0,
        weight: Number(weight) || 0,
        medicalCondition: finalCondition
      });
      
      updateProfile(updatedUser);
      alert(`Đã lưu hồ sơ!\nHệ thống ghi nhận tình trạng: ${finalCondition}`);
    
    } catch (error) {
      alert("Lỗi khi lưu hồ sơ.");
    } finally {
      setAnalyzing(false);
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!user) return;
    setExportLoading(true);
    try {
        const reportData = getWeeklyAdherenceReport(user._id);
        const html = generateHTML(user, reportData);
        await printToFileAsync(html);
    } catch (error) {
        console.error(error);
        alert("Không thể xuất báo cáo.");
    } finally {
        setExportLoading(false);
    }
  };

  return (
    <div className="animate-fade-in pb-24">
      {/* Header Info */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mb-4 border-4 border-white shadow-sm">
          <UserIcon className="w-12 h-12 text-gray-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800">{user?.name}</h2>
        <p className="text-gray-500">{user?.phone}</p>
        <div className="flex gap-2 mt-2">
            <span className="px-3 py-1 bg-primary-50 text-primary-700 text-xs font-bold rounded-full uppercase">
            {user?.role === UserRole.PATIENT ? 'Người bệnh' : 'Người thân'}
            </span>
            {normalizedResult && normalizedResult !== 'Normal' && (
                <span className="px-3 py-1 bg-orange-50 text-orange-700 text-xs font-bold rounded-full border border-orange-100">
                    {normalizedResult}
                </span>
            )}
        </div>
      </div>

      {/* Fall Detection Settings (Only for Patient) */}
      {user?.role === UserRole.PATIENT && (
          <div className="bg-red-50 p-5 rounded-2xl shadow-sm border border-red-100 mb-6">
              <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-red-700">
                      <SensorIcon className="w-5 h-5" />
                      <h3 className="font-bold">Cảnh báo té ngã</h3>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={isMonitoring} onChange={onToggleMonitor} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                  </label>
              </div>
              <p className="text-xs text-red-600 mb-4">
                  {isMonitoring ? 'Đang theo dõi cảm biến chuyển động.' : 'Đã tắt giám sát.'}
              </p>
              
              <button 
                  onClick={onSimulateFall}
                  className="w-full py-2 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                  <PlayCircle className="w-4 h-4" /> Giả lập sự cố (Test)
              </button>
          </div>
      )}

      {/* Form Section */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6">
        <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">Chỉ số sức khỏe</h3>
        
        <div className="flex gap-4">
            <div className="flex-1">
                <ProfileInput 
                    icon={Ruler} 
                    label="Chiều cao" 
                    value={height} 
                    onChange={setHeight} 
                    type="number" 
                    suffix="cm"
                />
            </div>
            <div className="flex-1">
                <ProfileInput 
                    icon={Weight} 
                    label="Cân nặng" 
                    value={weight} 
                    onChange={setWeight} 
                    type="number" 
                    suffix="kg"
                />
            </div>
        </div>

        {/* AI DISEASE INPUT */}
        <div className="mb-6">
            <div className="flex justify-between items-center mb-1 ml-1">
                <label className="block text-xs font-bold text-gray-500 uppercase">Tình trạng bệnh lý</label>
                {analyzing && <span className="text-xs text-primary-600 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin"/> AI đang phân tích...</span>}
            </div>
            
            <div className="relative">
                <div className="absolute left-4 top-3.5 text-gray-400">
                    <Activity className="w-5 h-5" />
                </div>
                <input
                    type="text"
                    value={conditionInput}
                    onChange={(e) => setConditionInput(e.target.value)}
                    placeholder="VD: Tôi bị tiểu đường và mỡ máu..."
                    className="w-full pl-12 pr-10 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-primary-500 transition-colors font-medium text-gray-800"
                />
                <div className="absolute right-4 top-3.5">
                     <Wand2 className="w-5 h-5 text-purple-400" />
                </div>
            </div>
            <p className="text-xs text-gray-400 mt-2 ml-1">
                * Nhập mô tả bệnh của bạn, AI sẽ tự động nhận diện nhóm bệnh để đưa ra lời khuyên.
            </p>
        </div>

        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full py-4 bg-primary-600 text-white rounded-xl font-bold shadow-lg shadow-primary-200 active:scale-95 transition-transform flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
            <>
              <Save className="w-5 h-5" /> Lưu & Phân tích
            </>
          )}
        </button>
      </div>

      {/* Actions Section */}
      <div className="space-y-3">
        {user?.role === UserRole.PATIENT && (
            <button
            onClick={handleExportPDF}
            disabled={exportLoading}
            className="w-full py-4 bg-white text-gray-700 border border-gray-200 rounded-xl font-bold shadow-sm active:scale-95 transition-transform flex items-center justify-center gap-2"
            >
            {exportLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                <FileText className="w-5 h-5 text-red-500" /> Xuất báo cáo tuần (PDF)
                </>
            )}
            </button>
        )}

        <button
            onClick={signOut}
            className="w-full py-4 bg-red-50 text-red-600 rounded-xl font-bold active:scale-95 transition-transform flex items-center justify-center gap-2"
        >
            <LogOut className="w-5 h-5" /> Đăng xuất
        </button>
      </div>
    </div>
  );
};
