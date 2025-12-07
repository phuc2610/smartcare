import React, { useState, useRef, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../../contexts/AuthContext';
import { chatWithAI, getChatHistory } from '../../services/ai.service';
import { ChatMessage } from '../../types';
import { COLORS, SPACING, RADIUS } from '../../theme/tokens';
import { SHADOWS } from '../../theme/shadows';
import { Text } from '../../ui/Text';
import { Card } from '../../ui/Card';
import { Chip } from '../../ui/Chip';
import { Screen } from '../../ui/Screen';
import { Loading } from '../../ui/Loading';
import { Avatar } from '../../components/Avatar';
import { useFocusEffect } from '@react-navigation/native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { SPRING } from '../../theme/motion';

const QUICK_ACTIONS = [
  'Tôi cảm thấy mệt mỏi',
  'Đau đầu nên làm gì?',
  'Cách cải thiện giấc ngủ',
  'Chế độ ăn uống lành mạnh',
];

export const ChatAIScreen = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);

  useFocusEffect(
    React.useCallback(() => {
      loadChatHistory();
    }, [])
  );

  const loadChatHistory = async () => {
    try {
      setLoadingHistory(true);
      const history = await getChatHistory();
      
      if (history.messages && history.messages.length > 0) {
        const chatMessages: ChatMessage[] = history.messages.flatMap(msg => [
          {
            id: `user-${msg.timestamp}`,
            text: msg.message,
            sender: 'user' as const,
            timestamp: new Date(msg.timestamp).getTime(),
          },
          {
            id: `bot-${msg.timestamp}`,
            text: msg.response,
            sender: 'bot' as const,
            timestamp: new Date(msg.timestamp).getTime(),
          },
        ]);
        setMessages(chatMessages);
      } else {
        setMessages([
          {
            id: 'welcome',
            text: `Xin chào ${user?.name || 'bạn'}! Tôi là trợ lý AI của SmartCare. Bạn cảm thấy trong người thế nào?`,
            sender: 'bot',
            timestamp: Date.now(),
          },
        ]);
      }
    } catch (error) {
      console.error('[Chat] Failed to load history:', error);
      setMessages([
        {
          id: 'welcome',
          text: `Xin chào ${user?.name || 'bạn'}! Tôi là trợ lý AI của SmartCare. Bạn cảm thấy trong người thế nào?`,
          sender: 'bot',
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages, isTyping]);

  const handleSend = async (text?: string) => {
    const messageText = text || inputText.trim();
    if (!messageText) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      text: messageText,
      sender: 'user',
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    if (!text) setInputText('');
    setIsTyping(true);

    try {
      const response = await chatWithAI(userMsg.text);
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: response.response,
        sender: 'bot',
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (error: any) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: 'Xin lỗi, hiện tại tôi không thể phản hồi. Vui lòng thử lại sau.',
        sender: 'bot',
        timestamp: Date.now(),
        isError: true,
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  if (loadingHistory) {
    return (
      <Screen>
        <Loading message="Đang tải lịch sử chat..." />
      </Screen>
    );
  }

  return (
    <Screen style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messages}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 1 && messages[0].sender === 'bot' && (
            <View style={styles.quickActionsContainer}>
              <Text variant="caption" color="textSecondary" style={styles.quickActionsTitle}>
                Câu hỏi nhanh
              </Text>
              <View style={styles.quickActions}>
                {QUICK_ACTIONS.map((action, index) => (
                  <Chip
                    key={index}
                    label={action}
                    variant="default"
                    onPress={() => handleSend(action)}
                    style={styles.quickActionChip}
                  />
                ))}
              </View>
            </View>
          )}

          {messages.map((msg, index) => {
            const isBot = msg.sender === 'bot';
            return (
              <MessageBubble
                key={msg.id}
                message={msg}
                isBot={isBot}
                userName={user?.name}
                index={index}
              />
            );
          })}

          {isTyping && <TypingIndicator />}
        </ScrollView>

        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <Icon name="auto-awesome" size={18} color={COLORS.primary} style={styles.aiIcon} />
            <TextInput
              style={styles.input}
              placeholder="Hỏi về sức khỏe của bạn..."
              value={inputText}
              onChangeText={setInputText}
              multiline
              placeholderTextColor={COLORS.textSecondary}
              maxLength={500}
            />
          </View>
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || isTyping) && styles.sendButtonDisabled]}
            onPress={() => handleSend()}
            disabled={!inputText.trim() || isTyping}
            activeOpacity={0.7}
          >
            {isTyping ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Icon name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
};

// Message Bubble Component
const MessageBubble = React.memo(({
  message,
  isBot,
  userName,
  index,
}: {
  message: ChatMessage;
  isBot: boolean;
  userName?: string;
  index: number;
}) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 300 });
    translateY.value = withSpring(0, SPRING.smooth);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.messageContainer,
        isBot ? styles.botContainer : styles.userContainer,
        animatedStyle,
      ]}
    >
      {isBot && (
        <Avatar name="AI" size={32} backgroundColor={COLORS.primaryLight} />
      )}
      <View
        style={[
          styles.message,
          isBot ? styles.botMessage : styles.userMessage,
          message.isError && styles.errorMessage,
        ]}
      >
        <Text
          variant="bodySmall"
          color={isBot ? 'text' : 'text'}
          style={[
            isBot ? {} : styles.userMessageText,
            message.isError && styles.errorText,
          ]}
        >
          {message.text}
        </Text>
      </View>
      {!isBot && (
        <Avatar name={userName || 'U'} size={32} />
      )}
    </Animated.View>
  );
});

// Typing Indicator Component
const TypingIndicator = React.memo(() => {
  const dot1 = useSharedValue(0.3);
  const dot2 = useSharedValue(0.3);
  const dot3 = useSharedValue(0.3);

  useEffect(() => {
    const animate = (dot: any, delay: number) => {
      'worklet';
      setTimeout(() => {
        dot.value = withTiming(1, { duration: 400 }, () => {
          dot.value = withTiming(0.3, { duration: 400 });
        });
      }, delay);
    };

    const interval = setInterval(() => {
      animate(dot1, 0);
      animate(dot2, 200);
      animate(dot3, 400);
    }, 1200);

    return () => clearInterval(interval);
  }, []);

  const dot1Style = useAnimatedStyle(() => ({
    opacity: dot1.value,
  }));
  const dot2Style = useAnimatedStyle(() => ({
    opacity: dot2.value,
  }));
  const dot3Style = useAnimatedStyle(() => ({
    opacity: dot3.value,
  }));

  return (
    <View style={[styles.messageContainer, styles.botContainer]}>
      <Avatar name="AI" size={32} backgroundColor={COLORS.primaryLight} />
      <View style={[styles.message, styles.botMessage]}>
        <View style={styles.typingIndicator}>
          <Animated.View style={[styles.typingDot, dot1Style]} />
          <Animated.View style={[styles.typingDot, dot2Style]} />
          <Animated.View style={[styles.typingDot, dot3Style]} />
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  messages: {
    flex: 1,
  },
  messagesContent: {
    padding: SPACING.lg,
  },
  quickActionsContainer: {
    marginBottom: SPACING.lg,
  },
  quickActionsTitle: {
    marginBottom: SPACING.sm,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  quickActionChip: {
    marginRight: SPACING.xs,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  botContainer: {
    justifyContent: 'flex-start',
  },
  userContainer: {
    justifyContent: 'flex-end',
  },
  message: {
    maxWidth: '75%',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  userMessage: {
    backgroundColor: COLORS.primary,
  },
  userMessageText: {
    color: '#fff',
  },
  botMessage: {
    backgroundColor: COLORS.surface,
    borderBottomLeftRadius: RADIUS.sm,
    ...SHADOWS.card,
  },
  errorMessage: {
    backgroundColor: COLORS.error + '20',
    borderWidth: 1,
    borderColor: COLORS.error + '40',
  },
  errorText: {
    color: COLORS.error,
  },
  typingIndicator: {
    flexDirection: 'row',
    gap: SPACING.xs,
    alignItems: 'center',
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.textSecondary,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    alignItems: 'flex-end',
    gap: SPACING.sm,
    ...SHADOWS.header,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  aiIcon: {
    marginRight: SPACING.xs,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    maxHeight: 84,
  },
  sendButton: {
    width: 40,
    height: 40,
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.card,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
