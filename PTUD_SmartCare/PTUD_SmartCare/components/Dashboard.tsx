
import React, { useEffect, useState } from 'react';
import { Reminder, ReminderStatus } from '../types';
import { getTodayReminders, updateReminderStatus } from '../services/databaseService';
import { useAuth } from '../contexts/AuthContext';
import { Check, Clock, X } from 'lucide-react';
import { SOSButton } from './SOSButton';
import { RecommendationList } from './RecommendationList';
import { VoiceCommandButton } from './VoiceCommandButton'; // Added

// --- Sub-Component: MedicationItem ---
interface MedicationItemProps {
  item: Reminder;
  onCheck: (id: string) => void;
  readOnly?: boolean;
}

const MedicationItem: React.FC<MedicationItemProps> = ({ item, onCheck, readOnly }) => {
  const isTaken = item.status === ReminderStatus.TAKEN;

  return (
    <div className="mb-3 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between active:bg-gray-50 transition-colors">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary-500" />
          <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
            {new Date(item.scheduledTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        
        <h3 className={`text-lg font-bold ${isTaken ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
          {item.medicationName}
        </h3>
        
        <p className="text-sm text-gray-500">
          {item.dosage} {item.unit}
        </p>
      </div>

      {/* Action Button */}
      {isTaken ? (
        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
          <Check className="w-6 h-6 text-green-600" />
        </div>
      ) : (
        readOnly ? (
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center opacity-50">
             <div className="w-4 h-4 rounded-full border-2 border-gray-400"></div>
          </div>
        ) : (
          <button
            onClick={() => onCheck(item._id)}
            className="w-12 h-12 rounded-full bg-primary-100 border-2 border-primary-200 text-primary-600 flex items-center justify-center shadow-sm active:scale-95 transition-transform"
          >
            <Check className="w-6 h-6" />
          </button>
        )
      )}
    </div>
  );
};

// --- Main Screen: Dashboard ---
interface DashboardProps {
  targetUserId?: string; // Optional: If provided, fetches for this user (Caregiver view)
  readOnly?: boolean;
  hideSOS?: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({ targetUserId, readOnly = false, hideSOS = false }) => {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  // Determine which user ID to use
  const effectiveUserId = targetUserId || user?._id;

  const fetchReminders = () => {
    if (!effectiveUserId) return;
    setLoading(true);
    // Giả lập độ trễ mạng
    setTimeout(() => {
      const data = getTodayReminders(effectiveUserId);
      setReminders(data);
      setLoading(false);
    }, 300);
  };

  useEffect(() => {
    fetchReminders();
  }, [effectiveUserId]);

  const handleCheck = (id: string) => {
    if (readOnly) return;
    updateReminderStatus(id, ReminderStatus.TAKEN);
    fetchReminders();
  };

  // --- VOICE COMMAND HANDLER ---
  const handleVoiceMarkTaken = () => {
     if (readOnly) return;
     // Logic: Mark the first pending reminder as taken
     const pending = reminders.find(r => r.status === ReminderStatus.PENDING);
     if (pending) {
         handleCheck(pending._id);
     }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[200px]">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const pendingReminders = reminders.filter(r => r.status !== ReminderStatus.TAKEN);
  const completedReminders = reminders.filter(r => r.status === ReminderStatus.TAKEN);

  return (
    <div className="animate-fade-in relative">
      {!readOnly && (
        <div className="mb-4 px-1 flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Chào bạn, 👋</h2>
            <p className="text-gray-500 text-sm">Chúc bạn một ngày khỏe mạnh!</p>
          </div>
        </div>
      )}

      {/* VOICE BUTTON (Accessibility) */}
      {!readOnly && <VoiceCommandButton onMarkTaken={handleVoiceMarkTaken} />}

      {/* SOS SECTION - Only show for Patient */}
      {!hideSOS && <SOSButton />}

      {/* RECOMMENDATIONS - Only show for Patient or relevant context */}
      {!hideSOS && <RecommendationList />}

      {/* MEDICATION LIST */}
      <div className="mb-3 px-1 mt-4">
         <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Hôm nay ({pendingReminders.length} thuốc)</h3>
      </div>

      {reminders.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-center bg-white rounded-3xl border border-gray-100 mt-2">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <Check className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-gray-500 font-medium">Hôm nay không có lịch uống thuốc</p>
        </div>
      ) : (
        <>
          {pendingReminders.length > 0 && (
            <div className="flex flex-col mb-6">
              {pendingReminders.map(item => (
                <MedicationItem key={item._id} item={item} onCheck={handleCheck} readOnly={readOnly} />
              ))}
            </div>
          )}

          {completedReminders.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">Đã hoàn thành</h3>
              <div className="flex flex-col opacity-60">
                {completedReminders.map(item => (
                  <MedicationItem key={item._id} item={item} onCheck={() => {}} readOnly={true} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
