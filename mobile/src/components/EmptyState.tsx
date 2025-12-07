/**
 * EmptyState - Legacy wrapper for EmptyState component
 * @deprecated Use EmptyState from '../ui/EmptyState' directly
 */
import React from 'react';
import { EmptyState as UIEmptyState } from '../ui/EmptyState';

interface EmptyStateProps {
  icon?: string;
  title: string;
  message?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ 
  icon = '📭', 
  title, 
  message 
}) => {
  return (
    <UIEmptyState
      icon={icon}
      title={title}
      message={message}
    />
  );
};

