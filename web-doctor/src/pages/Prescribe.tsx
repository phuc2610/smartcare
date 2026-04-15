import { useState } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pill, Sun, CloudSun, Moon } from 'lucide-react';

export default function Prescribe() {
  const { patientId } = useParams();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('DAILY');
  const [sessions, setSessions] = useState<string[]>([]);
  const [mealTiming, setMealTiming] = useState('AFTER_MEAL');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');

  const toggleSession = (session: string) => {
    setSessions(prev =>
      prev.includes(session) ? prev.filter(s => s !== session) : [...prev, session]
    );
  };

  const sessionConfig = [
    { key: 'MORNING', label: 'Sáng', hint: '6:00 – 9:00', icon: Sun, color: '#F59E0B', bg: '#FFFBEB' },
    { key: 'NOON', label: 'Trưa', hint: '10:00 – 13:00', icon: CloudSun, color: '#F97316', bg: '#FFF7ED' },
    { key: 'EVENING', label: 'Tối', hint: '17:00 – 21:00', icon: Moon, color: '#6366F1', bg: '#EEF2FF' },
  ];

  const handlePrescribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sessions.length === 0) {
      alert('Vui lòng chọn ít nhất một buổi uống thuốc!');
      return;
    }
    try {
      await axios.post(`http://localhost:4000/api/doctors/patients/${patientId}/prescriptions`, {
        name,
        dosage,
        frequency,
        sessions,
        mealTiming,
        startDate: new Date(startDate).toISOString(),
        endDate: endDate ? new Date(endDate).toISOString() : null,
        notes
      });

      alert('Đã gửi đơn thuốc điện tử xuống thiết bị của bệnh nhân!');
      navigate('/dashboard');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Gửi thất bại');
    }
  };

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

      <main style={{ padding: '3rem 2rem', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ backgroundColor: 'white', padding: '3rem', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '2.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid #F3F4F6' }}>
            <div style={{ padding: '12px', backgroundColor: '#EFF6FF', borderRadius: '12px' }}>
              <Pill size={32} color="#2563EB" />
            </div>
            <div>
              <h2 style={{ margin: 0, color: '#111827', fontSize: '1.5rem', fontWeight: '800' }}>Kê Đơn Thuốc Mới</h2>
              <p style={{ margin: '0.25rem 0 0 0', color: '#6B7280', fontSize: '0.95rem' }}>Đơn thuốc sẽ được đẩy trực tiếp về ứng dụng của bệnh nhân</p>
            </div>
          </div>

          <form onSubmit={handlePrescribe} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {/* Tên thuốc */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.95rem', fontWeight: '600', color: '#374151' }}>Tên thuốc (Biệt dược)</label>
              <input required value={name} onChange={e => setName(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '1rem', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '1rem', outline: 'none' }} placeholder="VD: Panadol Extra 500mg" />
            </div>

            {/* Liều lượng */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.95rem', fontWeight: '600', color: '#374151' }}>Liều lượng</label>
              <input required value={dosage} onChange={e => setDosage(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '1rem', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '1rem', outline: 'none' }} placeholder="VD: 1 viên/lần" />
            </div>

            {/* Tần suất */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.95rem', fontWeight: '600', color: '#374151' }}>Tần suất</label>
              <select value={frequency} onChange={e => setFrequency(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '1rem', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '1rem', outline: 'none', backgroundColor: '#fff' }}>
                <option value="DAILY">Uống mỗi ngày</option>
                <option value="EVERY_OTHER_DAY">Uống cách ngày</option>
              </select>
            </div>

            {/* Buổi uống thuốc */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.95rem', fontWeight: '600', color: '#374151' }}>Buổi uống thuốc <span style={{ color: '#EF4444' }}>*</span></label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                {sessionConfig.map(s => {
                  const active = sessions.includes(s.key);
                  const Icon = s.icon;
                  return (
                    <button
                      type="button"
                      key={s.key}
                      onClick={() => toggleSession(s.key)}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                        padding: '1.25rem 1rem', borderRadius: '12px', cursor: 'pointer',
                        border: active ? `2px solid ${s.color}` : '2px solid #E5E7EB',
                        backgroundColor: active ? s.bg : '#FAFAFA',
                        transition: 'all 0.2s',
                        boxShadow: active ? `0 4px 12px ${s.color}25` : 'none',
                      }}
                    >
                      <Icon size={28} color={active ? s.color : '#9CA3AF'} />
                      <span style={{ fontWeight: '700', fontSize: '1rem', color: active ? s.color : '#6B7280' }}>{s.label}</span>
                      <span style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>{s.hint}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Hình thức uống */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.95rem', fontWeight: '600', color: '#374151' }}>Hình thức uống</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[
                  { key: 'BEFORE_MEAL', label: 'Uống trước ăn', emoji: '🍽️', desc: 'Trước bữa ăn 30 phút' },
                  { key: 'AFTER_MEAL', label: 'Uống sau ăn no', emoji: '✅', desc: 'Sau khi ăn xong' },
                ].map(opt => {
                  const active = mealTiming === opt.key;
                  return (
                    <button
                      type="button"
                      key={opt.key}
                      onClick={() => setMealTiming(opt.key)}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                        padding: '1.25rem 1rem', borderRadius: '12px', cursor: 'pointer',
                        border: active ? '2px solid #2563EB' : '2px solid #E5E7EB',
                        backgroundColor: active ? '#EFF6FF' : '#FAFAFA',
                        transition: 'all 0.2s',
                        boxShadow: active ? '0 4px 12px rgba(37,99,235,0.15)' : 'none',
                      }}
                    >
                      <span style={{ fontSize: '1.5rem' }}>{opt.emoji}</span>
                      <span style={{ fontWeight: '700', fontSize: '0.95rem', color: active ? '#2563EB' : '#6B7280' }}>{opt.label}</span>
                      <span style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>{opt.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Ngày bắt đầu */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.95rem', fontWeight: '600', color: '#374151' }}>Ngày bắt đầu</label>
              <input type="date" required value={startDate} onChange={e => setStartDate(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '1rem', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '1rem', outline: 'none', backgroundColor: '#fff' }} />
            </div>

            {/* Ngày kết thúc */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.95rem', fontWeight: '600', color: '#374151' }}>Ngày kết thúc (Không bắt buộc)</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '1rem', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '1rem', outline: 'none', backgroundColor: '#fff' }} />
            </div>

            {/* Lời dặn bác sĩ */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.95rem', fontWeight: '600', color: '#374151' }}>Lời dặn của Bác sĩ</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} style={{ width: '100%', boxSizing: 'border-box', padding: '1rem', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '1rem', outline: 'none', resize: 'vertical' }} placeholder="VD: Uống sau khi ăn no. Nếu có phản ứng bất thường vui lòng gọi lại ngay." />
            </div>

            {/* Submit */}
            <div style={{ gridColumn: 'span 2', marginTop: '1.5rem' }}>
              <button type="submit" style={{ width: '100%', padding: '1.25rem', backgroundColor: '#10B981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '1.1rem', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.4)' }}
                onMouseOver={e => { e.currentTarget.style.backgroundColor = '#059669'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseOut={e => { e.currentTarget.style.backgroundColor = '#10B981'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                Phát Hành Đơn Thuốc
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
