/**
 * Chat Controller
 * Xử lý logic cho chat giữa người bệnh và người thân
 */

const Message = require('../models/Message');
const User = require('../models/User');
const { z } = require('zod');
const CaregiverRequest = require('../models/CaregiverRequest');

// Validation schemas
const sendMessageSchema = z.object({
  receiverId: z.string().min(1, 'Receiver ID is required'),
  content: z.string().min(1, 'Message content is required').max(1000, 'Message too long'),
  messageType: z.enum(['text', 'image', 'file']).optional(),
  imageUrl: z.string().url().optional().nullable(),
});

/**
 * Gửi tin nhắn
 */
const sendMessage = async (req, res) => {
  try {
    const senderId = req.user._id.toString();
    const { receiverId, content, messageType = 'text', imageUrl } = sendMessageSchema.parse(req.body);

    // Kiểm tra người nhận có tồn tại không
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ error: 'Người nhận không tồn tại' });
    }

    // Kiểm tra quyền liên kết
    const sender = await User.findById(senderId);
    let hasPermission = false;

    if (sender.role === 'PATIENT') {
      // Người bệnh -> người thân
      const hasLinked = receiver.role === 'CAREGIVER' && receiver.caregiverId?.toString() === senderId;
      const hasPending = receiver.role === 'CAREGIVER' && (
        await CaregiverRequest.findOne({
          patientId: senderId,
          caregiverId: receiverId,
          status: { $in: ['pending', 'accepted'] },
        })
      );
      hasPermission = hasLinked || !!hasPending;
    } else if (sender.role === 'CAREGIVER') {
      // Người thân -> người bệnh
      const hasLinked = receiver.role === 'PATIENT' && receiver.caregiverId?.toString() === senderId;
      const hasPending = receiver.role === 'PATIENT' && (
        await CaregiverRequest.findOne({
          patientId: receiverId,
          caregiverId: senderId,
          status: { $in: ['pending', 'accepted'] },
        })
      );
      hasPermission = hasLinked || !!hasPending;
    }

    if (!hasPermission) {
      return res.status(403).json({ error: 'Bạn không có quyền nhắn tin với người này' });
    }

    // Tạo tin nhắn
    const message = new Message({
      senderId,
      receiverId,
      content,
      messageType,
      imageUrl: messageType === 'image' ? imageUrl : null,
    });

    await message.save();

    // Populate thông tin người gửi
    await message.populate('senderId', 'name avatar');
    await message.populate('receiverId', 'name avatar');

    res.status(201).json({ message });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Không thể gửi tin nhắn' });
  }
};

/**
 * Lấy danh sách cuộc trò chuyện
 */
const getConversations = async (req, res) => {
  try {
    const userId = req.user._id.toString();

    const currentUser = await User.findById(userId).select('role caregiverId name avatar');

    // Lấy tất cả tin nhắn mà user là người gửi hoặc người nhận
    const messages = await Message.find({
      $or: [
        { senderId: userId },
        { receiverId: userId },
      ],
    })
      .populate('senderId', 'name avatar role')
      .populate('receiverId', 'name avatar role')
      .sort({ createdAt: -1 });

    // Nhóm tin nhắn theo conversation (người đối thoại)
    const conversationsMap = new Map();

    messages.forEach((msg) => {
      const otherUserId = msg.senderId._id.toString() === userId 
        ? msg.receiverId._id.toString()
        : msg.senderId._id.toString();
      
      const otherUser = msg.senderId._id.toString() === userId 
        ? msg.receiverId
        : msg.senderId;

      if (!conversationsMap.has(otherUserId)) {
        // Đếm số tin nhắn chưa đọc
        const unreadCount = messages.filter(m => 
          (m.senderId._id.toString() === otherUserId && 
           m.receiverId._id.toString() === userId && 
           !m.isRead)
        ).length;

        conversationsMap.set(otherUserId, {
          userId: otherUserId,
          userName: otherUser.name,
          userAvatar: otherUser.avatar,
          userRole: otherUser.role,
          lastMessage: {
            content: msg.content,
            messageType: msg.messageType,
            createdAt: msg.createdAt,
          },
          unreadCount,
          updatedAt: msg.createdAt,
        });
      } else {
        // Cập nhật nếu có tin nhắn mới hơn
        const conv = conversationsMap.get(otherUserId);
        if (msg.createdAt > conv.updatedAt) {
          conv.lastMessage = {
            content: msg.content,
            messageType: msg.messageType,
            createdAt: msg.createdAt,
          };
          conv.updatedAt = msg.createdAt;
        }
      }
    });

    // Nếu chưa có tin nhắn, vẫn hiển thị các liên kết
    if (currentUser?.role === 'PATIENT' && currentUser.caregiverId) {
      const caregiver = await User.findById(currentUser.caregiverId).select('name avatar role');
      if (caregiver) {
        const otherUserId = caregiver._id.toString();
        if (!conversationsMap.has(otherUserId)) {
          conversationsMap.set(otherUserId, {
            userId: otherUserId,
            userName: caregiver.name,
            userAvatar: caregiver.avatar,
            userRole: caregiver.role,
            lastMessage: {
              content: '',
              messageType: 'text',
              createdAt: new Date(0),
            },
            unreadCount: 0,
            updatedAt: new Date(0),
          });
        }
      }
    } else if (currentUser?.role === 'CAREGIVER') {
      const patients = await User.find({ caregiverId: userId, role: 'PATIENT' }).select('name avatar role');
      patients.forEach((p) => {
        const otherUserId = p._id.toString();
        if (!conversationsMap.has(otherUserId)) {
          conversationsMap.set(otherUserId, {
            userId: otherUserId,
            userName: p.name,
            userAvatar: p.avatar,
            userRole: p.role,
            lastMessage: {
              content: '',
              messageType: 'text',
              createdAt: new Date(0),
            },
            unreadCount: 0,
            updatedAt: new Date(0),
          });
        }
      });
    }

    const conversations = Array.from(conversationsMap.values())
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    res.json({ conversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Không thể lấy danh sách cuộc trò chuyện' });
  }
};

/**
 * Lấy tin nhắn với một người cụ thể
 */
const getMessages = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const { otherUserId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Kiểm tra quyền
    const otherUser = await User.findById(otherUserId);
    if (!otherUser) {
      return res.status(404).json({ error: 'Người dùng không tồn tại' });
    }

    const currentUser = await User.findById(userId);
    let hasPermission = false;

    if (currentUser.role === 'PATIENT') {
      const hasLinked = otherUser.role === 'CAREGIVER' && otherUser.caregiverId?.toString() === userId;
      const hasPending = otherUser.role === 'CAREGIVER' && (
        await CaregiverRequest.findOne({
          patientId: userId,
          caregiverId: otherUserId,
          status: { $in: ['pending', 'accepted'] },
        })
      );
      hasPermission = hasLinked || !!hasPending;
    } else if (currentUser.role === 'CAREGIVER') {
      const hasLinked = otherUser.role === 'PATIENT' && otherUser.caregiverId?.toString() === userId;
      const hasPending = otherUser.role === 'PATIENT' && (
        await CaregiverRequest.findOne({
          patientId: otherUserId,
          caregiverId: userId,
          status: { $in: ['pending', 'accepted'] },
        })
      );
      hasPermission = hasLinked || !!hasPending;
    }

    if (!hasPermission) {
      return res.status(403).json({ error: 'Bạn không có quyền xem tin nhắn với người này' });
    }

    // Lấy tin nhắn
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const messages = await Message.find({
      $or: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId },
      ],
    })
      .populate('senderId', 'name avatar')
      .populate('receiverId', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    // Đánh dấu tin nhắn đã đọc
    await Message.updateMany(
      {
        senderId: otherUserId,
        receiverId: userId,
        isRead: false,
      },
      {
        isRead: true,
        readAt: new Date(),
      }
    );

    res.json({ 
      messages: messages.reverse(), // Đảo ngược để hiển thị từ cũ đến mới
      hasMore: messages.length === parseInt(limit),
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Không thể lấy tin nhắn' });
  }
};

/**
 * Đánh dấu tin nhắn đã đọc
 */
const markAsRead = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Tin nhắn không tồn tại' });
    }

    // Chỉ người nhận mới có thể đánh dấu đã đọc
    if (message.receiverId.toString() !== userId) {
      return res.status(403).json({ error: 'Không có quyền' });
    }

    message.isRead = true;
    message.readAt = new Date();
    await message.save();

    res.json({ message });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: 'Không thể đánh dấu đã đọc' });
  }
};

/**
 * Đếm số tin nhắn chưa đọc
 */
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id.toString();

    const count = await Message.countDocuments({
      receiverId: userId,
      isRead: false,
    });

    res.json({ unreadCount: count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Không thể lấy số tin nhắn chưa đọc' });
  }
};

module.exports = {
  sendMessage,
  getConversations,
  getMessages,
  markAsRead,
  getUnreadCount,
};


