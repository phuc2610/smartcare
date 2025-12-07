/**
 * AnimatedCard - Legacy wrapper for Card component
 * @deprecated Use Card from '../ui/Card' directly
 */
import React from 'react';
import { ViewStyle } from 'react-native';
import { Card } from '../ui/Card';

interface AnimatedCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  delay?: number;
  index?: number;
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  style,
  delay = 0,
  index = 0,
}) => {
  return (
    <Card
      style={style}
      animated={true}
      delay={delay}
      index={index}
    >
      {children}
    </Card>
  );
};

