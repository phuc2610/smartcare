
import React, { useEffect, useState } from 'react';
import { getWeeklyStats, getRecentHealthLogs, getComprehensiveReport } from '../services/databaseService';
import { generateHTML, printToFileAsync } from '../services/exportService';
import { WeeklyStats, HealthLog } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Flame, Activity, TrendingUp, Calendar, FileText, ChevronDown, Loader2 } from 'lucide-react';

// --- Sub-Component: CSS Bar Chart ---
export const WeeklyChart = ({ data }: { data: WeeklyStats[] }) => {
  const maxVal = Math.max(...data.map(d => Math.max(d.caloriesIn, d.caloriesOut)), 500); // Normalize height

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6">
      <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-primary-600" />
        Biểu đồ Calo (7 ngày qua)
      </h3>
      
      <div className="h-48 flex items-end justify-between gap-2">
        {data.map((day, index) => {
          const heightIn = (day.caloriesIn / maxVal) * 100;
          const heightOut = (day.caloriesOut / maxVal) * 100;

          return (
            <div key={index} className="flex-1 flex flex-col items-center gap-1 group relative">
              {/* Tooltip */}
              <div className="absolute -top-10 bg-gray-800 text-white text-[10px] p-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                In: {day.caloriesIn} | Out: {day.caloriesOut}
              </div>

              <div className="w-full flex gap-0.5 items-end h-full">
                <div style={{ height: `${heightIn}%` }} className="flex-1 bg-blue-400 rounded-t-sm opacity-80 hover:opacity-100 transition-opacity"></div>
                <div style={{ height: `${heightOut}%` }} className="flex-1 bg-orange-400 rounded-t-sm opacity-80 hover:opacity-100 transition-opacity"></div>
              </div>
              <span className="text-[10px] text-gray-400 font-medium mt-1">{day.date}</span>
            </div>
          );
        })}
      </div>
      
      <div className="flex justify-center gap-4 mt-4">
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <div className="w-3 h-3 bg-blue-400 rounded-sm"></div> Nạp vào
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <div className="w-3 h-3 bg-orange-400 rounded-sm"></div> Tiêu hao
        </div>
      </div>
    </div>
  );
};

// --- Sub-Component: Log Item ---
export const LogItem = ({ log }: { log: HealthLog }) => {
  let icon = <Activity className="w-5 h-5" />;
  let color = 'bg-gray-100 text-gray-600';
  let title = '';
  let sub = '';

  if (log.type === 'meal') {
    icon = <Flame className="w-5 h-5" />;
    color = 'bg-blue-100 text-blue-600';
    title = log.details.foodName || 'Bữa ăn';
    sub = `+${log.details.calories} kcal`;
  } else if (log.type === 'exercise') {
    icon = <TrendingUp className="w-5 h-5" />;
    color = 'bg-orange-100 text-orange-600';
    title = log.details.exerciseType || 'Vận động';
    sub = `-${log.details.caloriesBurned} kcal • ${log.details.durationMinutes} phút`;
  } else {
    color = 'bg-red-100 text-red-600';
    title = log.details.symptomName || 'Triệu chứng';
    sub = `Mức độ: ${log.details.severity}/10`;
  }

  return (
    <div className="flex items-center gap-3 p-3 border-b border-gray-50 last:border-0">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${color}`}>
        {icon}
      </div>
      <div className="flex-1">
        <p className="font-bold text-gray-800 text-sm">{title}</p>
        <p className="text-xs text-gray-500">{new Date(log.date).toLocaleString('vi-VN')}</p>
      </div>
      <div className="text-right">
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${log.type === 'exercise' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
          {sub}
        </span>
      </div>
    </div>
  );
};

interface ReportScreenProps {
  targetUserId?: string;
}

type FilterType = 'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM';

// --- Main Screen ---
export const ReportScreen: React.FC<ReportScreenProps> = ({ targetUserId }) => {
  const { user } = useAuth();
  
  // Data States
  const [stats, setStats] = useState<WeeklyStats[]>([]);
  const [recentLogs, setRecentLogs] = useState<HealthLog[]>([]);
  
  // Filter States
  const [filterType, setFilterType] = useState<FilterType>('WEEK');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  
  // Export State
  const [exportLoading, setExportLoading] = useState(false);

  const effectiveUserId = targetUserId || user?._id;

  // 1. Fetch Basic Data (Chart + Logs) on Mount
  useEffect(() => {
    if (!effectiveUserId) return;
    const data = getWeeklyStats(effectiveUserId);
    setStats(data);
    setRecentLogs(getRecentHealthLogs(effectiveUserId));
  }, [effectiveUserId]);

  // 2. Export Logic with Advanced Filters
  const handleExport = async () => {
     if (!effectiveUserId || !user) return;
     setExportLoading(true);

     let start = new Date();
     let end = new Date();

     // Determine Dates
     if (filterType === 'TODAY') {
         // Start/End are today
     } else if (filterType === 'WEEK') {
         start.setDate(end.getDate() - 7);
     } else if (filterType === 'MONTH') {
         start.setDate(1); // 1st of current month
     } else if (filterType === 'CUSTOM') {
         if (!customStart || !customEnd) {
             alert("Vui lòng chọn ngày.");
             setExportLoading(false);
             return;
         }
         start = new Date(customStart);
         end = new Date(customEnd);
     }

     try {
         // Fetch Aggregated Report
         const summary = getComprehensiveReport(effectiveUserId, start, end);
         // Generate HTML
         const html = generateHTML(user, summary);
         // Print
         await printToFileAsync(html);
     } catch (err) {
         console.error(err);
         alert("Lỗi xuất báo cáo.");
     } finally {
         setExportLoading(false);
     }
  };

  const setFilter = (type: FilterType) => {
      setFilterType(type);
      setShowCustom(type === 'CUSTOM');
  };

  return (
    <div className="animate-fade-in pb-24">
      {/* Date Filter Controls */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6">
          <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-gray-600" /> Bộ lọc thời gian
              </h3>
          </div>
          
          <div className="flex gap-2 mb-4">
             {['TODAY', 'WEEK', 'MONTH'].map((t) => (
                 <button
                    key={t}
                    onClick={() => setFilter(t as FilterType)}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${filterType === t ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                 >
                    {t === 'TODAY' ? 'Hôm nay' : t === 'WEEK' ? 'Tuần này' : 'Tháng này'}
                 </button>
             ))}
             <button
                onClick={() => setFilter('CUSTOM')}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${filterType === 'CUSTOM' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'}`}
             >
                 ...
             </button>
          </div>

          {showCustom && (
              <div className="flex gap-3 mb-4 animate-fade-in">
                  <div className="flex-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Từ ngày</label>
                      <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="w-full p-2 bg-gray-50 rounded border text-sm" />
                  </div>
                  <div className="flex-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Đến ngày</label>
                      <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="w-full p-2 bg-gray-50 rounded border text-sm" />
                  </div>
              </div>
          )}

          <button
            onClick={handleExport}
            disabled={exportLoading}
            className="w-full py-3 bg-gray-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
             {exportLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
             Xuất báo cáo chi tiết
          </button>
      </div>

      {/* Chart Section (Visual Only - Always Weekly) */}
      <WeeklyChart data={stats} />

      {/* Recent History Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <h3 className="font-bold text-gray-800">Hoạt động gần đây</h3>
        </div>
        <div className="flex flex-col">
          {recentLogs.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">Chưa có dữ liệu ghi nhận nào.</div>
          ) : (
            recentLogs.map(log => <LogItem key={log._id} log={log} />)
          )}
        </div>
      </div>
    </div>
  );
};
