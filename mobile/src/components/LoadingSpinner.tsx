/**
 * LoadingSpinner - Legacy wrapper for Loading component
 * @deprecated Use Loading from '../ui/Loading' directly
 */
import React from 'react';
import { Loading as UILoading } from '../ui/Loading';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'large';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  message, 
  size = 'large' 
}) => {
  return (
    <UILoading
      message={message}
      size={size}
    />
  );
};

