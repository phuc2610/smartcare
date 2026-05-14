const jwt = require('jsonwebtoken');

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

const generateVerificationToken = (email) => {
  return jwt.sign({ email, type: 'otp_verification' }, process.env.JWT_SECRET, {
    expiresIn: '10m', // Token hết hạn sau 10 phút
  });
};

module.exports = { generateToken, verifyToken, generateVerificationToken };





