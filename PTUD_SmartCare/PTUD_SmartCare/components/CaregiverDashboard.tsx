import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getLinkedPatient, getTodayReminders } from '../services/databaseService';
import { User, Reminder } from '../types';
import { Dashboard } from './Dashboard';
import { ReportScreen } from './ReportScreen';
import { UserRound, AlertCircle, Phone, Link } from 'lucide-react';

export const CaregiverDashboard = ({ onNavigate }: { onNavigate: (page: any) => void }) => {
  const { user } = useAuth();
  const [patient, setPatient] = useState<User | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [adherenceRate, setAdherenceRate] = useState(0);

  useEffect(() => {
    if (user?._id) {
      const linkedPatient = getLinkedPatient(user._id);
      setPatient(linkedPatient);
      
      if (linkedPatient) {
        // Calculate stats for summary card
        const reminders = getTodayReminders(linkedPatient._id);
        const taken = reminders.filter(r => r.status === 'TAKEN').length;
        const total = reminders.length;
        setAdherenceRate(total > 0 ? Math.round((taken / total) * 100) : 0);
      }
      setLoading(false);
    }
  }, [user]);

  if (loading) return <div className="p-8 text-center">Đang tải dữ liệu...</div>;

  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
          <UserRound className="w-10 h-10 text-gray-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Chưa liên kết người bệnh</h2>
        <p className="text-gray-500 mb-8">Bạn cần nhập mã kết nối để bắt đầu theo dõi sức khỏe người thân.</p>
        <button
          onClick={() => onNavigate('link')}
          className="bg-primary-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-primary-200 active:scale-95 transition-transform"
        >
          Liên kết ngay
        </button>
      </div>
    );
  }

  return (
    <div className="pb-24 animate-fade-in">
      {/* Patient Profile Header */}
      <div className="bg-primary-700 p-6 rounded-3xl text-white shadow-xl shadow-primary-200 mb-6 relative overflow-hidden">
         <div className="absolute top-0 right-0 p-10 bg-white opacity-5 rounded-full transform translate-x-10 -translate-y-10"></div>
         
         <div className="flex items-center gap-4 relative z-10">
            <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <UserRound className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
                <p className="text-primary-100 text-xs font-medium uppercase tracking-wider">Đang theo dõi</p>
                <h2 className="text-2xl font-bold">{patient.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs bg-primary-800 px-2 py-0.5 rounded text-primary-200">{patient.medicalCondition || 'Sức khỏe'}</span>
                </div>
            </div>
            <a href={`tel:${patient.phone}`} className="w-10 h-10 bg-white text-primary-700 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform">
                <Phone className="w-5 h-5" />
            </a>
         </div>

         {/* Quick Stats */}
         <div className="flex mt-6 gap-4">
             <div className="flex-1 bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                <p className="text-primary-100 text-xs mb-1">Tuân thủ thuốc</p>
                <p className="text-xl font-bold">{adherenceRate}%</p>
             </div>
             <div className="flex-1 bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                <p className="text-primary-100 text-xs mb-1">Tình trạng</p>
                <p className="text-xl font-bold flex items-center gap-1">
                    Ổn định <CheckCircleIcon className="w-4 h-4" />
                </p>
             </div>
         </div>
      </div>

      <div className="px-1 mb-2">
         <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Lịch uống thuốc hôm nay</h3>
      </div>
      
      {/* Reuse Dashboard Component in ReadOnly Mode */}
      <Dashboard targetUserId={patient._id} readOnly={true} hideSOS={true} />

      <div className="px-1 mt-8 mb-2">
         <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Báo cáo sức khỏe</h3>
      </div>

      {/* Reuse Report Component */}
      <ReportScreen targetUserId={patient._id} />

    </div>
  );
};

// Simple icon helper
const CheckCircleIcon = (props: any) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
)
