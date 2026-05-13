import { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

export default function Register() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const formatPhoneForServer = (p: string) => {
    let cleaned = p.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '84' + cleaned.slice(1);
    } else if (!cleaned.startsWith('84')) {
      cleaned = '84' + cleaned;
    }
    return '+' + cleaned;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      alert('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    setLoading(true);
    try {
      const formattedPhone = formatPhoneForServer(phone);
      const res = await axios.post('https://smartcare-uqgi.onrender.com/api/auth/register', { 
        name, phone: formattedPhone, password, role: 'DOCTOR'
      });
      
      localStorage.setItem('token', res.data.token);
      // Lưu profile để dùng cho đặt lịch hẹn
      localStorage.setItem('doctorProfile', JSON.stringify(res.data.user));
      alert('Đăng ký thành công!');
      window.location.href = '/dashboard';
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || err.message || 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* Cột trái: Banner giới thiệu */}
      <div style={{ flex: 1, background: 'linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', padding: '3rem' }}>
        <div style={{ maxWidth: '600px', textAlign: 'center' }}>
          <img src="/src/assets/logo.png" alt="SmartCare Logo" style={{ height: '80px', marginBottom: '1rem' }} />
          <h1 style={{ fontSize: '3.5rem', fontWeight: '800', marginBottom: '1.5rem', letterSpacing: '-1px' }}>SmartCare Clinical</h1>
          <p style={{ fontSize: '1.25rem', lineHeight: '1.7', opacity: 0.9 }}>
            Khởi tạo không gian làm việc số cho chuyên gia y tế. Quản lý hồ sơ bệnh nhân, chia sẻ y bạ bảo mật tuyệt đối, kê đơn thuốc và theo dõi tiến trình hồi phục chuẩn Y khoa.
          </p>
        </div>
      </div>

      {/* Cột phải: Form đăng ký */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB' }}>
        <div style={{ width: '100%', maxWidth: '440px', padding: '2.5rem', background: '#fff', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)' }}>
          <h2 style={{ color: '#111827', fontSize: '2rem', marginBottom: '0.5rem', fontWeight: '700' }}>Tạo Danh tính Bác sĩ</h2>
          <p style={{ color: '#6B7280', marginBottom: '2.5rem', fontSize: '1rem' }}>Tham gia mạng lưới SmartCare Clinical ngay hôm nay</p>
          
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151', fontSize: '0.9rem' }}>Họ và Tên (Kèm học hàm, học vị)</label>
              <input required type="text" placeholder="VD: ThS. BS. Nguyễn Văn A" value={name} onChange={e => setName(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '1rem', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '1rem', outline: 'none' }} />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151', fontSize: '0.9rem' }}>Số điện thoại liên lạc</label>
              <input required type="text" placeholder="09xxxxxxx" value={phone} onChange={e => setPhone(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '1rem', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '1rem', outline: 'none' }} />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151', fontSize: '0.9rem' }}>Mật khẩu bảo mật</label>
              <input required type="password" placeholder="Tối thiểu 6 ký tự" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '1rem', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '1rem', outline: 'none' }} />
            </div>

            <button disabled={loading} type="submit" style={{ marginTop: '0.5rem', padding: '1rem', borderRadius: '8px', backgroundColor: loading ? '#9CA3AF' : '#1E40AF', color: 'white', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: '600', fontSize: '1rem', transition: 'background-color 0.2s' }}>
              {loading ? 'Đang tạo tài khoản...' : 'Đăng ký Bác sĩ'}
            </button>
          </form>
          
          <div style={{ marginTop: '2.5rem', textAlign: 'center', fontSize: '1rem', color: '#4B5563' }}>
            Đã có tài khoản? <Link to="/login" style={{ color: '#2563EB', textDecoration: 'none', fontWeight: '600' }}>Về màn hình Đăng nhập</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
