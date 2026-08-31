import React, { useState, useEffect } from 'react';
import { 
  UserPlus, Save, RotateCcw, Calculator, FileText, Phone, User, MapPin, 
  IndianRupee, CheckCircle2, Clock, Layers, CreditCard, X 
} from 'lucide-react';
import { SEVA_SERVICES, WORK_STATUS } from '../constants/serviceTypes';
import { formatCurrency, generateNextCustomerId } from '../utils/formatters';

export const CustomerForm = ({ 
  isOpen, 
  onClose, 
  editingRecord, 
  onSave, 
  onCancelEdit, 
  existingRecords = [] 
}) => {
  const [formData, setFormData] = useState({
    id: '',
    customerName: '',
    mobileNumber: '',
    address: '',
    serviceType: SEVA_SERVICES[0],
    customServiceType: '',
    workDescription: '',
    status: WORK_STATUS.PENDING,
    totalAmount: '',
    paidAmount: ''
  });

  const [errors, setErrors] = useState({});
  const [isCustomService, setIsCustomService] = useState(false);

  // Close drawer on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Auto-generate ID or populate edit data when drawer opens or editingRecord changes
  useEffect(() => {
    if (editingRecord) {
      const isCustom = !SEVA_SERVICES.includes(editingRecord.serviceType);
      setFormData({
        id: editingRecord.id || '',
        customerName: editingRecord.customerName || '',
        mobileNumber: editingRecord.mobileNumber || '',
        address: editingRecord.address || '',
        serviceType: isCustom ? 'Other Custom Service' : editingRecord.serviceType,
        customServiceType: isCustom ? editingRecord.serviceType : '',
        workDescription: editingRecord.workDescription || '',
        status: editingRecord.status || WORK_STATUS.PENDING,
        totalAmount: editingRecord.totalAmount !== undefined ? editingRecord.totalAmount : '',
        paidAmount: editingRecord.paidAmount !== undefined ? editingRecord.paidAmount : ''
      });
      setIsCustomService(isCustom);
    } else {
      setFormData({
        id: generateNextCustomerId(existingRecords),
        customerName: '',
        mobileNumber: '',
        address: '',
        serviceType: SEVA_SERVICES[0],
        customServiceType: '',
        workDescription: '',
        status: WORK_STATUS.PENDING,
        totalAmount: '',
        paidAmount: ''
      });
      setIsCustomService(false);
    }
    setErrors({});
  }, [editingRecord, existingRecords.length, isOpen]);

  if (!isOpen) return null;

  // Calculate remaining balance dynamically
  const total = Number(formData.totalAmount) || 0;
  const paid = Number(formData.paidAmount) || 0;
  const remainingBalance = Math.max(0, total - paid);

  const handleServiceTypeChange = (e) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, serviceType: value }));
    if (value === 'Other Custom Service') {
      setIsCustomService(true);
    } else {
      setIsCustomService(false);
      setFormData((prev) => ({ ...prev, customServiceType: '' }));
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.customerName.trim()) {
      newErrors.customerName = 'Customer Name is required';
    }

    if (!formData.mobileNumber.trim()) {
      newErrors.mobileNumber = 'Mobile Number is required';
    } else if (!/^[0-9]{10}$/.test(formData.mobileNumber.trim())) {
      newErrors.mobileNumber = 'Please enter a valid 10-digit mobile number';
    }

    if (isCustomService && !formData.customServiceType.trim()) {
      newErrors.customServiceType = 'Please specify custom service type';
    }

    if (formData.totalAmount === '' || isNaN(formData.totalAmount) || Number(formData.totalAmount) < 0) {
      newErrors.totalAmount = 'Valid Total Amount is required';
    }

    if (formData.paidAmount === '' || isNaN(formData.paidAmount) || Number(formData.paidAmount) < 0) {
      newErrors.paidAmount = 'Valid Paid Amount is required';
    } else if (Number(formData.paidAmount) > Number(formData.totalAmount)) {
      newErrors.paidAmount = 'Paid Amount cannot exceed Total Amount';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const finalServiceType = isCustomService 
      ? formData.customServiceType.trim() 
      : formData.serviceType;

    const recordToSave = {
      id: formData.id || generateNextCustomerId(existingRecords),
      customerName: formData.customerName.trim(),
      mobileNumber: formData.mobileNumber.trim(),
      address: formData.address.trim(),
      serviceType: finalServiceType,
      workDescription: formData.workDescription.trim(),
      status: formData.status,
      totalAmount: Number(formData.totalAmount),
      paidAmount: Number(formData.paidAmount),
      remainingBalance: remainingBalance
    };

    onSave(recordToSave, !!editingRecord);
  };

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="drawer-header">
          <div className="drawer-title-group">
            <div className="drawer-header-icon-box">
              <UserPlus className="icon-md" />
            </div>
            <h3>{editingRecord ? 'Edit Customer Entry' : 'New Customer Entry'}</h3>
          </div>
          <button className="drawer-close-btn" onClick={onClose} title="Close Drawer (Esc)">
            <X className="icon-sm" />
          </button>
        </div>

        {/* Drawer Form Body */}
        <form onSubmit={handleSubmit} className="drawer-form">
          <div className="drawer-body-scroll">
            {/* SECTION 1: Customer Details */}
            <div className="form-section">
              <div className="form-section-title-row">
                <User className="form-section-icon" />
                <span className="form-section-title">👤 Customer Details</span>
              </div>

              <div className="form-row form-row-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="customerName">
                    <User className="input-icon" />
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    id="customerName"
                    className={`form-control ${errors.customerName ? 'is-invalid' : ''}`}
                    value={formData.customerName}
                    onChange={(e) => handleInputChange('customerName', e.target.value)}
                    placeholder="Full name"
                    autoFocus
                  />
                  {errors.customerName && <span className="invalid-feedback">{errors.customerName}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="mobileNumber">
                    <Phone className="input-icon" />
                    Mobile Number *
                  </label>
                  <input
                    type="tel"
                    id="mobileNumber"
                    className={`form-control ${errors.mobileNumber ? 'is-invalid' : ''}`}
                    value={formData.mobileNumber}
                    maxLength={10}
                    onChange={(e) => handleInputChange('mobileNumber', e.target.value.replace(/\D/g, ''))}
                    placeholder="10-digit number"
                  />
                  {errors.mobileNumber && <span className="invalid-feedback">{errors.mobileNumber}</span>}
                </div>
              </div>

              <div className="form-group mb-0">
                <label className="form-label" htmlFor="address">
                  <MapPin className="input-icon" />
                  Address / Locality / Village
                </label>
                <input
                  type="text"
                  id="address"
                  className="form-control"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="City, ward, village or street area"
                />
              </div>
            </div>

            {/* SECTION 2: Service Details */}
            <div className="form-section">
              <div className="form-section-title-row">
                <Layers className="form-section-icon" />
                <span className="form-section-title">📄 Service Details</span>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="serviceType">
                  Service Type *
                </label>
                <select
                  id="serviceType"
                  className="form-select"
                  value={formData.serviceType}
                  onChange={handleServiceTypeChange}
                >
                  {SEVA_SERVICES.map((service) => (
                    <option key={service} value={service}>
                      {service}
                    </option>
                  ))}
                </select>
              </div>

              {isCustomService && (
                <div className="form-group">
                  <label className="form-label" htmlFor="customServiceType">
                    Specify Custom Service *
                  </label>
                  <input
                    type="text"
                    id="customServiceType"
                    className={`form-control ${errors.customServiceType ? 'is-invalid' : ''}`}
                    value={formData.customServiceType}
                    onChange={(e) => handleInputChange('customServiceType', e.target.value)}
                    placeholder="Enter custom service name"
                  />
                  {errors.customServiceType && <span className="invalid-feedback">{errors.customServiceType}</span>}
                </div>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="workDescription">
                  <FileText className="input-icon" />
                  Work Description / Notes
                </label>
                <textarea
                  id="workDescription"
                  rows={2}
                  className="form-control"
                  value={formData.workDescription}
                  onChange={(e) => handleInputChange('workDescription', e.target.value)}
                  placeholder="e.g. Light bill copy attached, urgent delivery"
                />
              </div>

              <div className="form-group mb-0">
                <label className="form-label">
                  Work Status *
                </label>
                <div className="status-selector-grid">
                  <button
                    type="button"
                    className={`status-option-btn status-pending ${formData.status === WORK_STATUS.PENDING ? 'active' : ''}`}
                    onClick={() => handleInputChange('status', WORK_STATUS.PENDING)}
                  >
                    <Clock className="icon-xs" />
                    <span>Pending</span>
                  </button>

                  <button
                    type="button"
                    className={`status-option-btn status-in-progress ${formData.status === WORK_STATUS.IN_PROGRESS ? 'active' : ''}`}
                    onClick={() => handleInputChange('status', WORK_STATUS.IN_PROGRESS)}
                  >
                    <RotateCcw className="icon-xs spin-slow" />
                    <span>In Progress</span>
                  </button>

                  <button
                    type="button"
                    className={`status-option-btn status-completed ${formData.status === WORK_STATUS.COMPLETED ? 'active' : ''}`}
                    onClick={() => handleInputChange('status', WORK_STATUS.COMPLETED)}
                  >
                    <CheckCircle2 className="icon-xs" />
                    <span>Completed</span>
                  </button>
                </div>
              </div>
            </div>

            {/* SECTION 3: Payment Details */}
            <div className="form-section">
              <div className="form-section-title-row">
                <CreditCard className="form-section-icon" />
                <span className="form-section-title">💰 Payment Details</span>
              </div>

              <div className="billing-section-box">
                <div className="form-row form-row-2">
                  <div className="form-group mb-0">
                    <label className="form-label" htmlFor="totalAmount">
                      <IndianRupee className="input-icon" />
                      Total Amount (₹) *
                    </label>
                    <input
                      type="number"
                      id="totalAmount"
                      min="0"
                      className={`form-control ${errors.totalAmount ? 'is-invalid' : ''}`}
                      value={formData.totalAmount}
                      onChange={(e) => handleInputChange('totalAmount', e.target.value)}
                      placeholder="0"
                    />
                    {errors.totalAmount && <span className="invalid-feedback">{errors.totalAmount}</span>}
                  </div>

                  <div className="form-group mb-0">
                    <label className="form-label" htmlFor="paidAmount">
                      <IndianRupee className="input-icon" />
                      Paid Amount (₹) *
                    </label>
                    <input
                      type="number"
                      id="paidAmount"
                      min="0"
                      className={`form-control ${errors.paidAmount ? 'is-invalid' : ''}`}
                      value={formData.paidAmount}
                      onChange={(e) => handleInputChange('paidAmount', e.target.value)}
                      placeholder="0"
                    />
                    {errors.paidAmount && <span className="invalid-feedback">{errors.paidAmount}</span>}
                  </div>
                </div>

                {/* Dynamic Calculated Remaining Balance Display */}
                <div className={`remaining-balance-display ${remainingBalance > 0 ? 'has-balance' : 'zero-balance'}`}>
                  <div className="balance-info">
                    <Calculator className="icon-sm" />
                    <span>Remaining Balance:</span>
                  </div>
                  <div className="balance-value">
                    {formatCurrency(remainingBalance)}
                    {remainingBalance > 0 ? (
                      <span className="balance-tag tag-due">Due</span>
                    ) : (
                      <span className="balance-tag tag-paid">Paid</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sticky Drawer Footer */}
          <div className="drawer-footer-sticky">
            <button type="submit" className="btn-submit-main flex-1">
              <Save className="icon-md" />
              <span>{editingRecord ? 'UPDATE CUSTOMER ENTRY' : 'SAVE CUSTOMER ENTRY'}</span>
            </button>

            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerForm;
