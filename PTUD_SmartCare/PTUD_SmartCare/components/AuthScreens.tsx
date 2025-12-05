import React, { useState, FC } from 'react';
import { ShieldCheck, Phone, Lock, User as UserIcon, ArrowRight } from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';

// --- UI COMPONENTS ---

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon: React.ElementType;
}

const AuthInput: FC<AuthInputProps> = ({ icon: Icon, ...props }) => (
  <div style={styles.inputContainer as any}>
    <Icon style={styles.inputIcon as any} size={20} color="#9CA3AF" />
    <input
      style={styles.input as any}
      {...props}
    />
  </div>
);

interface AuthButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  variant?: 'primary' | 'secondary';
  children: React.ReactNode;
}

const AuthButton: FC<AuthButtonProps> = ({ children, loading, variant = 'primary', ...props }) => {
  const buttonStyle = variant === 'primary' ? styles.primaryButton : styles.secondaryButton;
  const textStyle = variant === 'primary' ? styles.primaryButtonText : styles.secondaryButtonText;

  return (
    <button
      style={{ ...styles.buttonBase, ...buttonStyle, ...(loading ? styles.buttonDisabled : {}) } as any}
      disabled={loading}
      {...props}
    >
      {loading ? (
        <div style={{ width: 24, height: 24, border: '3px solid', borderColor: variant === 'primary' ? '#FFFFFF' : '#4F46E5', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      ) : typeof children === 'string' ? (
        <span style={{ ...styles.buttonTextBase, ...textStyle } as any}>{children}</span>
      ) : (
        children
      )}
    </button>
  );
};

// --- SCREENS ---

export const AuthScreens = () => {
  const { signIn, signUp, verify } = useAuth();
  const [screen, setScreen] = useState<'LOGIN' | 'REGISTER' | 'OTP'>('LOGIN');

  // Form State
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.PATIENT);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!phone || !password) return setError('Vui lòng nhập đầy đủ thông tin');
    setError('');
    setLoading(true);
    try {
      await signIn(phone, password);
    } catch (err: any) {
      setError(err.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!name || !phone || !password) return setError('Vui lòng nhập đầy đủ thông tin');
    const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/;
    if (!phoneRegex.test(phone)) return setError('Số điện thoại không hợp lệ');

    setError('');
    setLoading(true);
    try {
      await signUp(name, phone, password, role);
      setScreen('OTP'); // Move to OTP
    } catch (err: any) {
      setError(err.message || 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (otp.length !== 6) return setError('Mã OTP phải có 6 chữ số');
    setError('');
    setLoading(true);
    try {
      await verify(phone, otp);
      // Success triggers AuthContext update -> App.tsx renders Dashboard
    } catch (err: any) {
      setError(err.message || 'Xác thực thất bại');
    } finally {
      setLoading(false);
    }
  };

  // --- RENDER ---

  const renderHeader = (title: string, sub: string) => (
    <div style={styles.headerContainer as any}>
      <div style={styles.headerIconContainer as any}>
        <ShieldCheck size={40} color="#4F46E5" />
      </div>
      <h1 style={styles.headerTitle as any}>{title}</h1>
      <p style={styles.headerSubtitle as any}>{sub}</p>
    </div>
  );

  return (
    <div style={styles.safeArea as any}>
      <div style={styles.container as any}>
        {screen === 'LOGIN' && (
          <div>
            {renderHeader('Đăng nhập', 'Chào mừng quay trở lại SmartCare')}
            <AuthInput
              icon={Phone}
              placeholder="Số điện thoại"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="tel"
            />
            <AuthInput
              icon={Lock}
              placeholder="Mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
            />
            {error && <p style={styles.errorText as any}>{error}</p>}
            <div style={styles.buttonGroup as any}>
              <AuthButton onClick={handleLogin} loading={loading}>
                Đăng nhập
              </AuthButton>
              <div style={{ height: 12 }} />
              <AuthButton variant="secondary" onClick={() => setScreen('REGISTER')}>
                Tạo tài khoản mới
              </AuthButton>
            </div>
          </div>
        )}

        {screen === 'REGISTER' && (
          <div>
            {renderHeader('Đăng ký', 'Tạo tài khoản để quản lý sức khỏe')}
            <AuthInput icon={UserIcon} placeholder="Họ và tên" value={name} onChange={(e) => setName(e.target.value)} />
            <AuthInput icon={Phone} placeholder="Số điện thoại" value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" />
            <AuthInput icon={Lock} placeholder="Mật khẩu" value={password} onChange={(e) => setPassword(e.target.value)} type="password" />

            <div style={styles.roleSelectorContainer as any}>
              <button
                style={{ ...styles.roleButton, ...(role === UserRole.PATIENT ? styles.roleButtonActive : {}) } as any}
                onClick={() => setRole(UserRole.PATIENT)}
              >
                <span style={{ ...styles.roleButtonText, ...(role === UserRole.PATIENT ? styles.roleButtonTextActive : {}) } as any}>Người bệnh</span>
              </button>
              <button
                style={{ ...styles.roleButton, ...(role === UserRole.CAREGIVER ? styles.roleButtonActive : {}) } as any}
                onClick={() => setRole(UserRole.CAREGIVER)}
              >
                <span style={{ ...styles.roleButtonText, ...(role === UserRole.CAREGIVER ? styles.roleButtonTextActive : {}) } as any}>Người thân</span>
              </button>
            </div>

            {error && <p style={styles.errorText as any}>{error}</p>}

            <div style={styles.buttonGroup as any}>
              <AuthButton onClick={handleRegister} loading={loading}>
                <div style={styles.buttonWithIcon as any}>
                  <span style={styles.primaryButtonText as any}>Tiếp tục </span>
                  <ArrowRight size={16} color="#FFFFFF" />
                </div>
              </AuthButton>
              <button onClick={() => setScreen('LOGIN')} style={styles.linkButton as any}>
                <span style={styles.linkButtonText as any}>Đã có tài khoản? Đăng nhập</span>
              </button>
            </div>
          </div>
        )}

        {screen === 'OTP' && (
          <div>
            {renderHeader('Xác thực OTP', `Mã 6 số đã gửi tới ${phone}`)}
            <div style={{ marginBottom: 24 }}>
              <input
                style={styles.otpInput as any}
                placeholder="123456"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                type="text"
              />
              <p style={styles.otpHelpText as any}>Mã OTP mẫu: 123456</p>
            </div>

            {error && <p style={styles.errorText as any}>{error}</p>}

            <AuthButton onClick={handleVerify} loading={loading}>
              Xác nhận
            </AuthButton>
            <button onClick={() => setScreen('REGISTER')} style={styles.linkButton as any}>
              <span style={styles.linkButtonText as any}>Quay lại đăng ký</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  safeArea: { flex: 1, backgroundColor: '#FFFFFF', minHeight: '100vh' },
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    paddingLeft: 24,
    paddingRight: 24,
    backgroundColor: '#FFFFFF',
    minHeight: '100vh',
  },
  // Header
  headerContainer: { marginBottom: 32, textAlign: 'center' },
  headerIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EEF2FF',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1F2937', margin: 0 },
  headerSubtitle: { fontSize: 16, color: '#6B7280', marginTop: 8 },
  // Input
  inputContainer: { position: 'relative', marginBottom: 16 },
  inputIcon: { position: 'absolute', left: 16, top: 16, zIndex: 1 },
  input: {
    width: '100%',
    paddingLeft: 48,
    paddingRight: 16,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#F9FAFB',
    border: '1px solid #E5E7EB',
    borderRadius: 12,
    fontSize: 16,
    boxSizing: 'border-box',
  },
  // Button
  buttonBase: {
    width: '100%',
    paddingTop: 16,
    paddingBottom: 16,
    borderRadius: 12,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    cursor: 'pointer',
    fontSize: 16,
  },
  buttonWithIcon: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonTextBase: { fontWeight: 'bold', fontSize: 16 },
  primaryButton: { backgroundColor: '#4F46E5' },
  primaryButtonText: { color: '#FFFFFF' },
  secondaryButton: {
    backgroundColor: 'transparent',
    border: '2px solid #C7D2FE',
  },
  secondaryButtonText: { color: '#4F46E5' },
  buttonDisabled: { opacity: 0.7 },
  buttonGroup: { marginTop: 8 },
  // Role Selector
  roleSelectorContainer: { display: 'flex', flexDirection: 'row', gap: 8, marginBottom: 24 },
  roleButton: {
    flex: 1,
    paddingTop: 12,
    paddingBottom: 12,
    borderRadius: 8,
    border: '2px solid #F3F4F6',
    backgroundColor: 'transparent',
    cursor: 'pointer',
  },
  roleButtonActive: {
    borderColor: '#6366F1',
    backgroundColor: '#EEF2FF',
  },
  roleButtonText: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 'bold',
    color: '#9CA3AF',
  },
  roleButtonTextActive: { color: '#4338CA' },
  // OTP
  otpInput: {
    width: '100%',
    textAlign: 'center',
    fontSize: 30,
    fontWeight: 'bold',
    letterSpacing: 16,
    paddingTop: 16,
    paddingBottom: 16,
    borderTop: 'none',
    borderLeft: 'none',
    borderRight: 'none',
    borderBottom: '2px solid #E5E7EB',
    outline: 'none',
  },
  otpHelpText: { textAlign: 'center', fontSize: 12, color: '#9CA3AF', marginTop: 8 },
  // Misc
  errorText: { color: '#EF4444', textAlign: 'center', marginBottom: 16, fontSize: 14 },
  linkButton: { width: '100%', paddingTop: 12, paddingBottom: 12, backgroundColor: 'transparent', border: 'none', cursor: 'pointer' },
  linkButtonText: { textAlign: 'center', color: '#6B7280', fontSize: 14 },
};