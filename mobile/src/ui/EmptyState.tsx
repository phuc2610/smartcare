/**
 * EmptyState Component
 * Empty state display with icon, title, and message
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './Text';
import { Button } from './Button';
import { COLORS, SPACING } from '../theme';

export interface EmptyStateProps {
  icon?: string | React.ReactNode;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  message,
  actionLabel,
  onAction,
}) => {
  return (
    <View style={styles.container}>
      {icon && (
        <View style={styles.iconContainer}>
          {typeof icon === 'string' ? (
            <Text variant="display" style={styles.iconEmoji}>
              {icon}
            </Text>
          ) : (
            icon
          )}
        </View>
      )}
      <Text variant="title" color="text" style={styles.title}>
        {title}
      </Text>
      {message && (
        <Text variant="bodySmall" color="textSecondary" style={styles.message}>
          {message}
        </Text>
      )}
      {actionLabel && onAction && (
        <Button
          title={actionLabel}
          onPress={onAction}
          variant="primary"
          size="medium"
          style={styles.action}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING['3xl'],
    minHeight: 200,
  },
  iconContainer: {
    marginBottom: SPACING.lg,
    paddingVertical: SPACING.md,
    overflow: 'visible',
  },
  iconEmoji: {
    fontSize: 48,
    lineHeight: 56,
  },
  title: {
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  action: {
    marginTop: SPACING.md,
  },
});

