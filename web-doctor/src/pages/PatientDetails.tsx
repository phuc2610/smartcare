import { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Activity, AlertTriangle, Apple, Calendar, FileText } from 'lucide-react';

export default function PatientDetails() {
  const { patientId } = useParams();
  const navigate = useNavigate();

  const [patient, setPatient] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  
  // Date Picker States
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);
  
  const [startDate, setStartDate] = useState(thirtyDaysAgo.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    fetchProfile();
    fetchVitals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

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
    const diffTime = Math.abs(eDate.getTime() - sDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    
    if (diffDays > 31) {
      alert("Chỉ được phép xuất dữ liệu tối đa 30 ngày!");
      return;
    }

    try {
      const res = await axios.get(`http://localhost:4000/api/doctors/patients/${patientId}/vitals`, {
        params: { startDate, endDate }
      });
      setLogs(res.data.logs);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Lỗi khi tải dữ liệu');
    }
  };

  if (!patient) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Đang tải dữ liệu...</div>;
  }

  // Phân loại Logs
  const symptoms = logs.filter(l => l.type === 'symptom');
  const meals = logs.filter(l => l.type === 'meal');
  const exercises = logs.filter(l => l.type === 'exercise');

  return (
    <div style={{ backgroundColor: '#F3F4F6', minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* Navbar */}
      <nav style={{ backgroundColor: '#1E3A8A', color: 'white', padding: '1rem 2rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', alignItems: 'center' }}>
          <button onClick={() => navigate('/dashboard')} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: '0.6rem 1.2rem', borderRadius: '8px', fontWeight: '500', transition: 'all 0.2s' }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
            onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}>
            <ArrowLeft size={20} /> Về Trang chủ
          </button>
        </div>
      </nav>

      <main style={{ padding: '3rem 2rem', maxWidth: '1440px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '2rem' }}>
          
          {/* CỘT TRÁI: Hồ sơ bệnh án */}
          <div style={{ gridColumn: 'span 4' }}>
            <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '1.5rem' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#E0E7FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4338CA', fontWeight: 'bold', fontSize: '2rem' }}>
                  {patient.name.charAt(0)}
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800', color: '#111827' }}>{patient.name}</h2>
                  <p style={{ margin: '0.25rem 0 0 0', color: '#6B7280', fontSize: '0.95rem' }}>Bệnh nhân SmartCare</p>
                </div>
              </div>

              <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: '1.5rem' }}>
                <div style={{ marginBottom: '1rem' }}>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#6B7280', fontWeight: '600', textTransform: 'uppercase' }}>Chẩn đoán hiện tại</p>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '1.1rem', color: '#B45309', fontWeight: '600', backgroundColor: '#FEF3C7', display: 'inline-block', padding: '4px 12px', borderRadius: '9999px' }}>
                    {patient.medicalCondition || 'Bình thường'}
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#6B7280' }}>Chiều cao</p>
                    <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600', color: '#111827' }}>{patient.height ? `${patient.height} cm` : '---'}</p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#6B7280' }}>Cân nặng</p>
                    <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600', color: '#111827' }}>{patient.weight ? `${patient.weight} kg` : '---'}</p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#6B7280' }}>Điện thoại</p>
                    <p style={{ margin: 0, fontSize: '1rem', fontWeight: '500', color: '#111827' }}>{patient.phone}</p>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#6B7280' }}>Email</p>
                    <p style={{ margin: 0, fontSize: '1rem', fontWeight: '500', color: '#111827' }}>{patient.email || '---'}</p>
                  </div>
                </div>

                <button 
                  onClick={() => navigate(`/prescribe/${patientId}`)}
                  style={{ width: '100%', backgroundColor: '#1E40AF', color: '#fff', border: 'none', padding: '1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '1rem', transition: 'all 0.2s', boxShadow: '0 4px 6px -1px rgba(30, 64, 175, 0.4)' }}
                  onMouseOver={e => e.currentTarget.style.backgroundColor = '#1E3A8A'}
                  onMouseOut={e => e.currentTarget.style.backgroundColor = '#1E40AF'}
                >
                  Phát Hành Đơn Thuốc
                </button>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: Báo cáo sức khoẻ */}
          <div style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Thanh điều khiển Bộ Lọc */}
            <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'flex-end', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>Từ Ngày</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #D1D5DB', width: '100%', boxSizing: 'border-box', outline: 'none' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>Đến Ngày</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #D1D5DB', width: '100%', boxSizing: 'border-box', outline: 'none' }} />
              </div>
              <div>
                <button onClick={fetchVitals} style={{ backgroundColor: '#10B981', color: '#fff', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.95rem', height: '45px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={18} />
                  Xuất Dữ Liệu
                </button>
              </div>
            </div>

            {/* Khối Triệu chứng */}
            <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <h3 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', color: '#DC2626' }}>
                <AlertTriangle size={24} /> Báo cáo Triệu chứng ({symptoms.length})
              </h3>
              {symptoms.length === 0 ? <p style={{ color: '#6B7280' }}>Không có khai báo triệu chứng nào trong giai đoạn này.</p> : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {symptoms.map(s => (
                    <div key={s._id} style={{ padding: '1rem', border: '1px solid #FEE2E2', backgroundColor: '#FEF2F2', borderRadius: '8px' }}>
                      <div style={{ fontWeight: '600', color: '#991B1B' }}>{s.details?.symptomName || 'Triệu chứng'}</div>
                      <div style={{ fontSize: '0.9rem', color: '#B91C1C', margin: '4px 0' }}>Mức độ: {s.details?.severity}/10</div>
                      <div style={{ fontSize: '0.85rem', color: '#DC2626' }}>{new Date(s.date).toLocaleDateString()} - {s.details?.note}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Khối Dinh Dưỡng */}
            <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <h3 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', color: '#16A34A' }}>
                <Apple size={24} /> Dinh dưỡng ({meals.length})
              </h3>
              {meals.length === 0 ? <p style={{ color: '#6B7280' }}>Không có log bữa ăn.</p> : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {meals.map(m => (
                    <div key={m._id} style={{ padding: '1rem', border: '1px solid #DCFCE7', backgroundColor: '#F0FDF4', borderRadius: '8px' }}>
                      <div style={{ fontWeight: '600', color: '#166534' }}>{m.details?.foodName || 'Bữa ăn'}</div>
                      <div style={{ fontSize: '0.9rem', color: '#15803D', margin: '4px 0' }}>{m.details?.calories || 0} kcal</div>
                      <div style={{ fontSize: '0.85rem', color: '#16A34A' }}>{new Date(m.date).toLocaleDateString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Khối Vận động */}
            <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <h3 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', color: '#2563EB' }}>
                <Activity size={24} /> Vận động ({exercises.length})
              </h3>
              {exercises.length === 0 ? <p style={{ color: '#6B7280' }}>Không có log vận động.</p> : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {exercises.map(e => (
                    <div key={e._id} style={{ padding: '1rem', border: '1px solid #DBEAFE', backgroundColor: '#EFF6FF', borderRadius: '8px' }}>
                      <div style={{ fontWeight: '600', color: '#1E40AF' }}>{e.details?.exerciseType || 'Bài tập'}</div>
                      <div style={{ fontSize: '0.9rem', color: '#1D4ED8', margin: '4px 0' }}>{e.details?.durationMinutes || 0} phút • Đốt cháy: {e.details?.caloriesBurned || 0} kcal</div>
                      <div style={{ fontSize: '0.85rem', color: '#2563EB' }}>{new Date(e.date).toLocaleDateString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
