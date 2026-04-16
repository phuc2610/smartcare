import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Activity, AlertTriangle, Apple, FileText, Calendar, MessageSquare, Send, X, Clock } from 'lucide-react';

export default function PatientDetails() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [patient, setPatient] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);

  // Date Filter
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);
  const [startDate, setStartDate] = useState(thirtyDaysAgo.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);

  // Appointment Modal
  const [showApptModal, setShowApptModal] = useState(false);
  const [apptDate, setApptDate] = useState('');
  const [apptTime, setApptTime] = useState('');
  const [apptNotes, setApptNotes] = useState('');
  const [apptLoading, setApptLoading] = useState(false);

  // Chat Drawer
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [myId, setMyId] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/login'); return; }
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    // Decode doctor's id from token (JWT payload)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setMyId(payload.id || payload._id || payload.userId || '');
    } catch {}

    fetchProfile();
    fetchVitals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  useEffect(() => {
    if (showChat) {
      fetchMessages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showChat]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchProfile = async () => {
    try {
      const res = await axios.get(`http://localhost:4000/api/doctors/patients/${patientId}/profile`);
      setPatient(res.data.patient);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Không thể lấy thông tin bệnh nhân');
    }
  };

  const fetchVitals = async () => {
    const sDate = new Date(startDate);
    const eDate = new Date(endDate);
    const diffDays = Math.ceil(Math.abs(eDate.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 31) { alert('Chỉ được phép xuất dữ liệu tối đa 30 ngày!'); return; }
    try {
      const res = await axios.get(`http://localhost:4000/api/doctors/patients/${patientId}/vitals`, { params: { startDate, endDate } });
      setLogs(res.data.logs);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Lỗi khi tải dữ liệu');
    }
  };

  const fetchMessages = async () => {
    try {
      const res = await axios.get(`http://localhost:4000/api/chat/messages/${patientId}`);
      setMessages(res.data.messages || []);
    } catch {
      setMessages([]);
    }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;
    setChatLoading(true);
    try {
      const res = await axios.post('http://localhost:4000/api/chat/send', { receiverId: patientId, content: chatInput });
      setMessages(prev => [...prev, res.data.message]);
      setChatInput('');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Không thể gửi tin nhắn');
    } finally {
      setChatLoading(false);
    }
  };

  const handleCreateAppointment = async () => {
    if (!apptDate || !apptTime) { alert('Vui lòng chọn ngày và giờ khám!'); return; }
    setApptLoading(true);
    try {
      const doctorProfile = JSON.parse(localStorage.getItem('doctorProfile') || '{}');
      await axios.post('http://localhost:4000/api/appointments', {
        userId: patientId,
        doctorName: doctorProfile.name || 'Bác sĩ SmartCare',
        doctorSpecialty: doctorProfile.doctorProfile?.specialty || '',
        hospitalName: doctorProfile.doctorProfile?.hospital || '',
        appointmentDate: new Date(apptDate + 'T' + apptTime).toISOString(),
        appointmentTime: apptTime,
        notes: apptNotes,
        reminderBefore: 24,
      });
      alert(`✅ Đã đặt lịch tái khám lúc ${apptTime} ngày ${new Date(apptDate).toLocaleDateString('vi-VN')}. Bệnh nhân sẽ nhận thông báo!`);
      setShowApptModal(false);
      setApptDate(''); setApptTime(''); setApptNotes('');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Lỗi khi đặt lịch');
    } finally {
      setApptLoading(false);
    }
  };

  if (!patient) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, border: '4px solid #E5E7EB', borderTop: '4px solid #1E40AF', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
          <p style={{ color: '#6B7280' }}>Đang tải hồ sơ bệnh nhân...</p>
        </div>
      </div>
    );
  }

  const symptoms = logs.filter(l => l.type === 'symptom');
  const meals = logs.filter(l => l.type === 'meal');
  const exercises = logs.filter(l => l.type === 'exercise');

  return (
    <div style={{ backgroundColor: '#F3F4F6', minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>

      {/* Navbar */}
      <nav style={{ backgroundColor: '#1E3A8A', color: 'white', padding: '1rem 2rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => navigate('/dashboard')} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: '0.6rem 1.2rem', borderRadius: '8px', fontWeight: '500', transition: 'all 0.2s' }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
            onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}>
            <ArrowLeft size={20} /> Về Trang chủ
          </button>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setShowApptModal(true)} style={{ background: '#10B981', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: '0.6rem 1.2rem', borderRadius: '8px', fontWeight: '600', transition: 'all 0.2s' }}>
              <Calendar size={18} /> Lên Lịch Tái Khám
            </button>
            <button onClick={() => setShowChat(true)} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: '0.6rem 1.2rem', borderRadius: '8px', fontWeight: '500', transition: 'all 0.2s' }}>
              <MessageSquare size={18} /> Nhắn Tin
            </button>
          </div>
        </div>
      </nav>

      <main style={{ padding: '3rem 2rem', maxWidth: '1440px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '2rem' }}>

          {/* === CỘT TRÁI: Hồ sơ === */}
          <div style={{ gridColumn: 'span 4' }}>
            <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.06)', position: 'sticky', top: '90px' }}>
              {/* Avatar & Name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '1.5rem' }}>
                <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '2rem', boxShadow: '0 4px 12px rgba(102,126,234,0.4)' }}>
                  {patient.name.charAt(0)}
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '800', color: '#111827' }}>{patient.name}</h2>
                  <p style={{ margin: '4px 0 0 0', color: '#6B7280', fontSize: '0.9rem' }}>Bệnh nhân • SmartCare</p>
                </div>
              </div>

              {/* Diagnosis badge */}
              <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#FFFBEB', borderRadius: '10px', border: '1px solid #FDE68A' }}>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#92400E', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Chẩn đoán hiện tại</p>
                <p style={{ margin: 0, fontSize: '1.05rem', color: '#B45309', fontWeight: '700' }}>{patient.medicalCondition || 'Chưa xác định'}</p>
              </div>

              {/* Stats grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
                {[
                  { label: 'Chiều cao', value: patient.height ? `${patient.height} cm` : '---', icon: '📏' },
                  { label: 'Cân nặng', value: patient.weight ? `${patient.weight} kg` : '---', icon: '⚖️' },
                  { label: 'Điện thoại', value: patient.phone, icon: '📞' },
                  { label: 'Email', value: patient.email || '---', icon: '✉️' },
                ].map(item => (
                  <div key={item.label} style={{ padding: '0.75rem', backgroundColor: '#F9FAFB', borderRadius: '8px' }}>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#9CA3AF', marginBottom: '2px' }}>{item.icon} {item.label}</p>
                    <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600', color: '#374151', wordBreak: 'break-word' }}>{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Quick action buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button onClick={() => navigate(`/prescribe/${patientId}`)}
                  style={{ width: '100%', background: 'linear-gradient(135deg, #1E40AF, #3B82F6)', color: '#fff', border: 'none', padding: '1rem', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '1rem', boxShadow: '0 4px 12px rgba(30,64,175,0.35)', transition: 'all 0.2s' }}
                  onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(30,64,175,0.4)'; }}
                  onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(30,64,175,0.35)'; }}>
                  💊 Phát Hành Đơn Thuốc
                </button>
                <button onClick={() => setShowApptModal(true)}
                  style={{ width: '100%', background: 'linear-gradient(135deg, #059669, #10B981)', color: '#fff', border: 'none', padding: '0.9rem', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '0.95rem', boxShadow: '0 4px 12px rgba(5,150,105,0.3)', transition: 'all 0.2s' }}
                  onMouseOver={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                  onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
                  📅 Lên Lịch Tái Khám
                </button>
                <button onClick={() => setShowChat(true)}
                  style={{ width: '100%', background: '#F3F4F6', color: '#374151', border: '1px solid #D1D5DB', padding: '0.9rem', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '0.95rem', transition: 'all 0.2s' }}
                  onMouseOver={e => e.currentTarget.style.backgroundColor = '#E5E7EB'}
                  onMouseOut={e => e.currentTarget.style.backgroundColor = '#F3F4F6'}>
                  💬 Nhắn Tin Bệnh Nhân
                </button>
              </div>
            </div>
          </div>

          {/* === CỘT PHẢI: Báo cáo sức khoẻ === */}
          <div style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* Bộ lọc ngày */}
            <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'flex-end', gap: '1rem', border: '1px solid #E5E7EB' }}>
              <div style={{ flex: '0 0 auto', padding: '10px 14px', backgroundColor: '#EFF6FF', borderRadius: '8px', color: '#1D4ED8' }}>
                <Clock size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#374151', marginBottom: '0.4rem' }}>Từ Ngày</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ padding: '0.7rem', borderRadius: '8px', border: '1px solid #D1D5DB', width: '100%', boxSizing: 'border-box', outline: 'none', fontSize: '0.95rem' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#374151', marginBottom: '0.4rem' }}>Đến Ngày</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ padding: '0.7rem', borderRadius: '8px', border: '1px solid #D1D5DB', width: '100%', boxSizing: 'border-box', outline: 'none', fontSize: '0.95rem' }} />
              </div>
              <button onClick={fetchVitals} style={{ background: 'linear-gradient(135deg, #059669, #10B981)', color: '#fff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', boxShadow: '0 4px 10px rgba(5,150,105,0.3)' }}>
                <FileText size={18} /> Xuất Dữ Liệu
              </button>
            </div>

            {/* Summary chips */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              {[
                { label: 'Triệu chứng', count: symptoms.length, color: '#DC2626', bg: '#FEF2F2', icon: '🚨' },
                { label: 'Dinh dưỡng', count: meals.length, color: '#16A34A', bg: '#F0FDF4', icon: '🥗' },
                { label: 'Vận động', count: exercises.length, color: '#2563EB', bg: '#EFF6FF', icon: '🏃' },
              ].map(s => (
                <div key={s.label} style={{ backgroundColor: s.bg, border: `1px solid ${s.color}20`, padding: '1.25rem', borderRadius: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.8rem', marginBottom: '4px' }}>{s.icon}</div>
                  <div style={{ fontSize: '2rem', fontWeight: '800', color: s.color, lineHeight: 1 }}>{s.count}</div>
                  <div style={{ fontSize: '0.85rem', color: s.color, fontWeight: '600', marginTop: '4px' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Khối Triệu chứng */}
            <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.06)' }}>
              <h3 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.15rem', color: '#991B1B', fontWeight: '700' }}>
                <AlertTriangle size={22} /> Báo cáo Triệu chứng <span style={{ background: '#FEE2E2', color: '#DC2626', padding: '2px 10px', borderRadius: '999px', fontSize: '0.85rem' }}>{symptoms.length}</span>
              </h3>
              {symptoms.length === 0
                ? <p style={{ color: '#9CA3AF', fontStyle: 'italic' }}>Không có khai báo triệu chứng nào trong giai đoạn này.</p>
                : <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {symptoms.map(s => (
                    <div key={s._id} style={{ padding: '1rem 1.25rem', border: '1px solid #FEE2E2', backgroundColor: '#FFF5F5', borderRadius: '10px', borderLeft: '4px solid #DC2626' }}>
                      <div style={{ fontWeight: '700', color: '#991B1B', marginBottom: '4px' }}>{s.details?.symptomName || 'Triệu chứng'}</div>
                      <div style={{ fontSize: '0.9rem', color: '#B91C1C' }}>Mức độ: {s.details?.severity}/10</div>
                      <div style={{ fontSize: '0.8rem', color: '#9CA3AF', marginTop: '4px' }}>{new Date(s.date).toLocaleDateString('vi-VN')} • {s.details?.note}</div>
                    </div>
                  ))}
                </div>}
            </div>

            {/* Khối Dinh Dưỡng */}
            <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.06)' }}>
              <h3 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.15rem', color: '#166534', fontWeight: '700' }}>
                <Apple size={22} /> Dinh dưỡng <span style={{ background: '#DCFCE7', color: '#16A34A', padding: '2px 10px', borderRadius: '999px', fontSize: '0.85rem' }}>{meals.length}</span>
              </h3>
              {meals.length === 0
                ? <p style={{ color: '#9CA3AF', fontStyle: 'italic' }}>Không có log bữa ăn nào.</p>
                : <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {meals.map(m => (
                    <div key={m._id} style={{ padding: '1rem 1.25rem', border: '1px solid #DCFCE7', backgroundColor: '#F0FDF4', borderRadius: '10px', borderLeft: '4px solid #10B981' }}>
                      <div style={{ fontWeight: '700', color: '#166534', marginBottom: '4px' }}>{m.details?.foodName || 'Bữa ăn'}</div>
                      <div style={{ fontSize: '0.9rem', color: '#15803D' }}>{m.details?.calories || 0} kcal</div>
                      <div style={{ fontSize: '0.8rem', color: '#9CA3AF', marginTop: '4px' }}>{new Date(m.date).toLocaleDateString('vi-VN')}</div>
                    </div>
                  ))}
                </div>}
            </div>

            {/* Khối Vận động */}
            <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.06)' }}>
              <h3 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.15rem', color: '#1E40AF', fontWeight: '700' }}>
                <Activity size={22} /> Vận động <span style={{ background: '#DBEAFE', color: '#2563EB', padding: '2px 10px', borderRadius: '999px', fontSize: '0.85rem' }}>{exercises.length}</span>
              </h3>
              {exercises.length === 0
                ? <p style={{ color: '#9CA3AF', fontStyle: 'italic' }}>Không có log vận động nào.</p>
                : <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {exercises.map(e => (
                    <div key={e._id} style={{ padding: '1rem 1.25rem', border: '1px solid #DBEAFE', backgroundColor: '#EFF6FF', borderRadius: '10px', borderLeft: '4px solid #3B82F6' }}>
                      <div style={{ fontWeight: '700', color: '#1E40AF', marginBottom: '4px' }}>{e.details?.exerciseType || 'Bài tập'}</div>
                      <div style={{ fontSize: '0.9rem', color: '#1D4ED8' }}>{e.details?.durationMinutes || 0} phút • Đốt: {e.details?.caloriesBurned || 0} kcal</div>
                      <div style={{ fontSize: '0.8rem', color: '#9CA3AF', marginTop: '4px' }}>{new Date(e.date).toLocaleDateString('vi-VN')}</div>
                    </div>
                  ))}
                </div>}
            </div>
          </div>
        </div>
      </main>

      {/* ===== APPOINTMENT MODAL ===== */}
      {showApptModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '20px', padding: '2.5rem', width: '520px', maxWidth: '95vw', boxShadow: '0 25px 60px rgba(0,0,0,0.25)', animation: 'fadeIn 0.2s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800', color: '#111827' }}>📅 Lên Lịch Tái Khám</h2>
                <p style={{ margin: '4px 0 0 0', color: '#6B7280', fontSize: '0.9rem' }}>Đặt lịch cho: <strong>{patient.name}</strong></p>
              </div>
              <button onClick={() => setShowApptModal(false)} style={{ background: '#F3F4F6', border: 'none', cursor: 'pointer', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={18} color="#6B7280" />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '6px', fontSize: '0.9rem' }}>Ngày khám *</label>
                  <input type="date" value={apptDate} onChange={e => setApptDate(e.target.value)} min={new Date().toISOString().split('T')[0]}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '0.8rem', borderRadius: '10px', border: '1.5px solid #D1D5DB', fontSize: '0.95rem', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '6px', fontSize: '0.9rem' }}>Giờ khám *</label>
                  <input type="time" value={apptTime} onChange={e => setApptTime(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '0.8rem', borderRadius: '10px', border: '1.5px solid #D1D5DB', fontSize: '0.95rem', outline: 'none' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '6px', fontSize: '0.9rem' }}>Ghi chú / Lý do tái khám</label>
                <textarea value={apptNotes} onChange={e => setApptNotes(e.target.value)} rows={4}
                  placeholder="VD: Kiểm tra kết quả dùng thuốc sau 2 tuần, tái khám sau phẫu thuật..."
                  style={{ width: '100%', boxSizing: 'border-box', padding: '0.8rem', borderRadius: '10px', border: '1.5px solid #D1D5DB', fontSize: '0.9rem', outline: 'none', resize: 'vertical' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '0.5rem' }}>
                <button onClick={() => setShowApptModal(false)}
                  style={{ padding: '1rem', border: '1.5px solid #D1D5DB', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', backgroundColor: 'white', color: '#374151', fontSize: '0.95rem' }}>
                  Huỷ
                </button>
                <button onClick={handleCreateAppointment} disabled={apptLoading}
                  style={{ padding: '1rem', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', background: 'linear-gradient(135deg, #059669, #10B981)', color: 'white', fontSize: '0.95rem', boxShadow: '0 4px 12px rgba(5,150,105,0.35)', opacity: apptLoading ? 0.7 : 1 }}>
                  {apptLoading ? 'Đang gửi...' : '✅ Xác Nhận Lịch Hẹn'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== CHAT DRAWER ===== */}
      {showChat && (
        <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '380px', backgroundColor: 'white', boxShadow: '-8px 0 40px rgba(0,0,0,0.15)', zIndex: 100, display: 'flex', flexDirection: 'column', animation: 'slideIn 0.25s ease' }}>
          {/* Chat Header */}
          <div style={{ background: 'linear-gradient(135deg, #1E3A8A, #2563EB)', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '1.1rem' }}>
              {patient.name.charAt(0)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: 'white', fontWeight: '700', fontSize: '1rem' }}>{patient.name}</div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem' }}>Tin nhắn bảo mật Y khoa</div>
            </div>
            <button onClick={() => setShowChat(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: '#F8FAFC' }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: '#9CA3AF', padding: '3rem 1rem' }}>
                <MessageSquare size={40} color="#D1D5DB" style={{ margin: '0 auto 1rem' }} />
                <p style={{ fontSize: '0.9rem' }}>Bắt đầu cuộc trò chuyện với<br /><strong>{patient.name}</strong></p>
              </div>
            )}
            {messages.map((msg: any) => {
              const isMe = msg.senderId?._id === myId || msg.senderId === myId;
              return (
                <div key={msg._id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '75%', padding: '0.65rem 1rem', borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    background: isMe ? 'linear-gradient(135deg, #1E40AF, #3B82F6)' : 'white',
                    color: isMe ? 'white' : '#1F2937',
                    boxShadow: isMe ? '0 2px 8px rgba(30,64,175,0.3)' : '0 2px 8px rgba(0,0,0,0.08)',
                    fontSize: '0.9rem', lineHeight: 1.5,
                  }}>
                    <div>{msg.content}</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.65, marginTop: '4px', textAlign: 'right' }}>
                      {new Date(msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '1rem', borderTop: '1px solid #E5E7EB', backgroundColor: 'white', display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
            <textarea
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } }}
              placeholder="Nhập tin nhắn... (Enter để gửi)"
              rows={2}
              style={{ flex: 1, padding: '0.7rem 1rem', borderRadius: '12px', border: '1.5px solid #E5E7EB', outline: 'none', resize: 'none', fontSize: '0.9rem', fontFamily: 'inherit', lineHeight: 1.5 }}
            />
            <button onClick={sendChatMessage} disabled={chatLoading || !chatInput.trim()}
              style={{ background: chatInput.trim() ? 'linear-gradient(135deg, #1E40AF, #3B82F6)' : '#E5E7EB', border: 'none', borderRadius: '12px', padding: '0.7rem', cursor: chatInput.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px', transition: 'all 0.2s', boxShadow: chatInput.trim() ? '0 4px 12px rgba(30,64,175,0.3)' : 'none' }}>
              <Send size={20} color={chatInput.trim() ? 'white' : '#9CA3AF'} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
