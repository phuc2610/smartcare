import { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

export default function Register() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:4000/api/auth/register', { 
        name, phone, password, role: 'DOCTOR' 
      });
      alert('Đăng ký bước 1 thành công. Vui lòng xem mã OTP trong tab chạy Server (mô phỏng SMS).');
      setStep(2);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Đăng ký thất bại');
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:4000/api/auth/otp/verify', {
        phone, otp
      });
      localStorage.setItem('token', res.data.token);
      alert('Đăng ký & Kích hoạt thành công!');
      window.location.href = '/dashboard';
    } catch (err: any) {
      alert(err.response?.data?.error || 'Xác thực OTP thất bại');
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* Cột trái: Banner giới thiệu */}
      <div style={{ flex: 1, background: 'linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', padding: '3rem' }}>
        <div style={{ maxWidth: '600px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '3.5rem', fontWeight: '800', marginBottom: '1.5rem', letterSpacing: '-1px' }}>Phòng khám Thông minh</h1>
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
          
          {step === 1 ? (
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

              <button type="submit" style={{ marginTop: '0.5rem', padding: '1rem', borderRadius: '8px', backgroundColor: '#1E40AF', color: 'white', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '1rem', transition: 'background-color 0.2s' }}>
                Tiếp Tục: Xác thực SĐT
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ padding: '1.25rem', backgroundColor: '#EFF6FF', borderRadius: '8px', border: '1px solid #BFDBFE' }}>
                <p style={{ margin: 0, color: '#1E40AF', fontSize: '0.9rem', lineHeight: '1.5' }}>
                  Hệ thống đã gửi một mã OTP mô phỏng vào <b>Terminal Server</b> cho số điện thoại {phone}. Hãy kiểm tra và nhập mã đó xuống đây.
                </p>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151', fontSize: '0.9rem', textAlign: 'center' }}>Mã Kích Hoạt OTP</label>
                <input required type="text" placeholder="••••" value={otp} onChange={e => setOtp(e.target.value)} maxLength={4} style={{ width: '100%', boxSizing: 'border-box', padding: '1rem', borderRadius: '8px', border: '1px solid #D1D5DB', textAlign: 'center', letterSpacing: '8px', fontSize: '1.5rem', fontWeight: 'bold', outline: 'none' }} />
              </div>

              <button type="submit" style={{ marginTop: '0.5rem', padding: '1rem', borderRadius: '8px', backgroundColor: '#10B981', color: 'white', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '1rem', transition: 'background-color 0.2s' }}>
                Kích Hoạt Tài Khoản Bác Sĩ
              </button>
            </form>
          )}
          
          <div style={{ marginTop: '2.5rem', textAlign: 'center', fontSize: '1rem', color: '#4B5563' }}>
            Đã có tài khoản? <Link to="/login" style={{ color: '#2563EB', textDecoration: 'none', fontWeight: '600' }}>Về màn hình Đăng nhập</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
