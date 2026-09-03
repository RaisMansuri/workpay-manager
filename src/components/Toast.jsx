import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export const Toast = ({ toast, onClose }) => {
  useEffect(() => {
    if (!toast) return;
    const duration = toast.type === 'warning' || toast.type === 'error' ? 6000 : 4000;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const icons = {
    success: <CheckCircle2 className="toast-icon text-success" />,
    error: <AlertCircle className="toast-icon text-danger" />,
    warning: <AlertTriangle className="toast-icon text-amber" />,
    info: <Info className="toast-icon text-info" />
  };

  return (
    <div className={`toast-notification toast-${toast.type || 'info'}`}>
      <div className="toast-content">
        {icons[toast.type] || icons.info}
        <span className="toast-message">{toast.message}</span>
      </div>
      <button className="toast-close" onClick={onClose} aria-label="Close notification">
        <X className="icon-xs" />
      </button>
    </div>
  );
};

export default Toast;
