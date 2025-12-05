import { User, UserRole, AuthResponse } from '../types';

/**
 * SERVICE: Authentication (Mock Backend)
 * 
 * In a real Node.js environment:
 * - Passwords would be hashed with `bcrypt`.
 * - Tokens would be signed with `jsonwebtoken`.
 * - Database would be MongoDB.
 */

const STORAGE_KEYS = {
  USERS: 'smartcare_users',
  CURRENT_SESSION: 'smartcare_token',
};

// Simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const generateId = () => Math.random().toString(36).substring(2, 15);
const generateToken = () => 'jwt_mock_' + Math.random().toString(36).substring(2) + Date.now();

// --- MOCK CONTROLLERS ---

/**
 * POST /auth/register
 */
export const registerUser = async (
  name: string, 
  phone: string, 
  password: string, 
  role: UserRole
): Promise<{ message: string, phone: string }> => {
  await delay(800);

  const usersStr = localStorage.getItem(STORAGE_KEYS.USERS);
  const users: User[] = usersStr ? JSON.parse(usersStr) : [];

  if (users.find(u => u.phone === phone)) {
    throw new Error('Số điện thoại đã được đăng ký.');
  }

  // Create temporary user (Not verified yet)
  // For Demo purpose: Assign 'Diabetes' to all new users to showcase UC07
  const newUser: User = {
    _id: generateId(),
    name,
    phone,
    passwordHash: `hashed_${password}`, // Mock bcrypt
    role,
    isVerified: false,
    medicalCondition: 'Diabetes', // HARDCODED for UC07 Demonstration
    caregiverPhone: '0987654321' // Mock caregiver
  };

  users.push(newUser);
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

  // Mock sending OTP logic
  console.log(`[SERVER] OTP for ${phone}: 123456`);

  return { message: 'OTP sent', phone };
};

/**
 * POST /auth/verify-otp
 */
export const verifyOtp = async (phone: string, otp: string): Promise<AuthResponse> => {
  await delay(600);

  if (otp !== '123456') {
    throw new Error('Mã xác thực không đúng.');
  }

  const usersStr = localStorage.getItem(STORAGE_KEYS.USERS);
  const users: User[] = usersStr ? JSON.parse(usersStr) : [];
  
  const userIndex = users.findIndex(u => u.phone === phone);
  if (userIndex === -1) throw new Error('User not found');

  // Activate User
  users[userIndex].isVerified = true;
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

  const token = generateToken();
  localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION, token); // Persist login

  return { user: users[userIndex], token };
};

/**
 * POST /auth/login
 */
export const loginUser = async (phone: string, password: string): Promise<AuthResponse> => {
  await delay(800);

  const usersStr = localStorage.getItem(STORAGE_KEYS.USERS);
  const users: User[] = usersStr ? JSON.parse(usersStr) : [];

  const user = users.find(u => u.phone === phone && u.passwordHash === `hashed_${password}`);

  if (!user) {
    throw new Error('Sai số điện thoại hoặc mật khẩu.');
  }

  if (!user.isVerified) {
    throw new Error('Tài khoản chưa được xác thực.');
  }

  const token = generateToken();
  localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION, token);

  return { user, token };
};

/**
 * Middleware: Get Current User
 */
export const getCurrentUser = async (): Promise<User | null> => {
  const token = localStorage.getItem(STORAGE_KEYS.CURRENT_SESSION);
  if (!token) return null;

  // In real app, we decode JWT. Here we just grab the last user for demo
  // or a specific mocked user stored in session.
  // For this mock, let's just find the first verified user or null
  // ideally we store userId in localStorage too.
  
  const usersStr = localStorage.getItem(STORAGE_KEYS.USERS);
  const users: User[] = usersStr ? JSON.parse(usersStr) : [];
  return users.find(u => u.isVerified) || null;
};

export const logoutUser = () => {
  localStorage.removeItem(STORAGE_KEYS.CURRENT_SESSION);
};