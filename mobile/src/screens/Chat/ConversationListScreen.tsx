/**
 * ConversationListScreen
 * Danh sách cuộc trò chuyện
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen } from '../../ui/Screen';
import { AppHeader } from '../../components/AppHeader';
import { Text } from '../../ui/Text';
import { Card } from '../../ui/Card';
import { Loading } from '../../ui/Loading';
import { EmptyState } from '../../ui/EmptyState';
import { Avatar } from '../../components/Avatar';
import { COLORS, SPACING, RADIUS } from '../../theme';
import { useAuth } from '../../contexts/AuthContext';
import { getConversations, Conversation } from '../../services/chat.service';
import { showError as showErrorUtil } from '../../utils/alert';
import { logger } from '../../utils/logger';

const AnimatedCard = Animated.createAnimatedComponent(Card);

export const ConversationListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const data = await getConversations();
      setConversations(data.conversations);
    } catch (err: any) {
      logger.error('Fetch conversations error:', err);
      showErrorUtil('Lỗi', err.message || 'Không thể tải danh sách cuộc trò chuyện');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchConversations();
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchConversations();
  };

  const handleOpenChat = (conversation: Conversation) => {
    navigation.navigate('ChatDetail', {
      otherUserId: conversation.userId,
      otherUserName: conversation.userName,
      otherUserAvatar: conversation.userAvatar,
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    if (days < 7) return `${days} ngày trước`;
    
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
    });
  };

  if (loading && conversations.length === 0) {
    return (
      <Screen>
        <AppHeader title="Tin nhắn" showBack onBack={() => navigation.goBack()} />
        <Loading message="Đang tải cuộc trò chuyện..." />
      </Screen>
    );
  }

  return (
    <Screen scrollable>
      <AppHeader title="Tin nhắn" showBack onBack={() => navigation.goBack()} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {conversations.length === 0 ? (
          <EmptyState
            icon="💬"
            title="Chưa có cuộc trò chuyện"
            message="Bắt đầu trò chuyện với người thân hoặc người bệnh của bạn"
          />
        ) : (
          <View style={styles.conversationsList}>
            {conversations.map((conversation, index) => (
              <AnimatedCard
                key={conversation.userId}
                entering={FadeInDown.delay(50 + index * 30)}
                style={styles.conversationCard}
                onPress={() => handleOpenChat(conversation)}
              >
                <View style={styles.conversationContent}>
                  <Avatar
                    name={conversation.userName}
                    size={56}
                    avatarUrl={conversation.userAvatar}
                  />
                  <View style={styles.conversationInfo}>
                    <View style={styles.conversationHeader}>
                      <Text variant="body" color="text" semibold>
                        {conversation.userName}
                      </Text>
                      <Text variant="caption" color="textSecondary">
                        {formatTime(conversation.lastMessage.createdAt)}
                      </Text>
                    </View>
                    <View style={styles.conversationFooter}>
                      <Text 
                        variant="bodySmall" 
                        color="textSecondary" 
                        numberOfLines={1}
                        style={styles.lastMessage}
                      >
                        {conversation.lastMessage.messageType === 'image' 
                          ? '📷 Hình ảnh'
                          : conversation.lastMessage.content}
                      </Text>
                      {conversation.unreadCount > 0 && (
                        <View style={styles.unreadBadge}>
                          <Text variant="caption" color="surface" style={styles.unreadText}>
                            {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </AnimatedCard>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING['3xl'],
  },
  conversationsList: {
    gap: SPACING.sm,
  },
  conversationCard: {
    marginBottom: 0,
  },
  conversationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  conversationInfo: {
    flex: 1,
    gap: SPACING.xs / 2,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  conversationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  lastMessage: {
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadText: {
    fontSize: 11,
    fontWeight: '700',
  },
});


