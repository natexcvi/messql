import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  text?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'small', 
  color = '#3b82f6',
  text 
}) => {
  const sizeMap = {
    small: 12,
    medium: 20,
    large: 32,
  };

  const spinnerSize = sizeMap[size];

  return (
    <div className="loading-spinner" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <div
        className="spinner"
        style={{
          width: spinnerSize,
          height: spinnerSize,
          border: `2px solid ${color}20`,
          borderTop: `2px solid ${color}`,
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}
      />
      {text && (
        <span style={{ fontSize: '10px', color }}>
          {text}
        </span>
      )}
    </div>
  );
};