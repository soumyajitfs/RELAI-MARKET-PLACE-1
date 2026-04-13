import React, { useEffect, useState, useCallback } from 'react';
import { useAppContext } from '../../context/AppContext';

const Toast = () => {
  const { state, actions } = useAppContext();
  const { toast } = state;
  const [visible, setVisible] = useState(false);

  const dismiss = useCallback(() => {
    setVisible(false);
    // Small delay to let fade-out finish, then clear state
    setTimeout(() => {
      actions.hideToast();
    }, 300);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Show toast when state says so
  useEffect(() => {
    if (toast.show) {
      setVisible(true);
      const timer = setTimeout(() => {
        dismiss();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast.show, toast.message]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!toast.show && !visible) return null;

  const isSuccess = toast.type === 'success';
  const iconColor = isSuccess ? '#2e7d32' : '#FF9800';
  const borderColor = isSuccess ? '#4CAF50' : '#FF9800';
  const title = isSuccess ? 'Success' : 'Disclaimer';
  const body = toast.message;

  return (
    <div
      style={{
        position: 'fixed',
        top: '80px',
        right: '24px',
        zIndex: 9999,
      }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '12px',
          padding: '16px 20px',
          boxShadow: '0 10px 28px rgba(30,34,71,0.12), 0 4px 10px rgba(0,0,0,0.06)',
          borderLeft: `4px solid ${borderColor}`,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          minWidth: '320px',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateX(0)' : 'translateX(100%)',
          transition: 'all 0.3s ease',
        }}
      >
        <i
          className={isSuccess ? 'bi bi-check-circle-fill' : 'bi bi-exclamation-triangle-fill'}
          style={{ fontSize: '20px', color: iconColor, flexShrink: 0 }}
        ></i>
        <div style={{ flex: 1 }}>
          <strong style={{ display: 'block', fontSize: '14px', color: '#1E293B' }}>{title}</strong>
          <span style={{ fontSize: '13px', color: '#666' }}>{body}</span>
        </div>
        <div
          onClick={() => dismiss()}
          style={{ 
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            borderRadius: '6px',
            flexShrink: 0,
            fontSize: '16px',
            color: '#999',
            background: '#f3f4f6',
            border: 'none',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#e5e7eb';
            e.currentTarget.style.color = '#333';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#f3f4f6';
            e.currentTarget.style.color = '#999';
          }}
        >
          ✕
        </div>
      </div>
    </div>
  );
};

export default Toast;
