/**
 * ChatBadge Component
 * Badge hiển thị số tin nhắn chưa đọc
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getUnreadCount } from '../services/chat.service';
import { COLORS, SPACING, RADIUS } from '../theme';

export const ChatBadge: React.FC = () => {
  const [count, setCount] = useState(0);

  useFocusEffect(
    React.useCallback(() => {
      fetchUnreadCount();
      
      // Refresh every 30 seconds
      const interval = setInterval(fetchUnreadCount, 30000);
      
      return () => clearInterval(interval);
    }, [])
  );

  const fetchUnreadCount = async () => {
    try {
      const data = await getUnreadCount();
      setCount(data.unreadCount);
    } catch (error) {
      // Silently fail
    }
  };

  if (count === 0) return null;

  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.error,
    borderRadius: RADIUS.full,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 14,
  },
});


