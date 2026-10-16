import React, { useState, useEffect } from 'react';
import {
  UserPlus, X, Mail, Phone, Lock, User, CheckCircle2,
  AlertCircle, AlertTriangle, Loader2, Eye, EyeOff, Check, Sparkles
} from 'lucide-react';
import { subscriptionService } from '../services/subscriptionService';

export const CreateStaffModal = ({ isOpen, onClose, onStaffCreated, currentStaffCount = null }) => {
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

  // Ensure form is completely blank whenever modal opens
  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateField = (field, value, allData = formData) => {
    if (field === 'fullName') {
      const trimmed = (value || '').trim();
      if (!trimmed) return 'User Name is required.';
      if (trimmed.length < 2) return 'User Name must be at least 2 characters.';
      return null;
    }

    if (field === 'email') {
      const trimmed = (value || '').trim();
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!trimmed) return 'Email Address is required.';
      if (!trimmed.includes('@')) return 'Email Address must include an "@" symbol (e.g. rahul@domain.com).';
      if (!emailRegex.test(trimmed)) return 'Please enter a valid email address (e.g. rahul@sevakendra.com).';
      return null;
    }

    if (field === 'mobile') {
      const trimmed = (value || '').trim();
      if (!trimmed) return 'Mobile Number is required.';
      if (trimmed.length !== 10) return 'Mobile number must be exactly 10 digits.';
      if (!/^[6-9]\d{9}$/.test(trimmed)) return 'Mobile number must start with 6, 7, 8, or 9 (10 digits).';
      return null;
    }

    if (field === 'password') {
      if (!value) return 'Password is required.';
      if (value.length < 6) return 'Password must be at least 6 characters long.';
      if (!/^[A-Z]/.test(value)) return 'First letter must be a Capital letter (e.g. Staff@123).';
      if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value)) return 'Must contain at least 1 special symbol (e.g. @, #, $).';
      if (!/[0-9]/.test(value)) return 'Must contain at least 1 number digit (e.g. 123).';
      return null;
    }

    if (field === 'confirmPassword') {
      if (!value) return 'Please confirm password.';
      if (value !== allData.password) return 'Passwords do not match. Both password fields must be identical.';
      return null;
    }

    return null;
  };

  const handleBlur = (field) => {
    const errorMsg = validateField(field, formData[field]);
    if (errorMsg) {
      setErrors(prev => ({ ...prev, [field]: errorMsg }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    ['fullName', 'email', 'mobile', 'password', 'confirmPassword'].forEach(field => {
      const err = validateField(field, formData[field]);
      if (err) newErrors[field] = err;
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      // Enforce subscription staff seat limit entitlement
      const limitCheck = await subscriptionService.checkCanAddStaffAsync(currentStaffCount);
      if (!limitCheck.allowed) {
        setErrors({
          submit: `Staff seat limit reached for ${limitCheck.planName} (${limitCheck.currentCount} of ${limitCheck.maxLimit} seats used). Please upgrade your subscription plan to add more staff.`
        });
        setIsSubmitting(false);
        return;
      }

      const result = await onStaffCreated({
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        mobile: formData.mobile.trim(),
        password: formData.password,
        role: 'staff',
        status: 'active'
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
              <h3 className="modal-title">Create Staff</h3>
              <p className="modal-subtitle">Add a staff member to access customer entry portal</p>
            </div>
          </div>
          <button type="button" className="btn-close" onClick={handleClose} aria-label="Close modal">
            <X className="icon-sm" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="modal-form-wrapper" autoComplete="off">
          {/* Decoy hidden inputs to prevent browser autofill from binding saved admin credentials */}
          <input type="text" name="prevent_autofill_user" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />
          <input type="password" name="prevent_autofill_pwd" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />

          <div className="modal-body">
            {errors.submit && (
              <div className={`alert-banner ${errors.submit.toLowerCase().includes('wait') ||
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
                <label className="form-label">
                  <User className="icon-xs text-primary" />
                  <span>User Name</span>
                  <span className="required-star">*</span>
                </label>
                <input
                  type="text"
                  name="staff_full_name"
                  autoComplete="off"
                  className={`form-control ${errors.fullName ? 'is-invalid' : ''}`}
                  placeholder="e.g. Rahul Sharma"
                  value={formData.fullName}
                  onChange={(e) => handleFieldChange('fullName', e.target.value)}
                  onBlur={() => handleBlur('fullName')}
                />
                {errors.fullName && <span className="invalid-feedback">{errors.fullName}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Mail className="icon-xs text-primary" />
                  <span>Email Address</span>
                  <span className="required-star">*</span>
                </label>
                <input
                  type="email"
                  name="staff_email_address"
                  autoComplete="off"
                  className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                  placeholder="e.g. rahul@sevakendra.com"
                  value={formData.email}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  onBlur={() => handleBlur('email')}
                />
                {errors.email && <span className="invalid-feedback">{errors.email}</span>}
              </div>

              {/* ROW 2: Mobile Number */}
              <div className="form-group full-width">
                <label className="form-label">
                  <Phone className="icon-xs text-primary" />
                  <span>Mobile Number</span>
                  <span className="required-star">*</span>
                </label>
                <input
                  type="tel"
                  name="staff_mobile_no"
                  autoComplete="off"
                  className={`form-control ${errors.mobile ? 'is-invalid' : ''}`}
                  placeholder="e.g. 9876543210 (10 digits)"
                  value={formData.mobile}
                  maxLength={10}
                  onChange={(e) => {
                    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
                    handleFieldChange('mobile', digitsOnly);
                  }}
                  onBlur={() => handleBlur('mobile')}
                />
                {errors.mobile && <span className="invalid-feedback">{errors.mobile}</span>}
              </div>

              {/* ROW 3: Password (with View Eye Toggle & Live Pattern Feedback) */}
              <div className="form-group">
                <label className="form-label">
                  <Lock className="icon-xs text-primary" />
                  <span>Password</span>
                  <span className="required-star">*</span>
                </label>
                <div className="input-with-eye-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="staff_new_password"
                    autoComplete="new-password"
                    className={`form-control ${isPasswordInvalidPattern || errors.password
                        ? 'is-invalid'
                        : isPasswordValidPattern
                          ? 'is-valid'
                          : ''
                      }`}
                    placeholder="e.g. Staff@123"
                    value={formData.password}
                    onChange={(e) => handleFieldChange('password', e.target.value)}
                    onBlur={() => handleBlur('password')}
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
                <label className="form-label">
                  <Lock className="icon-xs text-primary" />
                  <span>Confirm Password</span>
                  <span className="required-star">*</span>
                </label>
                <div className="input-with-eye-wrapper">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="staff_confirm_password"
                    autoComplete="new-password"
                    className={`form-control ${isPasswordMismatch || errors.confirmPassword
                        ? 'is-invalid'
                        : isPasswordMatch
                          ? 'is-valid'
                          : ''
                      }`}
                    placeholder="Re-enter password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleFieldChange('confirmPassword', e.target.value)}
                    onBlur={() => handleBlur('confirmPassword')}
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
