import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

export const DeleteConfirmModal = ({ record, onClose, onConfirm }) => {
  if (!record) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content modal-sm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header header-danger">
          <div className="modal-header-brand">
            <AlertTriangle className="icon-lg text-danger" />
            <div>
              <h3>Confirm Record Deletion</h3>
              <p className="text-muted text-xs">This action cannot be undone</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X className="icon-md" />
          </button>
        </div>

        <div className="modal-body py-4">
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
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-danger" onClick={() => onConfirm(record.id)}>
            <Trash2 className="icon-sm" />
            <span>Delete Entry</span>
          </button>
        </div>
      </div>
    </div>
  );
};
