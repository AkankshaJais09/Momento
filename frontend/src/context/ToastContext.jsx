// Toast Context providing interactive notification alerts across the application.
// Uses plain React useState, useEffect, and createContext with auto-dismissing timers.

import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  // Add a new toast notification (type: 'info' | 'success' | 'danger')
  const showToast = useCallback((message, type = 'info') => {
    const id = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto dismiss after 3.5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toasts.length > 0 && (
        <div className="toast-container" aria-live="polite">
          {toasts.map((t) => {
            let Icon = Info;
            let iconColor = 'var(--color-accent)';
            if (t.type === 'success') {
              Icon = CheckCircle2;
              iconColor = 'var(--color-success)';
            } else if (t.type === 'danger') {
              Icon = AlertCircle;
              iconColor = 'var(--color-danger)';
            }

            return (
              <div
                key={t.id}
                className={`toast toast-${t.type || 'info'}`}
                role="status"
              >
                <Icon size={18} color={iconColor} style={{ flexShrink: 0 }} />
                <span style={{ flex: 1, lineHeight: 1.4 }}>{t.message}</span>
                <button
                  type="button"
                  onClick={() => removeToast(t.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-text-muted)',
                    cursor: 'pointer',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  aria-label="Close notification"
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
