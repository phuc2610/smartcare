import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { LogOut, Activity, Package, AlertTriangle, Bell, RefreshCw, BellRing } from 'lucide-react';

export default function Dashboard() {
  const [patients, setPatients]         = useState<any[]>([]);
  const [doctorProfile, setDoctorProfile] = useState<any>(null);
  const [alertSummary, setAlertSummary] = useState<any>(null);
  const [alertLoading, setAlertLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/login'); return; }
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    fetchDashboard();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDashboard = async () => {
    try {
      const [profileRes, patientsRes] = await Promise.all([
        axios.get('http://localhost:4000/api/doctors/profile'),
        axios.get('http://localhost:4000/api/doctors/patients'),
      ]);
      setDoctorProfile(profileRes.data.user);
      setPatients(patientsRes.data.patients);

      // Load alert summary (không chặn UI)
      loadAlerts();
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('token');
        navigate('/login');
      }
    }
  };

  const loadAlerts = async () => {
    try {
      const res = await axios.get('http://localhost:4000/api/alerts/doctor/summary');
      setAlertSummary(res.data);
    } catch {
      setAlertSummary(null);
    }
  };

  const runAnalysis = async () => {
    setAlertLoading(true);
    try {
      await axios.post('http://localhost:4000/api/alerts/analyze-all');
      await loadAlerts();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Lỗi khi phân tích');
    } finally {
      setAlertLoading(false);
    }
  };

  const severityStyle = (s: string) => ({
    error:   { bg: '#FEF2F2', border: '#FECACA', dot: '#EF4444', badge: '#FEE2E2', badgeText: '#DC2626', label: '🔴 Nguy hiểm' },
    warning: { bg: '#FFFBEB', border: '#FDE68A', dot: '#F59E0B', badge: '#FEF3C7', badgeText: '#B45309', label: '🟡 Cảnh báo' },
    info:    { bg: '#EFF6FF', border: '#BFDBFE', dot: '#3B82F6', badge: '#DBEAFE', badgeText: '#1D4ED8', label: '🔵 Thông tin' },
  }[s] || { bg: '#F9FAFB', border: '#E5E7EB', dot: '#9CA3AF', badge: '#F3F4F6', badgeText: '#6B7280', label: s });

  // Gắn patient info vào mỗi row để hiện alert badge
  const getPatientAlertInfo = (patientId: string) =>
    (alertSummary?.patients || []).find((p: any) => p.patientId === patientId);

  return (
    <div style={{ backgroundColor: '#F3F4F6', minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
      `}</style>

      {/* Navbar */}
      <nav style={{ backgroundColor: '#1E3A8A', color: 'white', padding: '1rem 2rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Activity size={32} color="#60A5FA" />
            SmartCare <span style={{ fontWeight: '400', opacity: 0.8, marginLeft: '4px' }}>Clinical</span>
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>{doctorProfile?.name || 'Bác sĩ'}</div>
            </div>
            <button onClick={() => navigate('/drug-catalog')}
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '0.6rem 1.2rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500' }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}>
              <Package size={18} /> Danh Mục Thuốc
            </button>
            <button onClick={() => { localStorage.removeItem('token'); navigate('/login'); }}
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '0.6rem 1.2rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500' }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}>
              <LogOut size={18} /> Đăng xuất
            </button>
          </div>
        </div>
      </nav>

      <main style={{ padding: '2.5rem', maxWidth: '1440px', margin: '0 auto' }}>

        {/* ── Stats row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>

          {/* Patient count */}
          <div style={{ gridColumn: 'span 3', backgroundColor: 'white', padding: '1.75rem', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', borderTop: '3px solid #3B82F6' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ color: '#6B7280', margin: 0, fontSize: '0.9rem', fontWeight: '600', textTransform: 'uppercase' }}>Bệnh nhân</h3>
              <div style={{ padding: '8px', backgroundColor: '#EFF6FF', borderRadius: '8px' }}>
                <Activity size={20} color="#3B82F6" />
              </div>
            </div>
            <p style={{ fontSize: '3rem', fontWeight: '800', margin: 0, color: '#111827', lineHeight: 1 }}>{patients.length}</p>
            <p style={{ margin: '8px 0 0 0', color: '#10B981', fontWeight: '500', fontSize: '0.85rem' }}>đang liên kết</p>
          </div>

          {/* Alert stats */}
          <div style={{ gridColumn: 'span 3', backgroundColor: 'white', padding: '1.75rem', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', borderTop: '3px solid #EF4444' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ color: '#6B7280', margin: 0, fontSize: '0.9rem', fontWeight: '600', textTransform: 'uppercase' }}>Nguy hiểm 🔴</h3>
              <div style={{ padding: '8px', backgroundColor: '#FEF2F2', borderRadius: '8px' }}>
                <AlertTriangle size={20} color="#EF4444" />
              </div>
            </div>
            <p style={{ fontSize: '3rem', fontWeight: '800', margin: 0, color: '#EF4444', lineHeight: 1 }}>{alertSummary?.criticalCount ?? '—'}</p>
            <p style={{ margin: '8px 0 0 0', color: '#6B7280', fontSize: '0.85rem' }}>bệnh nhân cần can thiệp</p>
          </div>

          <div style={{ gridColumn: 'span 3', backgroundColor: 'white', padding: '1.75rem', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', borderTop: '3px solid #F59E0B' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ color: '#6B7280', margin: 0, fontSize: '0.9rem', fontWeight: '600', textTransform: 'uppercase' }}>Cảnh báo 🟡</h3>
              <div style={{ padding: '8px', backgroundColor: '#FFFBEB', borderRadius: '8px' }}>
                <Bell size={20} color="#F59E0B" />
              </div>
            </div>
            <p style={{ fontSize: '3rem', fontWeight: '800', margin: 0, color: '#F59E0B', lineHeight: 1 }}>{alertSummary?.warningCount ?? '—'}</p>
            <p style={{ margin: '8px 0 0 0', color: '#6B7280', fontSize: '0.85rem' }}>cần theo dõi thêm</p>
          </div>

          {/* Link code */}
          <div style={{ gridColumn: 'span 3', backgroundColor: '#1E3A8A', padding: '1.75rem', borderRadius: '16px', boxShadow: '0 4px 15px rgba(30,58,138,0.3)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', fontWeight: '600', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Mã Liên Kết</div>
            <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#60A5FA', letterSpacing: '6px', textAlign: 'center', padding: '0.5rem 0' }}>
              {doctorProfile?.linkCode || '...'}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)', textAlign: 'center' }}>Chia sẻ với bệnh nhân</div>
          </div>
        </div>

        {/* ── Risk Alert Widget ── */}
        <div style={{ backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.06)', marginBottom: '2rem', overflow: 'hidden', border: alertSummary?.criticalCount > 0 ? '1px solid #FECACA' : '1px solid #E5E7EB' }}>
          <div style={{ padding: '1.25rem 1.75rem', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: alertSummary?.criticalCount > 0 ? 'linear-gradient(135deg, #FEF2F2, #FFF5F5)' : 'white' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <BellRing size={22} color={alertSummary?.criticalCount > 0 ? '#EF4444' : '#6B7280'} />
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#111827' }}>
                Cảnh Báo Nguy Cơ Bệnh Nhân
              </h2>
              {alertSummary?.totalPatients > 0 && (
                <span style={{ background: alertSummary.criticalCount > 0 ? '#EF4444' : '#F59E0B', color: 'white', fontSize: '0.78rem', fontWeight: '700', padding: '2px 10px', borderRadius: '999px' }}>
                  {alertSummary.totalPatients} bệnh nhân
                </span>
              )}
            </div>
            <button onClick={runAnalysis} disabled={alertLoading}
              style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '0.6rem 1.2rem', borderRadius: '10px', border: 'none', cursor: alertLoading ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '0.88rem',
                background: alertLoading ? '#E5E7EB' : 'linear-gradient(135deg, #7C3AED, #A855F7)', color: alertLoading ? '#9CA3AF' : 'white',
                boxShadow: alertLoading ? 'none' : '0 4px 10px rgba(124,58,237,0.3)' }}>
              <RefreshCw size={15} style={{ animation: alertLoading ? 'spin 1s linear infinite' : 'none' }} />
              {alertLoading ? 'Đang phân tích...' : '🤖 Phân tích AI'}
            </button>
          </div>

          {!alertSummary || alertSummary.totalPatients === 0 ? (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: '#9CA3AF' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>✅</div>
              <p style={{ margin: 0, fontWeight: '600' }}>Không có cảnh báo nào. Nhấn "Phân tích AI" để quét lại.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem', padding: '1.25rem 1.75rem' }}>
              {alertSummary.patients.slice(0, 6).map((p: any) => {
                const sty = severityStyle(p.maxSeverity);
                return (
                  <div key={p.patientId}
                    style={{ padding: '1.1rem 1.25rem', borderRadius: '12px', backgroundColor: sty.bg, border: `1px solid ${sty.border}`, cursor: 'pointer', transition: 'all 0.2s', animation: 'fadeIn 0.3s ease' }}
                    onClick={() => navigate(`/patients/${p.patientId}`)}
                    onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${sty.dot}20`, border: `2px solid ${sty.dot}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', color: sty.dot, fontSize: '1rem' }}>
                        {p.patientName.charAt(0)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '800', color: '#1E293B', fontSize: '0.95rem' }}>{p.patientName}</div>
                        <div style={{ display: 'inline-block', fontSize: '0.72rem', fontWeight: '700', color: sty.badgeText, background: sty.badge, padding: '1px 8px', borderRadius: '999px', marginTop: '2px' }}>
                          {sty.label}
                        </div>
                      </div>
                      <span style={{ fontSize: '0.78rem', color: sty.dot, fontWeight: '700', background: sty.badge, padding: '2px 8px', borderRadius: '6px' }}>
                        {p.alerts.length} cảnh báo
                      </span>
                    </div>
                    {/* Show top alert */}
                    {p.alerts[0] && (
                      <div style={{ fontSize: '0.82rem', color: '#4B5563', paddingLeft: '46px', lineHeight: 1.4 }}>
                        {p.alerts[0].title}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Patient list ── */}
        <div style={{ backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, color: '#111827', fontSize: '1.25rem', fontWeight: '700' }}>Danh sách Y bạ Bệnh nhân</h2>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#F9FAFB', color: '#6B7280', textAlign: 'left', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600' }}>Bệnh nhân</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600' }}>Liên hệ</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600' }}>Chẩn đoán</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600' }}>Nguy cơ</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600' }}>Kết nối từ</th>
                <th style={{ padding: '1rem 1.5rem', fontWeight: '600', textAlign: 'right' }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {patients.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '4rem', textAlign: 'center', color: '#9CA3AF', fontSize: '1rem' }}>
                    Chưa có bệnh nhân nào kết nối. Hãy chia sẻ mã phòng khám!
                  </td>
                </tr>
              ) : patients.map((p: any) => {
                const alertInfo = getPatientAlertInfo(p.patientId);
                const sty = alertInfo ? severityStyle(alertInfo.maxSeverity) : null;
                return (
                  <tr key={p.linkId} style={{ borderBottom: '1px solid #F3F4F6', transition: 'background 0.15s' }}
                    onMouseOver={e => e.currentTarget.style.backgroundColor = '#F9FAFB'}
                    onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: 38, height: 38, borderRadius: '50%', backgroundColor: sty ? sty.bg : '#E0E7FF', border: sty ? `2px solid ${sty.dot}` : '2px solid transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: sty ? sty.dot : '#4338CA', fontWeight: '800', fontSize: '1.1rem' }}>
                          {p.name.charAt(0)}
                        </div>
                        <span style={{ fontWeight: '700', color: '#111827' }}>{p.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem', color: '#4B5563' }}>{p.phone}</td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      <span style={{ backgroundColor: '#FEF3C7', color: '#B45309', padding: '0.35rem 0.85rem', borderRadius: '999px', fontSize: '0.82rem', fontWeight: '600' }}>
                        {p.condition || 'Chưa xác định'}
                      </span>
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem' }}>
                      {sty ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', backgroundColor: sty.badge, color: sty.badgeText, padding: '0.35rem 0.85rem', borderRadius: '999px', fontSize: '0.82rem', fontWeight: '700' }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: sty.dot, animation: alertInfo.maxSeverity === 'error' ? 'pulse 1.5s infinite' : 'none' }} />
                          {alertInfo.alerts.length} alert
                        </span>
                      ) : (
                        <span style={{ color: '#10B981', fontSize: '0.82rem', fontWeight: '600' }}>✅ Bình thường</span>
                      )}
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem', color: '#6B7280', fontSize: '0.9rem' }}>
                      {new Date(p.linkedAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button onClick={() => navigate(`/patients/${p.patientId}`)}
                          style={{ backgroundColor: '#F3F4F6', color: '#374151', border: '1px solid #D1D5DB', padding: '0.6rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.88rem', transition: 'all 0.2s' }}
                          onMouseOver={e => e.currentTarget.style.backgroundColor = '#E5E7EB'}
                          onMouseOut={e => e.currentTarget.style.backgroundColor = '#F3F4F6'}>
                          Hồ Sơ
                        </button>
                        <button onClick={() => navigate(`/prescribe/${p.patientId}`)}
                          style={{ backgroundColor: '#1E40AF', color: '#fff', border: 'none', padding: '0.6rem 1.25rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.88rem', transition: 'all 0.2s' }}
                          onMouseOver={e => { e.currentTarget.style.backgroundColor = '#1E3A8A'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                          onMouseOut={e => { e.currentTarget.style.backgroundColor = '#1E40AF'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                          Kê Đơn
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </main>
    </div>
  );
}
