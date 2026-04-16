import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Activity, AlertTriangle, Apple, FileText, Calendar, MessageSquare, Send, X, Clock, Stethoscope, ChevronDown, ChevronUp, Pill } from 'lucide-react';

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

  // Medical Records
  const [activeTab, setActiveTab] = useState<'vitals' | 'records' | 'adherence'>('vitals');
  const [medRecords, setMedRecords] = useState<any[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null);

  // Adherence
  const [adherence, setAdherence] = useState<any>(null);
  const [adherenceLoading, setAdherenceLoading] = useState(false);

  // Alerts
  const [patientAlerts, setPatientAlerts] = useState<any[]>([]);
  const [alertRunning, setAlertRunning] = useState(false);

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
    fetchMedRecords();
    fetchAdherence();
    fetchPatientAlerts();
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

  const fetchMedRecords = async () => {
    setRecordsLoading(true);
    try {
      const res = await axios.get(`http://localhost:4000/api/medical-records/${patientId}?limit=20`);
      setMedRecords(res.data.records || []);
    } catch {
      setMedRecords([]);
    } finally {
      setRecordsLoading(false);
    }
  };

  const fetchAdherence = async () => {
    setAdherenceLoading(true);
    try {
      const res = await axios.get(`http://localhost:4000/api/doctors/patients/${patientId}/adherence`);
      setAdherence(res.data);
    } catch {
      setAdherence(null);
    } finally {
      setAdherenceLoading(false);
    }
  };

  const fetchPatientAlerts = async () => {
    try {
      const res = await axios.get(`http://localhost:4000/api/alerts/patient/${patientId}`);
      setPatientAlerts(res.data.alerts || []);
    } catch {
      setPatientAlerts([]);
    }
  };

  const runPatientAnalysis = async () => {
    setAlertRunning(true);
    try {
      await axios.post(`http://localhost:4000/api/alerts/analyze/${patientId}`);
      await fetchPatientAlerts();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Lỗi phân tích');
    } finally {
      setAlertRunning(false);
    }
  };

  const markAlertRead = async (alertId: string) => {
    try {
      await axios.patch(`http://localhost:4000/api/alerts/${alertId}/read`);
      setPatientAlerts(prev => prev.map(a => a._id === alertId ? { ...a, isRead: true } : a));
    } catch {}
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

              {/* === AI Risk Alert Panel === */}
              <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: patientAlerts.filter(a => a.severity === 'error').length > 0 ? '#FEF2F2' : '#F9FAFB', borderRadius: '12px', border: patientAlerts.filter(a => a.severity === 'error').length > 0 ? '1px solid #FECACA' : '1px solid #E5E7EB' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: '800', color: patientAlerts.length > 0 ? '#991B1B' : '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    🤖 AI Risk Alerts {patientAlerts.filter(a => !a.isRead).length > 0 && (
                      <span style={{ background: '#EF4444', color: 'white', fontSize: '0.7rem', padding: '1px 6px', borderRadius: '999px', marginLeft: '4px' }}>
                        {patientAlerts.filter(a => !a.isRead).length}
                      </span>
                    )}
                  </span>
                  <button onClick={runPatientAnalysis} disabled={alertRunning}
                    style={{ fontSize: '0.72rem', fontWeight: '700', padding: '3px 10px', borderRadius: '6px', border: 'none', cursor: alertRunning ? 'not-allowed' : 'pointer', background: alertRunning ? '#E5E7EB' : 'linear-gradient(135deg, #7C3AED, #A855F7)', color: alertRunning ? '#9CA3AF' : 'white' }}>
                    {alertRunning ? '...' : '⚡ Quét'}
                  </button>
                </div>
                {patientAlerts.length === 0 ? (
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#9CA3AF', textAlign: 'center' }}>✅ Chưa có cảnh báo</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {patientAlerts.slice(0, 5).map((alert: any) => {
                      const colors = { error: ['#FEF2F2','#EF4444','#991B1B'], warning: ['#FFFBEB','#F59E0B','#B45309'], info: ['#EFF6FF','#3B82F6','#1D4ED8'] }[alert.severity as string] || ['#F9FAFB','#9CA3AF','#6B7280'];
                      return (
                        <div key={alert._id}
                          style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', backgroundColor: colors[0], borderLeft: `3px solid ${colors[1]}`, opacity: alert.isRead ? 0.6 : 1, cursor: 'pointer' }}
                          onClick={() => markAlertRead(alert._id)}>
                          <div style={{ fontSize: '0.8rem', fontWeight: '700', color: colors[2], marginBottom: '2px' }}>{alert.title}</div>
                          <div style={{ fontSize: '0.72rem', color: colors[2], opacity: 0.8 }}>{new Date(alert.createdAt).toLocaleDateString('vi-VN')}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* === CỘT PHẢI: Tab === */}
          <div style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* Tab Switcher */}
            <div style={{ display: 'flex', gap: '8px', backgroundColor: 'white', padding: '6px', borderRadius: '14px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', border: '1px solid #E5E7EB' }}>
              {([
                { key: 'vitals',    label: '📊 Nhật Ký Sức Khoẻ' },
                { key: 'records',   label: '🏥 Lịch Sử Khám' },
                { key: 'adherence', label: '💊 Tuân Thủ Thuốc' },
              ] as const).map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  style={{ flex: 1, padding: '0.7rem 1rem', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '0.9rem', transition: 'all 0.2s',
                    background: activeTab === tab.key ? 'linear-gradient(135deg, #1E40AF, #3B82F6)' : 'transparent',
                    color: activeTab === tab.key ? 'white' : '#6B7280',
                    boxShadow: activeTab === tab.key ? '0 4px 12px rgba(30,64,175,0.3)' : 'none',
                  }}>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ===== TAB: TUÂN THỦ THUỐC ===== */}
            {activeTab === 'adherence' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                {adherenceLoading && (
                  <div style={{ textAlign: 'center', padding: '3rem', color: '#6B7280' }}>
                    <div style={{ width: 36, height: 36, border: '4px solid #E5E7EB', borderTop: '4px solid #1E40AF', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
                    Đang tải dữ liệu tuân thủ...
                  </div>
                )}

                {!adherenceLoading && !adherence && (
                  <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '3rem', textAlign: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.06)' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💊</div>
                    <p style={{ color: '#6B7280' }}>Chưa có dữ liệu tuân thủ thuốc.<br />Bệnh nhân cần được kê đơn và sử dụng app để ghi nhận.</p>
                  </div>
                )}

                {!adherenceLoading && adherence && (() => {
                  const r7  = adherence.adherenceRate7d;
                  const r30 = adherence.adherenceRate30d;
                  const rateColor = (r: number | null) => r === null ? '#9CA3AF' : r >= 80 ? '#10B981' : r >= 50 ? '#F59E0B' : '#EF4444';
                  const rateLabel = (r: number | null) => r === null ? 'N/A' : r >= 80 ? 'Tốt' : r >= 50 ? 'Trung bình' : 'Kém';

                  return (
                    <>
                      {/* Tổng quan */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem' }}>
                        {[
                          { label: '7 ngày qua', value: r7 !== null ? `${r7}%` : 'N/A', sub: rateLabel(r7), color: rateColor(r7) },
                          { label: '30 ngày qua', value: r30 !== null ? `${r30}%` : 'N/A', sub: rateLabel(r30), color: rateColor(r30) },
                          { label: 'Thuốc đang dùng', value: adherence.activeMedications ?? 0, sub: 'loại thuốc', color: '#3B82F6' },
                          { label: 'Bỏ liều (7 ngày)', value: adherence.missedDoses?.length ?? 0, sub: 'lần bỏ thuốc', color: adherence.missedDoses?.length > 0 ? '#EF4444' : '#10B981' },
                        ].map(stat => (
                          <div key={stat.label} style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '14px', boxShadow: '0 4px 15px rgba(0,0,0,0.06)', borderTop: `3px solid ${stat.color}`, textAlign: 'center' }}>
                            <div style={{ fontSize: '2rem', fontWeight: '800', color: stat.color, lineHeight: 1 }}>{stat.value}</div>
                            <div style={{ fontSize: '0.78rem', fontWeight: '600', color: stat.color, margin: '4px 0 6px', background: `${stat.color}15`, padding: '2px 8px', borderRadius: '999px', display: 'inline-block' }}>{stat.sub}</div>
                            <div style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>{stat.label}</div>
                          </div>
                        ))}
                      </div>

                      {/* Biểu đồ 7 ngày (pure CSS bar chart) */}
                      {adherence.dailyData?.length > 0 && (
                        <div style={{ backgroundColor: 'white', padding: '1.75rem', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.06)' }}>
                          <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1rem', fontWeight: '800', color: '#1E293B' }}>
                            📈 Biểu đồ tuân thủ 7 ngày
                          </h3>
                          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', height: '140px', paddingBottom: '8px', borderBottom: '2px solid #E5E7EB' }}>
                            {adherence.dailyData.map((day: any, di: number) => {
                              const rate = day.rate ?? 0;
                              const barH = rate > 0 ? `${Math.max(rate * 1.3, 10)}px` : '4px';
                              const bc = rate >= 80 ? '#10B981' : rate >= 50 ? '#F59E0B' : rate > 0 ? '#EF4444' : '#E5E7EB';
                              return (
                                <div key={di} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%', justifyContent: 'flex-end' }}>
                                  <div style={{ fontSize: '0.72rem', fontWeight: '700', color: bc }}>{day.rate !== null ? `${day.rate}%` : '-'}</div>
                                  <div style={{ width: '100%', height: barH, backgroundColor: bc, borderRadius: '6px 6px 0 0', transition: 'height 0.5s ease', minHeight: '4px' }} />
                                  <div style={{ fontSize: '0.68rem', color: '#9CA3AF', textAlign: 'center', marginTop: '6px', lineHeight: 1.2 }}>{day.label}</div>
                                </div>
                              );
                            })}
                          </div>
                          <div style={{ display: 'flex', gap: '16px', marginTop: '12px', justifyContent: 'center' }}>
                            {[['#10B981','≥ 80% Tốt'],['#F59E0B','50-79% TB'],['#EF4444','< 50% Kém']].map(([c, l]) => (
                              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <div style={{ width: 10, height: 10, borderRadius: '3px', backgroundColor: c }} />
                                <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>{l}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Theo từng thuốc */}
                      {adherence.byMedication?.length > 0 && (
                        <div style={{ backgroundColor: 'white', padding: '1.75rem', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.06)' }}>
                          <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1rem', fontWeight: '800', color: '#1E293B' }}>💊 Tuân thủ theo từng thuốc (30 ngày)</h3>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {adherence.byMedication.map((med: any) => {
                              const rc = rateColor(med.adherenceRate);
                              const pct = med.adherenceRate ?? 0;
                              return (
                                <div key={med.medicationId}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                    <div>
                                      <span style={{ fontWeight: '700', color: '#1E293B', fontSize: '0.9rem' }}>{med.name}</span>
                                      <span style={{ marginLeft: '8px', fontSize: '0.8rem', color: '#9CA3AF' }}>{med.dosage}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <span style={{ fontSize: '0.78rem', color: '#9CA3AF' }}>✅ {med.taken} / ❌ {med.skipped} / ⏳ {med.pending}</span>
                                      <span style={{ fontWeight: '800', fontSize: '0.95rem', color: rc, background: `${rc}15`, padding: '2px 10px', borderRadius: '999px' }}>
                                        {med.adherenceRate !== null ? `${med.adherenceRate}%` : 'N/A'}
                                      </span>
                                    </div>
                                  </div>
                                  <div style={{ height: '8px', backgroundColor: '#F3F4F6', borderRadius: '999px', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${pct}%`, backgroundColor: rc, borderRadius: '999px', transition: 'width 0.8s ease' }} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Liều bỏ gần đây */}
                      {adherence.missedDoses?.length > 0 && (
                        <div style={{ backgroundColor: 'white', padding: '1.75rem', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.06)', border: '1px solid #FEE2E2' }}>
                          <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1rem', fontWeight: '800', color: '#991B1B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            ⚠️ Liều bỏ gần đây (7 ngày) <span style={{ background: '#FEE2E2', color: '#DC2626', padding: '2px 10px', borderRadius: '999px', fontSize: '0.8rem' }}>{adherence.missedDoses.length}</span>
                          </h3>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {adherence.missedDoses.slice(0, 10).map((d: any, di: number) => (
                              <div key={di} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0.7rem 1rem', backgroundColor: '#FFF5F5', borderRadius: '10px', border: '1px solid #FECACA', borderLeft: '4px solid #EF4444' }}>
                                <span style={{ fontSize: '1.2rem' }}>❌</span>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: '700', color: '#991B1B', fontSize: '0.88rem' }}>{d.medicationName}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>{new Date(d.date).toLocaleDateString('vi-VN')}</div>
                                  <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>{{ MORNING: 'Sáng', NOON: 'Trưa', EVENING: 'Tối' }[d.session as string] || d.session}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {adherence.missedDoses?.length === 0 && adherence.activeMedications > 0 && (
                        <div style={{ backgroundColor: '#F0FDF4', borderRadius: '16px', padding: '2rem', textAlign: 'center', border: '1px solid #BBF7D0' }}>
                          <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🎉</div>
                          <p style={{ color: '#166534', fontWeight: '700', margin: 0 }}>Bệnh nhân không bỏ liều nào trong 7 ngày qua!</p>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

            {/* ===== TAB: LỊCH SỬ KHÁM ===== */}
            {activeTab === 'records' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#1E293B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Stethoscope size={20} color="#1E40AF" /> Hồ sơ khám bệnh <span style={{ background: '#DBEAFE', color: '#1D4ED8', padding: '2px 10px', borderRadius: '999px', fontSize: '0.8rem' }}>{medRecords.length}</span>
                  </h3>
                  <button onClick={() => navigate(`/prescribe/${patientId}`)}
                    style={{ background: 'linear-gradient(135deg, #059669, #10B981)', color: 'white', border: 'none', padding: '0.7rem 1.2rem', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 10px rgba(5,150,105,0.3)' }}>
                    + Tạo Hồ Sơ Khám Mới
                  </button>
                </div>

                {recordsLoading && (
                  <div style={{ textAlign: 'center', padding: '3rem', color: '#6B7280' }}>
                    <div style={{ width: 36, height: 36, border: '4px solid #E5E7EB', borderTop: '4px solid #1E40AF', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
                    Đang tải lịch sử khám...
                  </div>
                )}

                {!recordsLoading && medRecords.length === 0 && (
                  <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '3rem', textAlign: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.06)' }}>
                    <Stethoscope size={48} color="#D1D5DB" style={{ margin: '0 auto 1rem' }} />
                    <p style={{ color: '#6B7280', marginBottom: '1rem' }}>Chưa có hồ sơ khám nào.<br />Tạo hồ sơ khám đầu tiên cho bệnh nhân này.</p>
                    <button onClick={() => navigate(`/prescribe/${patientId}`)}
                      style={{ background: 'linear-gradient(135deg, #1E40AF, #3B82F6)', color: 'white', border: 'none', padding: '0.8rem 1.5rem', borderRadius: '10px', cursor: 'pointer', fontWeight: '700' }}>
                      💊 Kê Đơn Lần Đầu
                    </button>
                  </div>
                )}

                {!recordsLoading && medRecords.map((rec: any) => {
                  const isOpen = expandedRecord === rec._id;
                  const vitals = rec.vitalSigns || {};
                  const hasVitals = Object.values(vitals).some(v => v !== null && v !== '' && v !== undefined);
                  return (
                    <div key={rec._id} style={{ backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.06)', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
                      {/* Record header */}
                      <div onClick={() => setExpandedRecord(isOpen ? null : rec._id)}
                        style={{ padding: '1.25rem 1.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          background: isOpen ? 'linear-gradient(135deg, #EFF6FF, #DBEAFE)' : 'white',
                          borderBottom: isOpen ? '1px solid #BFDBFE' : 'none' }}
                        onMouseOver={e => !isOpen && (e.currentTarget.style.background = '#F9FAFB')}
                        onMouseOut={e => !isOpen && (e.currentTarget.style.background = 'white')}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'linear-gradient(135deg, #1E40AF, #3B82F6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Stethoscope size={22} color="white" />
                          </div>
                          <div>
                            <div style={{ fontWeight: '800', fontSize: '1rem', color: '#111827', marginBottom: '2px' }}>{rec.diagnosis}</div>
                            <div style={{ fontSize: '0.82rem', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span>📅 {new Date(rec.createdAt).toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })}</span>
                              {rec.icdCode && <span style={{ background: '#EFF6FF', color: '#1D4ED8', padding: '1px 8px', borderRadius: '6px', fontWeight: '600' }}>ICD: {rec.icdCode}</span>}
                              <span style={{ background: '#F0FDF4', color: '#16A34A', padding: '1px 8px', borderRadius: '6px', fontWeight: '600' }}>{(rec.prescriptionIds || []).length} thuốc</span>
                            </div>
                          </div>
                        </div>
                        {isOpen ? <ChevronUp size={20} color="#6B7280" /> : <ChevronDown size={20} color="#6B7280" />}
                      </div>

                      {/* Record detail */}
                      {isOpen && (
                        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', animation: 'fadeIn 0.2s ease' }}>
                          {/* Triệu chứng */}
                          {rec.symptoms?.length > 0 && (
                            <div>
                              <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', marginBottom: '8px' }}>🚨 Triệu chứng</div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {rec.symptoms.map((s: any, si: number) => {
                                  const c = s.severity <= 3 ? '#10B981' : s.severity <= 6 ? '#F59E0B' : '#EF4444';
                                  return <span key={si} style={{ padding: '4px 12px', borderRadius: '999px', fontSize: '0.82rem', fontWeight: '600', backgroundColor: c + '18', color: c, border: `1px solid ${c}30` }}>{s.name} ({s.severity}/10)</span>;
                                })}
                              </div>
                            </div>
                          )}

                          {/* Dấu hiệu sinh tồn */}
                          {hasVitals && (
                            <div>
                              <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', marginBottom: '8px' }}>❤️ Dấu hiệu sinh tồn</div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                                {[
                                  { key: 'bloodPressure', label: 'Huyết áp', unit: 'mmHg' },
                                  { key: 'heartRate', label: 'Nhịp tim', unit: 'bpm' },
                                  { key: 'temperature', label: 'Nhiệt độ', unit: '°C' },
                                  { key: 'weight', label: 'Cân nặng', unit: 'kg' },
                                  { key: 'spO2', label: 'SpO₂', unit: '%' },
                                  { key: 'bloodSugar', label: 'Đường huyết', unit: 'mmol/L' },
                                ].filter(v => vitals[v.key] !== null && vitals[v.key] !== undefined && vitals[v.key] !== '').map(v => (
                                  <div key={v.key} style={{ padding: '0.6rem 0.8rem', backgroundColor: '#F8FAFF', borderRadius: '8px', border: '1px solid #DBEAFE' }}>
                                    <div style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '2px' }}>{v.label}</div>
                                    <div style={{ fontWeight: '700', color: '#1E40AF', fontSize: '0.95rem' }}>{vitals[v.key]} <span style={{ fontSize: '0.7rem', fontWeight: '400' }}>{v.unit}</span></div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Đơn thuốc */}
                          {rec.prescriptionIds?.length > 0 && (
                            <div>
                              <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', marginBottom: '8px' }}>💊 Đơn thuốc kê</div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {rec.prescriptionIds.map((med: any, mi: number) => (
                                  <div key={mi} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0.65rem 1rem', backgroundColor: '#F0FDF4', borderRadius: '8px', border: '1px solid #BBF7D0' }}>
                                    <Pill size={16} color="#16A34A" />
                                    <div style={{ flex: 1 }}>
                                      <span style={{ fontWeight: '700', color: '#166534' }}>{med.name || med}</span>
                                      {med.dosage && <span style={{ fontSize: '0.82rem', color: '#6B7280', marginLeft: '8px' }}>{med.dosage}</span>}
                                    </div>
                                    {med.sessions?.length > 0 && (
                                      <span style={{ fontSize: '0.78rem', color: '#16A34A', background: '#DCFCE7', padding: '2px 8px', borderRadius: '6px' }}>
                                        {med.sessions.map((s: string) => ({ MORNING: 'Sáng', NOON: 'Trưa', EVENING: 'Tối' }[s] || s)).join('/')}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Ghi chú + tái khám */}
                          {(rec.note || rec.followUpDate) && (
                            <div style={{ padding: '0.9rem 1rem', backgroundColor: '#FFFBEB', borderRadius: '10px', border: '1px solid #FDE68A' }}>
                              {rec.note && <p style={{ margin: '0 0 4px 0', fontSize: '0.88rem', color: '#92400E' }}>📝 {rec.note}</p>}
                              {rec.followUpDate && <p style={{ margin: 0, fontSize: '0.88rem', color: '#B45309', fontWeight: '600' }}>📅 Hẹn tái khám: {new Date(rec.followUpDate).toLocaleDateString('vi-VN')}</p>}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ===== TAB: NHẬT KÝ SỨC KHOẺ ===== */}
            {activeTab === 'vitals' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

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
            )}
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
