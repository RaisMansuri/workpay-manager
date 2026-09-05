import React from 'react';
import { X, Printer, Phone, MapPin, Building2, Clock, RotateCcw, CheckCircle2, MessageSquare, Edit3 } from 'lucide-react';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { WORK_STATUS } from '../constants/serviceTypes';
import { smsService } from '../services/smsService';

export const CustomerDetailModal = ({ record, onClose, onEditRecord }) => {
  if (!record) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleSendWhatsApp = () => {
    const link = smsService.getWhatsAppLink(record);
    window.open(link, '_blank');
  };

  const hasBalance = record.remainingBalance > 0;

  const getModalStatusBadge = (status) => {
    switch (status) {
      case WORK_STATUS.PENDING:
        return (
          <span className="badge-lg status-badge-pending">
            Pending
          </span>
        );
      case WORK_STATUS.IN_PROGRESS:
        return (
          <span className="badge-lg status-badge-in-progress">
            In Progress
          </span>
        );
      case WORK_STATUS.COMPLETED:
        return (
          <span className="badge-lg status-badge-completed">
            Completed
          </span>
        );
      default:
        return <span className="badge-lg">{status}</span>;
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content ticket-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-header-brand">
            <Building2 className="brand-modal-icon" />
            <div>
              <h3>Seva Kendra Service Ticket</h3>
              <p className="text-muted text-xs">Service Request Receipt</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X className="icon-md" />
          </button>
        </div>

        {/* Modal Ticket Body */}
        <div className="modal-body printable-area">
          <div className="ticket-badge-row">
            <h4 className="font-bold">{record.customerName}</h4>
            {getModalStatusBadge(record.status)}
          </div>

          <div className="ticket-grid">
            <div className="ticket-section">
              <h5 className="ticket-section-title">Customer Information</h5>
              <div className="ticket-detail-item">
                <span className="detail-label">Full Name:</span>
                <span className="detail-value font-bold">{record.customerName}</span>
              </div>
              <div className="ticket-detail-item">
                <span className="detail-label">Mobile Number:</span>
                <span className="detail-value">
                  <Phone className="icon-xs inline-icon" />
                  {record.mobileNumber}
                </span>
              </div>
              <div className="ticket-detail-item">
                <span className="detail-label">Address:</span>
                <span className="detail-value">
                  <MapPin className="icon-xs inline-icon" />
                  {record.address || 'Not specified'}
                </span>
              </div>
            </div>

            <div className="ticket-section">
              <h5 className="ticket-section-title">Service Workflow Details</h5>
              <div className="ticket-detail-item">
                <span className="detail-label">Service Type:</span>
                <span className="detail-value highlight-service">{record.serviceType}</span>
              </div>
              <div className="ticket-detail-item">
                <span className="detail-label">Requirement:</span>
                <span className="detail-value font-bold text-primary">{record.requirement || '—'}</span>
              </div>
              <div className="ticket-detail-item">
                <span className="detail-label">Description:</span>
                <span className="detail-value">{record.workDescription || 'No additional notes'}</span>
              </div>
              <div className="ticket-detail-item">
                <span className="detail-label">Entry Date:</span>
                <span className="detail-value">{formatDateTime(record.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Payment Summary Box */}
          <div className="modal-billing-summary">
            <h5 className="ticket-section-title">Payment Summary</h5>
            <div className="billing-rows">
              <div className="billing-row">
                <span>Total Service Amount:</span>
                <span className="font-bold">{formatCurrency(record.totalAmount)}</span>
              </div>
              <div className="billing-row">
                <span>Amount Paid:</span>
                <span className="font-bold text-green">{formatCurrency(record.paidAmount)}</span>
              </div>
              <div className="billing-row remaining-row">
                <span>Remaining Due Balance:</span>
                <span className={`font-bold ${hasBalance ? 'text-red' : 'text-green'}`}>
                  {formatCurrency(record.remainingBalance)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="modal-footer">
          <button className="btn btn-whatsapp" onClick={handleSendWhatsApp} title="Send Ticket Message via WhatsApp">
            <MessageSquare className="icon-sm" />
            <span>Send WhatsApp / SMS</span>
          </button>

          <button className="btn btn-secondary" onClick={handlePrint}>
            <Printer className="icon-sm" />
            <span>Print Receipt</span>
          </button>

          <button 
            className="btn btn-primary"
            onClick={() => {
              onClose();
              onEditRecord(record);
            }}
          >
            <Edit3 className="icon-sm" />
            <span>Edit Record</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerDetailModal;
