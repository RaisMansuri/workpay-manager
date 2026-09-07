import React, { useState } from 'react';
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react';

export const DeleteConfirmModal = ({ record, onClose, onConfirm, isDeleting: externalIsDeleting = false }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const deleting = isDeleting || externalIsDeleting;

  if (!record) return null;

  const handleDelete = async () => {
    if (deleting) return;
    setIsDeleting(true);
    try {
      await onConfirm(record.id);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={deleting ? undefined : onClose}>
      <div className={`modal-content modal-sm ${deleting ? 'panel-submitting-muted' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header header-danger">
          <div className="modal-header-brand">
            {deleting ? (
              <Loader2 className="icon-lg text-danger animate-spin" />
            ) : (
              <AlertTriangle className="icon-lg text-danger" />
            )}
            <div>
              <h3>Confirm Record Deletion</h3>
              <p className="text-muted text-xs">This action cannot be undone</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} disabled={deleting}>
            <X className="icon-md" />
          </button>
        </div>

        <div className={`modal-body py-4 ${deleting ? 'form-submitting-muted' : ''}`}>
          <p className="delete-warning-text">
            Are you sure you want to permanently delete customer entry for:
          </p>
          <div className="record-delete-preview">
            <div><strong>Name:</strong> {record.customerName}</div>
            <div><strong>Mobile:</strong> {record.mobileNumber}</div>
            <div><strong>Service:</strong> {record.serviceType}</div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={deleting}>
            Cancel
          </button>
          <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? (
              <>
                <Loader2 className="icon-sm animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="icon-sm" />
                <span>Delete Entry</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;
