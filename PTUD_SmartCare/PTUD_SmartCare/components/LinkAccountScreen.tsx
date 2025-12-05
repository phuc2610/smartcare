import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
import { generateLinkCode, submitLinkCode } from '../services/databaseService';
import { Link, Users, Copy, Check, Loader2, ArrowRight } from 'lucide-react';

export const LinkAccountScreen = ({ onNavigate }: { onNavigate: (page: any) => void }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Patient State
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  
  // Caregiver State
  const [inputCode, setInputCode] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // PATIENT: Generate Code
  const handleGenerateCode = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const code = await generateLinkCode(user._id);
      setGeneratedCode(code);
    } catch (err: any) {
      setError('Lỗi khi tạo mã.');
    } finally {
      setLoading(false);
    }
  };

  // CAREGIVER: Submit Code
  const handleSubmitCode = async () => {
    if (!user || !inputCode) return;
    setLoading(true);
    setError('');
    try {
      const res = await submitLinkCode(user._id, inputCode);
      setSuccessMsg(`Đã liên kết thành công với bệnh nhân: ${res.patientName}`);
      setTimeout(() => {
         onNavigate('dashboard'); // Redirect to Caregiver Dashboard
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi liên kết.');
    } finally {
      setLoading(false);
    }
  };

  if (user?.role === UserRole.PATIENT) {
    return (
      <div className="animate-fade-in p-4 bg-white rounded-2xl shadow-sm border border-gray-100 mt-4">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
            <Link className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Liên kết người thân</h2>
          <p className="text-gray-500 text-sm mb-6 max-w-xs">
            Chia sẻ mã bên dưới cho người thân để họ có thể theo dõi sức khỏe của bạn.
          </p>

          {!generatedCode ? (
            <button
              onClick={handleGenerateCode}
              disabled={loading}
              className="w-full py-3 bg-primary-600 text-white rounded-xl font-bold shadow-lg shadow-primary-200 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Tạo mã liên kết'}
            </button>
          ) : (
            <div className="w-full animate-fade-in">
              <div className="bg-gray-50 border-2 border-dashed border-primary-300 rounded-xl p-6 mb-4 relative">
                <p className="text-sm text-gray-400 mb-1 font-medium">MÃ CỦA BẠN</p>
                <p className="text-4xl font-bold text-primary-700 tracking-widest">{generatedCode}</p>
                <div className="absolute top-2 right-2 text-xs text-orange-500 font-medium bg-orange-50 px-2 py-1 rounded">
                  5:00
                </div>
              </div>
              <p className="text-xs text-gray-400 italic mb-4">Mã có hiệu lực trong 5 phút.</p>
              <button
                 onClick={handleGenerateCode}
                 className="text-primary-600 font-bold text-sm"
              >
                Tạo mã mới
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // CAREGIVER VIEW
  return (
    <div className="animate-fade-in p-4 bg-white rounded-2xl shadow-sm border border-gray-100 mt-4">
      <div className="flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mb-4">
          <Users className="w-8 h-8 text-purple-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Kết nối người bệnh</h2>
        <p className="text-gray-500 text-sm mb-6 max-w-xs">
          Nhập mã 6 chữ số từ ứng dụng của người bệnh để bắt đầu theo dõi.
        </p>

        {successMsg ? (
          <div className="bg-green-50 text-green-700 p-4 rounded-xl w-full flex items-center gap-3">
             <Check className="w-5 h-5" />
             <span className="font-bold text-sm">{successMsg}</span>
          </div>
        ) : (
          <div className="w-full">
            <input
              type="text"
              maxLength={6}
              placeholder="Nhập mã 6 số..."
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              className="w-full text-center text-2xl font-bold tracking-widest py-4 border-2 border-gray-200 rounded-xl focus:border-primary-500 outline-none mb-4 transition-colors"
            />
            
            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

            <button
              onClick={handleSubmitCode}
              disabled={loading || inputCode.length !== 6}
              className={`w-full py-4 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all ${
                inputCode.length === 6 ? 'bg-primary-600 text-white shadow-primary-200' : 'bg-gray-200 text-gray-400 shadow-none'
              }`}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                 <>Kết nối ngay <ArrowRight className="w-5 h-5" /></>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};