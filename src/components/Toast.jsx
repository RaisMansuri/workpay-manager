import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const Toast = ({ toast, onClose }) => {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const icons = {
    success: <CheckCircle2 className="toast-icon text-success" />,
    error: <AlertCircle className="toast-icon text-danger" />,
    info: <Info className="toast-icon text-info" />
  };

  return (
    <div className={`toast-notification toast-${toast.type || 'success'}`}>
      <div className="toast-content">
        {icons[toast.type] || icons.info}
        <span className="toast-message">{toast.message}</span>
      </div>
      <button className="toast-close" onClick={onClose}>
        <X className="icon-xs" />
      </button>
    </div>
  );
};
