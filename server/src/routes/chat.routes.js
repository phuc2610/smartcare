/**
 * Chat Routes
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  sendMessage,
  getConversations,
  getMessages,
  markAsRead,
  getUnreadCount,
} = require('../controllers/chat.controller');

// Tất cả routes đều cần authentication
router.use(authenticate);

// Gửi tin nhắn
router.post('/send', sendMessage);

// Lấy danh sách cuộc trò chuyện
router.get('/conversations', getConversations);

// Lấy tin nhắn với một người cụ thể
router.get('/messages/:otherUserId', getMessages);

// Đánh dấu tin nhắn đã đọc
router.patch('/messages/:messageId/read', markAsRead);

// Đếm số tin nhắn chưa đọc
router.get('/unread-count', getUnreadCount);

module.exports = router;


