import React from 'react';
import { Activity, PlusCircle, List, BarChart2, Link, User, MessageCircle, MapPin, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';

interface HeaderProps {
  currentPage: string;
  onNavigate: (page: 'dashboard' | 'add' | 'tracking' | 'report' | 'link' | 'profile' | 'chat' | 'map' | 'wellness') => void;
}

// Mô phỏng Navigation Bar của Mobile App
export const Header: React.FC<HeaderProps> = ({ currentPage, onNavigate }) => {
  const { user } = useAuth();
  const isCaregiver = user?.role === UserRole.CAREGIVER;

  const getTitle = () => {
    switch(currentPage) {
      case 'dashboard': return isCaregiver ? 'Theo dõi người thân' : 'Lịch uống thuốc';
      case 'add': return 'Thêm thuốc mới';
      case 'tracking': return 'Theo dõi sức khỏe';
      case 'report': return 'Báo cáo tổng quan';
      case 'link': return isCaregiver ? 'Kết nối tài khoản' : 'Mã liên kết';
      case 'profile': return 'Hồ sơ cá nhân';
      case 'chat': return 'Trợ lý AI';
      case 'map': return 'Bản đồ Y tế';
      case 'wellness': return 'Sức khỏe tinh thần';
      default: return 'SmartCare';
    }
  };

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="bg-white shadow-sm sticky top-0 z-50 px-4 py-3 flex items-center justify-between border-b border-gray-100">
        <h1 className="text-lg font-bold text-gray-800 tracking-tight">
          {getTitle()}
        </h1>
        <div className="flex items-center gap-2">
             {/* Map Icon */}
             <button 
                onClick={() => onNavigate('map')}
                className={`p-2 rounded-full ${currentPage === 'map' ? 'bg-blue-50 text-blue-600' : 'text-gray-400'}`}
            >
                <MapPin className="w-6 h-6" />
            </button>
            
            {/* Wellness Icon (New) */}
            <button 
                onClick={() => onNavigate('wellness')}
                className={`p-2 rounded-full ${currentPage === 'wellness' ? 'bg-purple-50 text-purple-600' : 'text-gray-400'}`}
                title="Thư giãn"
            >
                <Sparkles className="w-6 h-6" />
            </button>

            {!isCaregiver && (
                <button 
                    onClick={() => onNavigate('chat')}
                    className={`p-2 rounded-full ${currentPage === 'chat' ? 'bg-blue-50 text-blue-600' : 'text-gray-400'}`}
                >
                    <MessageCircle className="w-6 h-6" />
                </button>
            )}
            <button 
                onClick={() => onNavigate('profile')}
                className={`p-2 rounded-full ${currentPage === 'profile' ? 'bg-primary-50 text-primary-600' : 'text-gray-400'}`}
            >
                <User className="w-6 h-6" />
            </button>
        </div>
      </div>

      {/* Mobile Bottom Tab Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe pt-2 px-2 flex justify-around items-center z-50 h-16 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        
        <button
          onClick={() => onNavigate('dashboard')}
          className={`flex flex-col items-center gap-1 w-16 ${
            currentPage === 'dashboard' ? 'text-primary-600' : 'text-gray-400'
          }`}
        >
          <List className="w-6 h-6" />
          <span className="text-[10px] font-medium">Trang chủ</span>
        </button>

        {!isCaregiver && (
          <button
            onClick={() => onNavigate('tracking')}
            className={`flex flex-col items-center gap-1 w-16 ${
              currentPage === 'tracking' ? 'text-primary-600' : 'text-gray-400'
            }`}
          >
            <Activity className="w-6 h-6" />
            <span className="text-[10px] font-medium">Theo dõi</span>
          </button>
        )}

        {/* Center Button: Add (Patient) or Link (Caregiver) */}
        <div className="relative -top-5">
          <button
            onClick={() => onNavigate(isCaregiver ? 'link' : 'add')}
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 ${
              (currentPage === 'add' || currentPage === 'link')
                ? 'bg-primary-700 text-white' 
                : 'bg-primary-600 text-white'
            }`}
          >
            {isCaregiver ? <Link className="w-7 h-7" /> : <PlusCircle className="w-8 h-8" />}
          </button>
        </div>

        {!isCaregiver && (
          <button
            onClick={() => onNavigate('report')}
            className={`flex flex-col items-center gap-1 w-16 ${
               currentPage === 'report' ? 'text-primary-600' : 'text-gray-400'
            }`}
          >
            <BarChart2 className="w-6 h-6" />
            <span className="text-[10px] font-medium">Báo cáo</span>
          </button>
        )}

        {/* For Patient: Link Account Tab. For Caregiver: Maybe Report or just empty space */}
        {!isCaregiver ? (
            <button
            onClick={() => onNavigate('link')}
            className={`flex flex-col items-center gap-1 w-16 ${
                currentPage === 'link' ? 'text-primary-600' : 'text-gray-400'
            }`}
            >
            <Link className="w-6 h-6" />
            <span className="text-[10px] font-medium">Liên kết</span>
            </button>
        ) : (
             // Placeholder to balance layout for Caregiver
            <button className="flex flex-col items-center gap-1 w-16 opacity-0 pointer-events-none">
                 <div className="w-6 h-6" />
            </button>
        )}
      </div>
    </>
  );
};