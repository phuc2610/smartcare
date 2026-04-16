import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { LogOut, Activity } from 'lucide-react';

export default function Dashboard() {
  const [patients, setPatients] = useState([]);
  const [doctorProfile, setDoctorProfile] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return navigate('/login');
        
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        const profileRes = await axios.get('http://localhost:4000/api/doctors/profile');
        setDoctorProfile(profileRes.data.user);
        
        const patientsRes = await axios.get('http://localhost:4000/api/doctors/patients');
        setPatients(patientsRes.data.patients);
      } catch (err: any) {
        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.removeItem('token');
          navigate('/login');
        }
      }
    };
    fetchDashboard();
  }, [navigate]);

  return (
    <div style={{ backgroundColor: '#F3F4F6', minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Navbar chuyên nghiệp */}
      <nav style={{ backgroundColor: '#1E3A8A', color: 'white', padding: '1rem 2rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '12px', letterSpacing: '-0.5px' }}>
            <Activity size={32} color="#60A5FA" /> 
            SmartCare <span style={{ fontWeight: '400', opacity: 0.8, marginLeft: '4px' }}>Clinical</span>
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>{doctorProfile?.name || 'Bác sĩ'}</div>
              <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>Ban Giám Đốc | Khoa Nội</div>
            </div>
            <button 
              onClick={() => { localStorage.removeItem('token'); navigate('/login'); }}
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '0.6rem 1.2rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500', transition: 'all 0.2s' }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            >
              <LogOut size={18} /> Đăng xuất
            </button>
          </div>
        </div>
      </nav>

      <main style={{ padding: '2.5rem', maxWidth: '1440px', margin: '0 auto' }}>
        
        {/* Analytics Card */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '2rem', marginBottom: '2.5rem' }}>
          
          <div style={{ gridColumn: 'span 4', backgroundColor: 'white', padding: '2rem', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ color: '#6B7280', margin: 0, fontSize: '1rem', fontWeight: '600', textTransform: 'uppercase' }}>Bệnh nhân nội trú</h3>
              <div style={{ padding: '8px', backgroundColor: '#EFF6FF', borderRadius: '8px' }}>
                <Activity size={24} color="#3B82F6" />
              </div>
            </div>
            <p style={{ fontSize: '3.5rem', fontWeight: '800', margin: 0, color: '#111827', lineHeight: '1' }}>{patients.length}</p>
            <p style={{ margin: '1rem 0 0 0', color: '#10B981', fontWeight: '500', fontSize: '0.9rem' }}>+12% so với tháng trước</p>
          </div>
          
          <div style={{ gridColumn: 'span 8', backgroundColor: 'white', padding: '2rem', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\\"60\\" height=\\"60\\" viewBox=\\"0 0 60 60\\" xmlns=\\"http://www.w3.org/2000/svg\\"%3E%3Cg fill=\\"none\\" fill-rule=\\"evenodd\\"%3E%3Cg fill=\\"%233b82f6\\" fill-opacity=\\"0.05\\"%3E%3Cpath d=\\"M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\\"%3E%3C/path%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}>
             <div>
               <h3 style={{ color: '#4B5563', margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: '500' }}>Mã Liên Kết Phòng Khám</h3>
               <p style={{ fontSize: '0.95rem', color: '#6B7280', margin: 0, maxWidth: '400px', lineHeight: '1.5' }}>
                  Yêu cầu bệnh nhân nhập mã định danh này trên ứng dụng SmartCare Mobile để hệ thống thiết lập đường truyền hồ sơ y tế bảo mật.
               </p>
             </div>
             <div style={{ textAlign: 'right' }}>
               <div style={{ padding: '1rem 2rem', border: '2px dashed #93C5FD', borderRadius: '12px', backgroundColor: '#EFF6FF', display: 'inline-block' }}>
                 <p style={{ fontSize: '3rem', fontWeight: '900', margin: 0, color: '#1D4ED8', letterSpacing: '4px' }}>
                    {doctorProfile?.linkCode || '...'}
                 </p>
               </div>
             </div>
          </div>
        </div>

        {/* Patient Triage List */}
        <div style={{ backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff' }}>
            <h2 style={{ margin: 0, color: '#111827', fontSize: '1.25rem', fontWeight: '700' }}>Danh sách Y bạ Bệnh nhân</h2>
          </div>
          
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#F9FAFB', color: '#6B7280', textAlign: 'left', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '1.25rem 2rem', fontWeight: '600' }}>Bệnh nhân</th>
                <th style={{ padding: '1.25rem 2rem', fontWeight: '600' }}>Liên hệ</th>
                <th style={{ padding: '1.25rem 2rem', fontWeight: '600' }}>Chẩn đoán AI (Sơ bộ)</th>
                <th style={{ padding: '1.25rem 2rem', fontWeight: '600' }}>Kết nối từ</th>
                <th style={{ padding: '1.25rem 2rem', fontWeight: '600', textAlign: 'right' }}>Quyết định Y khoa</th>
              </tr>
            </thead>
            <tbody>
              {patients.length === 0 ? (
                 <tr>
                   <td colSpan={5} style={{ padding: '4rem 2rem', textAlign: 'center', color: '#9CA3AF', fontSize: '1.1rem' }}>
                     Chưa có bệnh nhân nào kết nối. Hãy chia sẻ mã phòng khám của bạn!
                   </td>
                 </tr>
              ) : (
                patients.map((p: any) => (
                  <tr key={p.linkId} style={{ borderBottom: '1px solid #F3F4F6', transition: 'background-color 0.2s' }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#F9FAFB'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <td style={{ padding: '1.5rem 2rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#E0E7FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4338CA', fontWeight: 'bold', fontSize: '1.2rem' }}>
                          {p.name.charAt(0)}
                        </div>
                        <span style={{ fontWeight: '600', color: '#111827', fontSize: '1.05rem' }}>{p.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '1.5rem 2rem', color: '#4B5563', fontSize: '1rem' }}>{p.phone}</td>
                    <td style={{ padding: '1.5rem 2rem' }}>
                      <span style={{ backgroundColor: '#FEF3C7', color: '#B45309', padding: '0.4rem 1rem', borderRadius: '9999px', fontSize: '0.85rem', fontWeight: '600' }}>
                        {p.condition || 'Chưa xác định'}
                      </span>
                    </td>
                    <td style={{ padding: '1.5rem 2rem', color: '#6B7280', fontSize: '0.95rem' }}>{new Date(p.linkedAt).toLocaleDateString('vi-VN')}</td>
                    <td style={{ padding: '1.5rem 2rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button 
                          onClick={() => navigate(`/patients/${p.patientId}`)}
                          style={{ backgroundColor: '#F3F4F6', color: '#374151', border: '1px solid #D1D5DB', padding: '0.75rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.95rem', transition: 'all 0.2s' }}
                          onMouseOver={e => { e.currentTarget.style.backgroundColor = '#E5E7EB'; }}
                          onMouseOut={e => { e.currentTarget.style.backgroundColor = '#F3F4F6'; }}
                        >
                          Hồ Sơ
                        </button>
                        <button 
                          onClick={() => navigate(`/prescribe/${p.patientId}`)}
                          style={{ backgroundColor: '#1E40AF', color: '#fff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.95rem', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}
                          onMouseOver={e => { e.currentTarget.style.backgroundColor = '#1E3A8A'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                          onMouseOut={e => { e.currentTarget.style.backgroundColor = '#1E40AF'; e.currentTarget.style.transform = 'translateY(0)'; }}
                        >
                          Kê Đơn
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
