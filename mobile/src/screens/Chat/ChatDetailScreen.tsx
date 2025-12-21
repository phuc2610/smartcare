/**
 * ChatDetailScreen
 * Màn hình chat chi tiết với một người
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform,
  RefreshControl,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen } from '../../ui/Screen';
import { AppHeader } from '../../components/AppHeader';
import { Text } from '../../ui/Text';
import { Card } from '../../ui/Card';
import { Loading } from '../../ui/Loading';
import { Avatar } from '../../components/Avatar';
import { COLORS, SPACING, RADIUS } from '../../theme';
import { useAuth } from '../../contexts/AuthContext';
import { getMessages, sendMessage, Message } from '../../services/chat.service';
import { showSuccess, showError as showErrorUtil } from '../../utils/alert';
import { logger } from '../../utils/logger';

const AnimatedView = Animated.createAnimatedComponent(View);

interface RouteParams {
  otherUserId: string;
  otherUserName: string;
  otherUserAvatar?: string;
}

export const ChatDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { user } = useAuth();
  const { otherUserId, otherUserName, otherUserAvatar } = (route.params || {}) as RouteParams;
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [inputText, setInputText] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const scrollViewRef = useRef<ScrollView>(null);

  const fetchMessages = async (pageNum: number = 1, append: boolean = false) => {
    if (!otherUserId) return;
    
    try {
      if (!append) setLoading(true);
      const data = await getMessages(otherUserId, pageNum, 50);
      
      if (append) {
        setMessages(prev => [...data.messages, ...prev]);
      } else {
        setMessages(data.messages);
      }
      
      setHasMore(data.hasMore);
      setPage(pageNum);
    } catch (err: any) {
      logger.error('Fetch messages error:', err);
      if (!append) {
        showErrorUtil('Lỗi', err.message || 'Không thể tải tin nhắn');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchMessages(1, false);
    }, [otherUserId])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchMessages(1, false);
  };

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      fetchMessages(page + 1, true);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || sending || !otherUserId) return;

    const content = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      const result = await sendMessage({
        receiverId: otherUserId,
        content,
        messageType: 'text',
      });

      // Thêm tin nhắn mới vào danh sách
      setMessages(prev => [...prev, result.message]);
      
      // Scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (err: any) {
      logger.error('Send message error:', err);
      showErrorUtil('Lỗi', err.message || 'Không thể gửi tin nhắn');
      setInputText(content); // Khôi phục text nếu gửi thất bại
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hôm nay';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Hôm qua';
    } else {
      return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    }
  };

  const renderMessage = (message: Message, index: number) => {
    const isMe = message.senderId._id === user?._id;
    const showDate = index === 0 || 
      (messages[index - 1] && 
       new Date(message.createdAt).toDateString() !== 
       new Date(messages[index - 1].createdAt).toDateString());

    return (
      <View key={message._id}>
        {showDate && (
          <View style={styles.dateContainer}>
            <Text variant="caption" color="textSecondary">
              {formatDate(message.createdAt)}
            </Text>
          </View>
        )}
        <AnimatedView
          entering={FadeInDown.delay(50)}
          style={[
            styles.messageContainer,
            isMe ? styles.messageContainerMe : styles.messageContainerOther,
          ]}
        >
          {!isMe && (
            <Avatar
              name={message.senderId.name}
              size={32}
              avatarUrl={message.senderId.avatar}
              style={styles.messageAvatar}
            />
          )}
          <View
            style={[
              styles.messageBubble,
              isMe ? styles.messageBubbleMe : styles.messageBubbleOther,
            ]}
          >
            <Text
              variant="body"
              color={isMe ? 'surface' : 'text'}
              style={styles.messageText}
            >
              {message.content}
            </Text>
            <Text
              variant="caption"
              color={isMe ? 'surface' : 'textSecondary'}
              style={styles.messageTime}
            >
              {formatTime(message.createdAt)}
            </Text>
          </View>
        </AnimatedView>
      </View>
    );
  };

  if (loading && messages.length === 0) {
    return (
      <Screen>
        <AppHeader 
          title={otherUserName || 'Chat'} 
          showBack 
          onBack={() => navigation.goBack()} 
        />
        <Loading message="Đang tải tin nhắn..." />
      </Screen>
    );
  }

  return (
    <Screen>
      <AppHeader 
        title={otherUserName || 'Chat'} 
        showBack 
        onBack={() => navigation.goBack()}
      />

      <KeyboardAvoidingView
        style={styles.container}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 24}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          onContentSizeChange={() => {
            scrollViewRef.current?.scrollToEnd({ animated: false });
          }}
          onLayout={() => {
            scrollViewRef.current?.scrollToEnd({ animated: false });
          }}
        >
          {hasMore && (
            <TouchableOpacity
              style={styles.loadMoreButton}
              onPress={handleLoadMore}
            >
              <Text variant="caption" color="primary">
                Tải thêm tin nhắn cũ
              </Text>
            </TouchableOpacity>
          )}
          
          {messages.map((message, index) => renderMessage(message, index))}
        </ScrollView>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Nhập tin nhắn..."
            placeholderTextColor={COLORS.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
            editable={!sending}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || sending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
          >
            {sending ? (
              <Icon name="hourglass-empty" size={24} color={COLORS.textSecondary} />
            ) : (
              <Icon name="send" size={24} color={COLORS.surface} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING['3xl'],
  },
  loadMoreButton: {
    padding: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  dateContainer: {
    alignItems: 'center',
    marginVertical: SPACING.md,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
    alignItems: 'flex-end',
    gap: SPACING.xs,
  },
  messageContainerMe: {
    justifyContent: 'flex-end',
  },
  messageContainerOther: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    marginRight: 0,
  },
  messageBubble: {
    maxWidth: '75%',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
  },
  messageBubbleMe: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: RADIUS.xs,
  },
  messageBubbleOther: {
    backgroundColor: COLORS.background,
    borderBottomLeftRadius: RADIUS.xs,
  },
  messageText: {
    marginBottom: SPACING.xs / 2,
  },
  messageTime: {
    fontSize: 10,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: SPACING.md,
    paddingBottom: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.sm,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: 16,
    color: COLORS.text,
    textAlignVertical: 'center',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.border,
  },
});


