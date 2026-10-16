import React, { useState, useEffect } from 'react';
import { 
  KeyRound, X, Lock, Eye, EyeOff, Check, AlertCircle, Loader2 
} from 'lucide-react';
import { staffService } from '../services/staffService';

export const ResetPasswordModal = ({ isOpen, staff, onClose, onSuccess }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Reset all state when modal opens or staff changes
  useEffect(() => {
    if (isOpen) {
      setNewPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setShowConfirmPassword(false);
      setErrorMsg('');
      setIsSubmitting(false);
    }
  }, [isOpen, staff]);

  if (!isOpen || !staff) return null;

  const isPasswordEntered = newPassword.length > 0;
  const isConfirmEntered = confirmPassword.length > 0;
  const isLengthValid = newPassword.length >= 6;
  const isPasswordMatch = isPasswordEntered && isConfirmEntered && newPassword === confirmPassword;
  const isPasswordMismatch = isConfirmEntered && newPassword !== confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedPassword = newPassword.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (!trimmedPassword) {
      setErrorMsg('Please enter a new password.');
      return;
    }

    if (trimmedPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (trimmedPassword !== trimmedConfirm) {
      setErrorMsg('Passwords do not match. Please re-enter matching passwords.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await staffService.updateStaffPasswordAsync(
        staff.id, 
        trimmedPassword, 
        staff.email
      );

      if (res.success) {
        onSuccess(res.message || `Password updated successfully for ${staff.full_name || staff.email}!`);
        onClose();
      } else {
        setErrorMsg(res.error || 'Failed to update password. Please try again.');
      }
    } catch (err) {
      console.error('Failed to reset password:', err);
      setErrorMsg(err.message || 'An unexpected error occurred while resetting password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay animate-fade-in" onClick={onClose}>
      <div 
        className="modal-container reset-password-modal-box animate-scale-up" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge bg-amber-light text-amber">
              <KeyRound className="icon-md" />
            </div>
            <div>
              <h3 className="modal-title">Reset Staff Password</h3>
              <p className="modal-subtitle">
                Set a new access password for <strong>{staff.full_name}</strong> ({staff.email})
              </p>
            </div>
          </div>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Close modal">
            <X className="icon-sm" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="modal-body py-4">
            {errorMsg && (
              <div className="alert-box alert-error mb-4">
                <AlertCircle className="icon-sm mr-2 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Field 1: New Password */}
            <div className="form-group mb-4">
              <label className="form-label required">
                <Lock className="icon-xs text-primary mr-1" />
                <span>New Password <span className="required-star">*</span></span>
              </label>
              <div className="input-with-eye-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={`form-control ${isLengthValid ? 'is-valid' : ''}`}
                  placeholder="Enter new password (min. 6 chars)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoFocus
                />
                <button
                  type="button"
                  className="btn-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Hide password' : 'View password'}
                  aria-label="Toggle new password visibility"
                >
                  {showPassword ? <EyeOff className="icon-xs" /> : <Eye className="icon-xs" />}
                </button>
              </div>

              {/* Live Rule Feedback */}
              {isPasswordEntered && (
                <div className="password-hint-group mt-1">
                  <span className={`text-xs flex items-center ${isLengthValid ? 'text-success' : 'text-muted'}`}>
                    <Check className={`icon-xs mr-1 ${isLengthValid ? 'text-success' : 'text-muted'}`} />
                    Minimum 6 characters
                  </span>
                </div>
              )}
            </div>

            {/* Field 2: Confirm New Password */}
            <div className="form-group">
              <label className="form-label required">
                <Lock className="icon-xs text-primary mr-1" />
                <span>Confirm New Password <span className="required-star">*</span></span>
              </label>
              <div className="input-with-eye-wrapper">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  className={`form-control ${
                    isPasswordMismatch ? 'is-invalid' : isPasswordMatch ? 'is-valid' : ''
                  }`}
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="btn-password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  title={showConfirmPassword ? 'Hide confirm password' : 'View confirm password'}
                  aria-label="Toggle confirm password visibility"
                >
                  {showConfirmPassword ? <EyeOff className="icon-xs" /> : <Eye className="icon-xs" />}
                </button>
              </div>

              {/* Match Feedback */}
              {isPasswordMatch && (
                <span className="password-match-success">
                  <Check className="icon-xs mr-1" /> Passwords match
                </span>
              )}
              {isPasswordMismatch && (
                <span className="invalid-feedback">
                  <AlertCircle className="icon-xs mr-1 inline" /> Passwords do not match
                </span>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer-clean">
            <button
              type="button"
              className="btn btn-secondary-outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn btn-primary btn-save-staff"
              disabled={isSubmitting || isPasswordMismatch || !isLengthValid}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="icon-sm spinner-icon mr-2" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <span>Update Password</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordModal;
