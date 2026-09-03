import React, { useState } from 'react';
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

  if (!isOpen || !staff) return null;

  const isPasswordEntered = newPassword.length > 0;
  const isConfirmEntered = confirmPassword.length > 0;
  const isPasswordMatch = isPasswordEntered && isConfirmEntered && newPassword === confirmPassword;
  const isPasswordMismatch = isConfirmEntered && newPassword !== confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!newPassword) {
      setErrorMsg('Please enter a new password.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (!/^[A-Z]/.test(newPassword)) {
      setErrorMsg('First letter must be a Capital letter (e.g. Staff@123).');
      return;
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword)) {
      setErrorMsg('Must contain at least 1 special symbol (e.g. @, #, $).');
      return;
    }

    if (!/[0-9]/.test(newPassword)) {
      setErrorMsg('Must contain at least 1 number digit (e.g. 123).');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await staffService.updateStaffPasswordAsync(staff.id, newPassword);
      if (res.success) {
        onSuccess(`Password updated successfully for ${staff.full_name}!`);
        onClose();
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setErrorMsg(res.error || 'Failed to update password.');
      }
    } catch (err) {
      console.error('Failed to reset password:', err);
      setErrorMsg('An unexpected error occurred while resetting password.');
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
                <Lock className="icon-xs text-primary mr-1" /> New Password
              </label>
              <div className="input-with-eye-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-control"
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
                >
                  {showPassword ? <EyeOff className="icon-xs" /> : <Eye className="icon-xs" />}
                </button>
              </div>
            </div>

            {/* Field 2: Confirm New Password */}
            <div className="form-group">
              <label className="form-label required">
                <Lock className="icon-xs text-primary mr-1" /> Confirm New Password
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
                >
                  {showConfirmPassword ? <EyeOff className="icon-xs" /> : <Eye className="icon-xs" />}
                </button>
              </div>

              {/* Match Feedback */}
              {isPasswordMatch && (
                <span className="password-match-success">
                  <Check className="icon-xs mr-1" /> Passwords match perfectly
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
              disabled={isSubmitting || isPasswordMismatch || !newPassword}
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
