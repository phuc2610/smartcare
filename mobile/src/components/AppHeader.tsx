import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../utils/constants';

interface AppHeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
}

const AppHeaderComponent: React.FC<AppHeaderProps> = ({ title, showBack, onBack }) => {
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
          {/* Wellness Icon */}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => handleNavigate('Wellness')}
            activeOpacity={0.7}
          >
            <Icon name="spa" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>
          
          {/* Chat AI Icon */}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => handleNavigate('Chat')}
            activeOpacity={0.7}
          >
            <Icon name="chat-bubble-outline" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>
          
          {/* Link Icon */}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => handleNavigate('Link')}
            activeOpacity={0.7}
          >
            <Icon name="link" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export const AppHeader = React.memo(AppHeaderComponent);

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

