import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { COLORS } from '../utils/constants';
import { ANIMATION_CONFIG } from '../utils/animations';

interface AppHeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

const AppHeaderComponent: React.FC<AppHeaderProps> = ({ title, showBack, onBack, rightAction }) => {
  const navigation = useNavigation<any>();

  const handleNavigate = useCallback((screenName: string) => {
    try {
      // Try to get the root navigator (TabsNavigator)
      let rootNavigator = navigation;
      let parent = navigation.getParent();
      
      // Navigate up the hierarchy to find TabsNavigator
      while (parent) {
        rootNavigator = parent;
        parent = parent.getParent();
      }
      
      if (rootNavigator && typeof rootNavigator.navigate === 'function') {
        rootNavigator.navigate(screenName);
      }
    } catch (error) {
      console.warn('Navigation error:', error);
    }
  }, [navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {showBack && onBack ? (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Icon name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholder} />
        )}
        
        <Text style={styles.title}>{title}</Text>
        
        <View style={styles.rightActions}>
          {rightAction || (
            <>
              {/* Wellness Icon */}
              <AnimatedIconButton
                icon="spa"
                onPress={() => handleNavigate('Wellness')}
                color={COLORS.textSecondary}
              />
              
              {/* Chat AI Icon */}
              <AnimatedIconButton
                icon="chat-bubble-outline"
                onPress={() => handleNavigate('Chat')}
                color={COLORS.textSecondary}
              />
            </>
          )}
        </View>
      </View>
    </View>
  );
};

export const AppHeader = React.memo(AppHeaderComponent);

// Animated Icon Button Component
const AnimatedIconButton = React.memo(({ icon, onPress, color }: { icon: string; onPress: () => void; color: string }) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.85, ANIMATION_CONFIG.spring);
    opacity.value = withTiming(0.6, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, ANIMATION_CONFIG.smoothSpring);
    opacity.value = withTiming(1, { duration: 100 });
  };

  const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

  return (
    <AnimatedTouchable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.iconButton, animatedStyle]}
      activeOpacity={1}
    >
      <Icon name={icon} size={24} color={color} />
    </AnimatedTouchable>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 56,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  placeholder: {
    width: 32,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    padding: 4,
    marginLeft: 4,
  },
});

