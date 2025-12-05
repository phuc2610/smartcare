import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { chatWithAI } from '../../services/ai.service';
import { ChatMessage } from '../../types';
import { COLORS } from '../../utils/constants';
import { Avatar } from '../../components/Avatar';
import { AppHeader } from '../../components/AppHeader';

export const ChatAIScreen = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      text: `Xin chào ${user?.name || 'bạn'}! Tôi là trợ lý AI của SmartCare. Bạn cảm thấy trong người thế nào?`,
      sender: 'bot',
      timestamp: Date.now(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
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

  return (
    <View style={styles.container}>
      <AppHeader title="Trợ lý AI" />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
      <ScrollView
        ref={scrollViewRef}
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
      >
        {messages.map(msg => {
          const isBot = msg.sender === 'bot';
          return (
            <View
              key={msg.id}
              style={[styles.messageContainer, isBot ? styles.botContainer : styles.userContainer]}
            >
              {isBot && <Avatar name="AI" size={32} backgroundColor={COLORS.primaryLight} />}
              <View style={[styles.message, isBot ? styles.botMessage : styles.userMessage, msg.isError && styles.errorMessage]}>
                <Text style={[styles.messageText, isBot && styles.botMessageText, msg.isError && styles.errorText]}>
                  {msg.text}
                </Text>
              </View>
              {!isBot && <Avatar name={user?.name || 'U'} size={32} />}
            </View>
          );
        })}
        {isTyping && (
          <View style={[styles.messageContainer, styles.botContainer]}>
            <Avatar name="AI" size={32} backgroundColor={COLORS.primaryLight} />
            <View style={[styles.message, styles.botMessage]}>
              <View style={styles.typingIndicator}>
                <View style={[styles.typingDot, { animationDelay: '0ms' }]} />
                <View style={[styles.typingDot, { animationDelay: '150ms' }]} />
                <View style={[styles.typingDot, { animationDelay: '300ms' }]} />
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <Text style={styles.aiIcon}>✨</Text>
          <TextInput
            style={styles.input}
            placeholder="Hỏi về sức khỏe của bạn..."
            value={inputText}
            onChangeText={setInputText}
            multiline
            placeholderTextColor={COLORS.textSecondary}
          />
        </View>
        <TouchableOpacity
          style={[styles.sendButton, (!inputText.trim() || isTyping) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim() || isTyping}
        >
          {isTyping ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.sendButtonText}>➤</Text>
          )}
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  messages: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
    gap: 8,
  },
  botContainer: {
    justifyContent: 'flex-start',
  },
  userContainer: {
    justifyContent: 'flex-end',
  },
  message: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
  },
  userMessage: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  botMessage: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  errorMessage: {
    backgroundColor: '#fee2e2',
    borderColor: '#fecaca',
  },
  messageText: {
    fontSize: 14,
    color: COLORS.text,
  },
  botMessageText: {
    color: COLORS.text,
  },
  errorText: {
    color: COLORS.error,
  },
  typingIndicator: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.textSecondary,
    opacity: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    alignItems: 'flex-end',
    gap: 8,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxHeight: 100,
  },
  aiIcon: {
    fontSize: 16,
    marginRight: 8,
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
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

