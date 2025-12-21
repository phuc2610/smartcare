/**
 * Chat Service
 * API calls cho chat giữa người bệnh và người thân
 */

import { api } from '../utils/api-wrapper';

export interface Message {
  _id: string;
  senderId: {
    _id: string;
    name: string;
    avatar?: string;
  };
  receiverId: {
    _id: string;
    name: string;
    avatar?: string;
  };
  content: string;
  messageType: 'text' | 'image' | 'file';
  imageUrl?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  userId: string;
  userName: string;
  userAvatar?: string;
  userRole: 'PATIENT' | 'CAREGIVER';
  lastMessage: {
    content: string;
    messageType: 'text' | 'image' | 'file';
    createdAt: string;
  };
  unreadCount: number;
  updatedAt: string;
}

export interface SendMessageData {
  receiverId: string;
  content: string;
  messageType?: 'text' | 'image' | 'file';
  imageUrl?: string;
}

/**
 * Gửi tin nhắn
 */
export const sendMessage = async (data: SendMessageData): Promise<{ message: Message }> => {
  const result = await api.post<{ message: Message }>('/api/chat/send', data);
  
  if (!result.ok) {
    throw new Error(result.error || 'Không thể gửi tin nhắn');
  }

  return result.data;
};

/**
 * Lấy danh sách cuộc trò chuyện
 */
export const getConversations = async (): Promise<{ conversations: Conversation[] }> => {
  const result = await api.get<{ conversations: Conversation[] }>('/api/chat/conversations');
  
  if (!result.ok) {
    throw new Error(result.error || 'Không thể lấy danh sách cuộc trò chuyện');
  }

  return result.data;
};

/**
 * Lấy tin nhắn với một người cụ thể
 */
export const getMessages = async (
  otherUserId: string,
  page: number = 1,
  limit: number = 50
): Promise<{ messages: Message[]; hasMore: boolean }> => {
  const result = await api.get<{ messages: Message[]; hasMore: boolean }>(
    `/api/chat/messages/${otherUserId}`,
    {
      params: { page, limit },
    }
  );
  
  if (!result.ok) {
    throw new Error(result.error || 'Không thể lấy tin nhắn');
  }

  return result.data;
};

/**
 * Đánh dấu tin nhắn đã đọc
 */
export const markAsRead = async (messageId: string): Promise<{ message: Message }> => {
  const result = await api.patch<{ message: Message }>(`/api/chat/messages/${messageId}/read`);
  
  if (!result.ok) {
    throw new Error(result.error || 'Không thể đánh dấu đã đọc');
  }

  return result.data;
};

/**
 * Đếm số tin nhắn chưa đọc
 */
export const getUnreadCount = async (): Promise<{ unreadCount: number }> => {
  const result = await api.get<{ unreadCount: number }>('/api/chat/unread-count');
  
  if (!result.ok) {
    throw new Error(result.error || 'Không thể lấy số tin nhắn chưa đọc');
  }

  return result.data;
};


