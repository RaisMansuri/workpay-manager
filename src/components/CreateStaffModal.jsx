import React, { useState } from 'react';
import { 
  UserPlus, X, Mail, Phone, Lock, User, CheckCircle2, 
  AlertCircle, AlertTriangle, Loader2, Eye, EyeOff, Check 
} from 'lucide-react';

export const CreateStaffModal = ({ isOpen, onClose, onStaffCreated }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    mobile: '',
    password: '',
    confirmPassword: '',
    role: 'staff',
    status: 'active'
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setFormData({
      fullName: '',
      email: '',
      mobile: '',
      password: '',
      confirmPassword: '',
      role: 'staff',
      status: 'active'
    });
    setErrors({});
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'User Name is required.';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email Address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (formData.mobile && formData.mobile.length !== 10) {
      newErrors.mobile = 'Mobile number must be exactly 10 digits.';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required.';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long.';
    } else if (!/^[A-Z]/.test(formData.password)) {
      newErrors.password = 'First letter must be a Capital letter (e.g. Staff@123).';
    } else if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password)) {
      newErrors.password = 'Must contain at least 1 special symbol (e.g. @, #, $).';
    } else if (!/[0-9]/.test(formData.password)) {
      newErrors.password = 'Must contain at least 1 number digit (e.g. 123).';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm password.';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match. Both password fields must be identical.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const result = await onStaffCreated({
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        mobile: formData.mobile.trim(),
        password: formData.password,
        role: 'staff',
        status: formData.status
      });

      if (result?.success) {
        resetForm();
        onClose();
      } else if (result?.error) {
        setErrors({ submit: result.error });
      }
    } catch (err) {
      setErrors({ submit: err.message || 'An unexpected error occurred.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Live password validation state helpers
  const pwd = formData.password;
  const isPasswordEntered = pwd.length > 0;
  const hasCapital = /^[A-Z]/.test(pwd);
  const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd);
  const hasNumber = /[0-9]/.test(pwd);
  const hasLength = pwd.length >= 6;
  const isPasswordValidPattern = isPasswordEntered && hasCapital && hasSymbol && hasNumber && hasLength;
  const isPasswordInvalidPattern = isPasswordEntered && (!hasCapital || !hasSymbol || !hasNumber || !hasLength);

  // Live password matching state helper
  const isConfirmEntered = formData.confirmPassword.length > 0;
  const isPasswordMatch = isConfirmEntered && formData.password === formData.confirmPassword;
  const isPasswordMismatch = isConfirmEntered && formData.password !== formData.confirmPassword;

  if (!isOpen) return null;

  return (
    <div className="modal-overlay animate-fade-in" onClick={handleClose}>
      <div 
        className="modal-container staff-form-modal animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge">
              <UserPlus className="icon-md text-primary" />
            </div>
            <div>
              <h3 className="modal-title">Create New Staff Member</h3>
              <p className="modal-subtitle">Add a staff member to access customer entry portal</p>
            </div>
          </div>
          <button type="button" className="btn-close" onClick={handleClose} aria-label="Close modal">
            <X className="icon-sm" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="modal-form-wrapper">
          <div className="modal-body">
            {errors.submit && (
              <div className={`alert-banner ${
                errors.submit.toLowerCase().includes('wait') || 
                errors.submit.toLowerCase().includes('too many') || 
                errors.submit.toLowerCase().includes('rate limit') 
                  ? 'alert-warning' 
                  : 'alert-error'
              } mb-4`}>
                {errors.submit.toLowerCase().includes('wait') || 
                errors.submit.toLowerCase().includes('too many') || 
                errors.submit.toLowerCase().includes('rate limit') ? (
                  <AlertTriangle className="icon-sm text-amber shrink-0" />
                ) : (
                  <AlertCircle className="icon-sm text-danger shrink-0" />
                )}
                <span>{errors.submit}</span>
              </div>
            )}

            {/* Clean 3-Row 2-Column Responsive Grid */}
            <div className="form-grid-2col">
              {/* ROW 1: User Name & Email Address */}
              <div className="form-group">
                <label className="form-label required">
                  <User className="icon-xs text-primary" /> User Name
                </label>
                <input
                  type="text"
                  className={`form-control ${errors.fullName ? 'is-invalid' : ''}`}
                  placeholder="e.g. Rahul Sharma"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                />
                {errors.fullName && <span className="invalid-feedback">{errors.fullName}</span>}
              </div>

              <div className="form-group">
                <label className="form-label required">
                  <Mail className="icon-xs text-primary" /> Email Address
                </label>
                <input
                  type="email"
                  className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                  placeholder="e.g. rahul@sevakendra.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
                {errors.email && <span className="invalid-feedback">{errors.email}</span>}
              </div>

              {/* ROW 2: Mobile Number & Account Status */}
              <div className="form-group">
                <label className="form-label">
                  <Phone className="icon-xs text-primary" /> Mobile Number
                </label>
                <input
                  type="tel"
                  className={`form-control ${errors.mobile ? 'is-invalid' : ''}`}
                  placeholder="e.g. 9876543210 (10 digits)"
                  value={formData.mobile}
                  maxLength={10}
                  onChange={(e) => {
                    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setFormData({ ...formData, mobile: digitsOnly });
                  }}
                />
                {errors.mobile && <span className="invalid-feedback">{errors.mobile}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">
                  <CheckCircle2 className="icon-xs text-primary" /> Account Status
                </label>
                <select
                  className="form-select"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="active">Active (Can log in)</option>
                  <option value="inactive">Inactive (Access blocked)</option>
                </select>
              </div>

              {/* ROW 3: Password (with View Eye Toggle & Live Pattern Feedback) */}
              <div className="form-group">
                <label className="form-label required">
                  <Lock className="icon-xs text-primary" /> Password
                </label>
                <div className="input-with-eye-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className={`form-control ${
                      isPasswordInvalidPattern || errors.password 
                        ? 'is-invalid' 
                        : isPasswordValidPattern 
                        ? 'is-valid' 
                        : ''
                    }`}
                    placeholder="e.g. Staff@123"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                  <button
                    type="button"
                    className="btn-password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? 'Hide password' : 'View password'}
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="icon-xs" /> : <Eye className="icon-xs" />}
                  </button>
                </div>
                {errors.password && <span className="invalid-feedback">{errors.password}</span>}
                
                {/* Live Password Format Pattern Indicators */}
                {isPasswordInvalidPattern && !errors.password && (
                  <div className="invalid-feedback text-xs mt-1">
                    {!hasCapital && <div>• 1st letter must be Capital (A-Z)</div>}
                    {!hasSymbol && <div>• Must contain at least 1 special symbol (@, #, $)</div>}
                    {!hasNumber && <div>• Must contain at least 1 number (0-9)</div>}
                    {!hasLength && <div>• Must be at least 6 characters long</div>}
                  </div>
                )}

                {isPasswordValidPattern && (
                  <span className="valid-feedback flex items-center gap-1 text-xs text-green font-medium mt-1">
                    <Check className="icon-xs" /> Valid password format (e.g. Staff@123)
                  </span>
                )}
              </div>

              {/* ROW 3: Confirm Password (with View Eye Toggle & Live Match Indicator) */}
              <div className="form-group">
                <label className="form-label required">
                  <Lock className="icon-xs text-primary" /> Confirm Password
                </label>
                <div className="input-with-eye-wrapper">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    className={`form-control ${
                      isPasswordMismatch || errors.confirmPassword 
                        ? 'is-invalid' 
                        : isPasswordMatch 
                        ? 'is-valid' 
                        : ''
                    }`}
                    placeholder="Re-enter password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  />
                  <button
                    type="button"
                    className="btn-password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    title={showConfirmPassword ? 'Hide password' : 'View password'}
                    aria-label="Toggle confirm password visibility"
                  >
                    {showConfirmPassword ? <EyeOff className="icon-xs" /> : <Eye className="icon-xs" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <span className="invalid-feedback">{errors.confirmPassword}</span>
                )}
                {isPasswordMatch && (
                  <span className="valid-feedback flex items-center gap-1 text-xs text-green font-medium mt-1">
                    <Check className="icon-xs" /> Passwords match perfectly
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Dedicated Modal Footer Bar */}
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-cancel-modal"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn btn-save-staff-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="icon-sm spin-slow mr-2" />
                  Creating Staff...
                </>
              ) : (
                'Save'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateStaffModal;
