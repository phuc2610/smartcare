import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post('https://smartcare-uqgi.onrender.com/api/auth/login', { phone, password });
      if (res.data.user.role !== 'DOCTOR') {
        alert('Tài khoản này không phải là Bác sĩ!');
        return;
      }
      localStorage.setItem('token', res.data.token);
      // Lưu profile để dùng cho đặt lịch hẹn
      localStorage.setItem('doctorProfile', JSON.stringify(res.data.user));
      window.location.href = '/dashboard';
    } catch (err: any) {
      alert(err.response?.data?.error || 'Đăng nhập thất bại');
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* Cột trái: Banner giới thiệu */}
      <div style={{ flex: 1, background: 'linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', padding: '3rem' }}>
        <div style={{ maxWidth: '600px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '3.5rem', fontWeight: '800', marginBottom: '1.5rem', letterSpacing: '-1px' }}>SmartCare Clinical</h1>
          <p style={{ fontSize: '1.25rem', lineHeight: '1.7', opacity: 0.9 }}>
            Nền tảng quản lý y tế chuyên nghiệp. Kết nối trực tiếp với bệnh nhân, theo dõi chỉ số sinh tồn và phát hành đơn thuốc điện tử một cách bảo mật, nhanh chóng.
          </p>
        </div>
      </div>

      {/* Cột phải: Form đăng nhập */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB' }}>
        <div style={{ width: '100%', maxWidth: '440px', padding: '2.5rem', background: '#fff', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)' }}>
          <h2 style={{ color: '#111827', fontSize: '2rem', marginBottom: '0.5rem', fontWeight: '700' }}>Chào mừng trở lại</h2>
          <p style={{ color: '#6B7280', marginBottom: '2.5rem', fontSize: '1rem' }}>Đăng nhập vào hệ thống dành cho Bác sĩ</p>
          
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151', fontSize: '0.9rem' }}>Số điện thoại</label>
              <input 
                type="text" 
                placeholder="Nhập số điện thoại" 
                value={phone} onChange={e => setPhone(e.target.value)} 
                style={{ width: '100%', boxSizing: 'border-box', padding: '1rem', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '1rem', outline: 'none', transition: 'border-color 0.2s' }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151', fontSize: '0.9rem' }}>Mật khẩu</label>
              <input 
                type="password" 
                placeholder="••••••••" 
                value={password} onChange={e => setPassword(e.target.value)} 
                style={{ width: '100%', boxSizing: 'border-box', padding: '1rem', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '1rem', outline: 'none', transition: 'border-color 0.2s' }}
              />
            </div>
            
            <button type="submit" style={{ marginTop: '0.5rem', padding: '1rem', borderRadius: '8px', backgroundColor: '#1E40AF', color: 'white', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '1rem', transition: 'background-color 0.2s' }}
              onMouseOver={e => e.currentTarget.style.backgroundColor = '#1E3A8A'}
              onMouseOut={e => e.currentTarget.style.backgroundColor = '#1E40AF'}
            >
              Đăng Nhập Quản Trị
            </button>
          </form>
          
          <div style={{ marginTop: '2.5rem', textAlign: 'center', fontSize: '1rem', color: '#4B5563' }}>
            Chưa có tài khoản? <Link to="/register" style={{ color: '#2563EB', textDecoration: 'none', fontWeight: '600' }}>Tạo hồ sơ Bác sĩ mới</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
