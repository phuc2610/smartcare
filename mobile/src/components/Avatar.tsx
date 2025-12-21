import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { COLORS } from '../utils/constants';

interface AvatarProps {
  name?: string;
  size?: number;
  backgroundColor?: string;
  avatarUrl?: string;
  style?: any;
}

export const Avatar: React.FC<AvatarProps> = ({ 
  name = 'U', 
  size = 48,
  backgroundColor = COLORS.primaryLight,
  avatarUrl,
  style
}) => {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  if (avatarUrl) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={[
          styles.container,
          styles.image,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
          style
        ]}
      />
    );
  }

  return (
    <View 
      style={[
        styles.container, 
        { 
          width: size, 
          height: size, 
          borderRadius: size / 2,
          backgroundColor 
        },
        style
      ]}
    >
      <Text style={[styles.text, { fontSize: size * 0.4 }]}>{initials}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  image: {
    borderWidth: 2,
    borderColor: '#fff',
  },
  text: {
    fontWeight: 'bold',
    color: COLORS.primary,
  },
});

