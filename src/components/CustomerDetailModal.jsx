import React from 'react';
import { X, Phone, MapPin, Building2, MessageSquare } from 'lucide-react';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { smsService } from '../services/smsService';

export const CustomerDetailModal = ({ record, onClose, onEditRecord }) => {
  if (!record) return null;

  const handleSendWhatsApp = () => {
    const link = smsService.getWhatsAppLink(record);
    window.open(link, '_blank');
  };

  const hasBalance = Number(record.remainingBalance) > 0;

  return (
    <div className="modal-overlay animate-fade-in" onClick={onClose}>
        <div
          className="modal-container seva-ticket-modal animate-scale-up"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
                <div className="seva-ticket-header">
                  <div className="seva-ticket-header-left">
                    <div className="seva-ticket-icon-box">
                      <Building2 size={20} strokeWidth={2.2} />
                    </div>
                    <div>
                      <h3 className="seva-ticket-title">Seva Kendra Service Ticket</h3>
                      <p className="seva-ticket-subtitle">Service Request Receipt</p>
                    </div>
                  </div>
                    <button className="seva-ticket-close-btn" onClick={onClose} aria-label="Close modal">
                      <X size={18} strokeWidth={2.2} />
                    </button>
                </div>

                {/* Modal Ticket Body */}
                    <div className="seva-ticket-body printable-area">
                      {/* Customer Name & Status Row */}
                      <div className="seva-ticket-top-row">
                        <h4 className="seva-ticket-customer-heading">{record.customerName}</h4>
                        <span className="seva-ticket-status-text">{record.status || 'In Progress'}</span>
                      </div>

                            {/* Two-Column Grid: Customer Information & Service Workflow Details */}
                            <div className="seva-ticket-grid">
                              {/* Column 1: Customer Information */}
                              <div className="seva-ticket-col">
                                <h5 className="seva-ticket-col-title">CUSTOMER INFORMATION</h5>

                                <div className="seva-ticket-row">
                                  <span className="seva-ticket-label">Full Name:</span>
                                  <span className="seva-ticket-val">{record.customerName}</span>
                                </div>

                                    <div className="seva-ticket-row">
                                      <span className="seva-ticket-label">Mobile Number:</span>
                                      <span className="seva-ticket-val seva-ticket-val-inline">
                                        <Phone size={13} strokeWidth={2.2} />
                                        <span>{record.mobileNumber}</span>
                                      </span>
                                    </div>

                                        <div className="seva-ticket-row">
                                          <span className="seva-ticket-label">Address:</span>
                                          <span className="seva-ticket-val-muted seva-ticket-val-inline">
                                            <MapPin size={13} strokeWidth={2.2} />
                                            <span>{record.address || 'Not specified'}</span>
                                          </span>
                                        </div>
                                    </div>

                                        {/* Column 2: Service Workflow Details */}
                                        <div className="seva-ticket-col">
                                          <h5 className="seva-ticket-col-title">SERVICE WORKFLOW DETAILS</h5>

                                          <div className="seva-ticket-row">
                                            <span className="seva-ticket-label">Service Type:</span>
                                            <span className="seva-ticket-val">{record.serviceType}</span>
                                          </div>

                                            <div className="seva-ticket-row">
                                              <span className="seva-ticket-label">Requirement:</span>
                                              <span className="seva-ticket-val">{record.requirement || 'Not specified'}</span>
                                            </div>

                                              <div className="seva-ticket-row">
                                                <span className="seva-ticket-label">Description:</span>
                                                <span className="seva-ticket-val" style={{ textTransform: 'uppercase' }}>
                                                  {record.workDescription || record.description || 'Not specified'}
                                                </span>
                                              </div>

                                                <div className="seva-ticket-row">
                                                  <span className="seva-ticket-label">Entry Date:</span>
                                                  <span className="seva-ticket-val-muted">{formatDateTime(record.createdAt)}</span>
                                                </div>
                                              </div>
                                            </div>

                                            {/* Payment Summary Box */}
                                                <div className="seva-ticket-payment-box">
                                                  <h5 className="seva-ticket-payment-title">PAYMENT SUMMARY</h5>

                                                  <div className="seva-ticket-payment-row">
                                                    <span className="seva-ticket-payment-label">Total Service Amount:</span>
                                                    <span className="seva-ticket-payment-val">{formatCurrency(record.totalAmount)}</span>
                                                  </div>

                                                  <div className="seva-ticket-payment-row">
                                                    <span className="seva-ticket-payment-label">Amount Paid:</span>
                                                    <span className="seva-ticket-payment-val-green">{formatCurrency(record.paidAmount)}</span>
                                                  </div>

                                                  <hr className="seva-ticket-dotted-divider" />

                                                  <div className="seva-ticket-payment-row">
                                                    <span className="seva-ticket-payment-label">Remaining Due Balance:</span>
                                                    <span className={hasBalance ? 'seva-ticket-payment-val-red' : 'seva-ticket-payment-val-green'}>
                                                      {formatCurrency(record.remainingBalance)}
                                                    </span>
                                                  </div>
                                                </div>
                                              </div>

                                                {/* Modal Footer: Only Send WhatsApp / SMS button */}
                                                <div className="seva-ticket-footer">
                                                  <button
                                                    type="button"
                                                    className="seva-ticket-whatsapp-btn"
                                                    onClick={handleSendWhatsApp}
                                                    title="Send Ticket Message via WhatsApp"
                                                  >
                                                    <MessageSquare size={16} strokeWidth={2.2} />
                                                    <span>Send WhatsApp / SMS</span>
                                                  </button>
                                                </div>
                                              </div>
                                            </div>
                                            );
};

                                            export default CustomerDetailModal;
