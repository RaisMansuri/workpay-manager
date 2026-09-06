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
    <div className="modal-overlay animate-fade-in" onClick={onClose}>
      <div className="modal-container ticket-detail-modal-light animate-scale-up" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge">
              <Building2 className="icon-md text-primary" />
            </div>
            <div>
              <h3 className="modal-title">Seva Kendra Service Ticket</h3>
              <p className="modal-subtitle">Service Request Receipt</p>
            </div>
          </div>
          <button className="btn-close" onClick={onClose} aria-label="Close modal">
            <X className="icon-sm" />
          </button>
        </div>

        {/* Modal Ticket Body */}
        <div className="modal-body printable-area">
          <div className="ticket-badge-row flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <h4 className="font-bold text-lg text-slate-900">{record.customerName}</h4>
            {getModalStatusBadge(record.status)}
          </div>

          <div className="ticket-sections-wrapper space-y-4">
            <div className="ticket-section detail-box-light mb-4">
              <h5 className="ticket-section-title font-bold text-xs uppercase tracking-wider text-slate-500 mb-3">Customer Information</h5>
              <div className="ticket-detail-item flex justify-between py-1 text-sm">
                <span className="detail-label text-slate-500">Full Name:</span>
                <span className="detail-value font-bold text-slate-900">{record.customerName}</span>
              </div>
              <div className="ticket-detail-item flex justify-between py-1 text-sm">
                <span className="detail-label text-slate-500">Mobile Number:</span>
                <span className="detail-value font-semibold text-slate-900 flex items-center gap-1">
                  <Phone className="icon-xs text-primary" />
                  {record.mobileNumber}
                </span>
              </div>
              <div className="ticket-detail-item flex justify-between py-1 text-sm">
                <span className="detail-label text-slate-500">Address:</span>
                <span className="detail-value font-semibold text-slate-900 flex items-center gap-1">
                  <MapPin className="icon-xs text-primary" />
                  {record.address || 'Not specified'}
                </span>
              </div>
            </div>

            <div className="ticket-section detail-box-light mb-4">
              <h5 className="ticket-section-title font-bold text-xs uppercase tracking-wider text-slate-500 mb-3">Service Workflow Details</h5>
              <div className="ticket-detail-item flex justify-between py-1 text-sm">
                <span className="detail-label text-slate-500">Service Type:</span>
                <span className="detail-value font-bold text-blue-600">{record.serviceType}</span>
              </div>
              <div className="ticket-detail-item flex justify-between py-1 text-sm">
                <span className="detail-label text-slate-500">Requirement:</span>
                <span className="detail-value font-bold text-primary">{record.requirement || '—'}</span>
              </div>
              <div className="ticket-detail-item flex justify-between py-1 text-sm">
                <span className="detail-label text-slate-500">Description:</span>
                <span className="detail-value font-medium text-slate-700">{record.workDescription || 'No additional notes'}</span>
              </div>
              <div className="ticket-detail-item flex justify-between py-1 text-sm">
                <span className="detail-label text-slate-500">Entry Date:</span>
                <span className="detail-value font-medium text-slate-700">{formatDateTime(record.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Payment Summary Box */}
          <div className="modal-billing-summary detail-box-light mt-4">
            <h5 className="ticket-section-title font-bold text-xs uppercase tracking-wider text-slate-500 mb-3">Payment Summary</h5>
            <div className="billing-rows space-y-2">
              <div className="billing-row flex justify-between text-sm">
                <span className="text-slate-600">Total Service Amount:</span>
                <span className="font-bold text-slate-900">{formatCurrency(record.totalAmount)}</span>
              </div>
              <div className="billing-row flex justify-between text-sm">
                <span className="text-slate-600">Amount Paid:</span>
                <span className="font-bold text-green-600">{formatCurrency(record.paidAmount)}</span>
              </div>
              <div className="billing-row remaining-row flex justify-between text-sm pt-2 border-t border-slate-200">
                <span className="font-bold text-slate-800">Remaining Due Balance:</span>
                <span className={`font-bold ${hasBalance ? 'text-red-600' : 'text-green-600'}`}>
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
