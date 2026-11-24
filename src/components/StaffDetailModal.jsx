import React, { useState, useEffect } from 'react';
import { 
  X, User, Mail, Phone, Shield, Calendar,
  CheckCircle2, XCircle, Lock, Activity, Trash2,
  Edit2, Check, Loader2, AlertCircle
} from 'lucide-react';
import { formatDateTime } from '../utils/formatters';

export const StaffDetailModal = ({ staff, onClose, onToggleStatus, onDeleteStaff, onUpdateEmail }) => {
  const [currentStaff, setCurrentStaff] = useState(staff || {});
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [emailInput, setEmailInput] = useState(staff?.email || '');
  const [emailError, setEmailError] = useState('');
  const [isSavingEmail, setIsSavingEmail] = useState(false);

  useEffect(() => {
    if (staff) {
      setCurrentStaff(staff);
      setEmailInput(staff.email || '');
      setIsEditingEmail(false);
      setEmailError('');
    }
  }, [staff]);

  if (!staff) return null;

  const isActive = currentStaff.status === 'active';
  const isAdmin = currentStaff.role === 'admin';

  const getInitials = (name) => {
    if (!name) return 'ST';
    const parts = name.trim().split(' ');
    return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
  };

  const getAvatarGradient = (name) => {
    const gradients = [
      'linear-gradient(135deg, #3b82f6, #1d4ed8)',
      'linear-gradient(135deg, #10b981, #047857)',
      'linear-gradient(135deg, #6366f1, #4338ca)',
      'linear-gradient(135deg, #f59e0b, #b45309)',
      'linear-gradient(135deg, #ec4899, #be185d)'
    ];
    let hash = 0;
    const str = name || 'Staff';
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return gradients[Math.abs(hash) % gradients.length];
  };

  const handleSaveEmail = async (e) => {
    if (e) e.preventDefault();
    setEmailError('');

    const clean = (emailInput || '').trim().toLowerCase();
    if (!clean) {
      setEmailError('Email Address cannot be empty.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!clean.includes('@') || !emailRegex.test(clean)) {
      setEmailError('Please enter a valid email address (e.g. name@domain.com).');
      return;
    }

    if (clean === currentStaff.email?.toLowerCase()) {
      setIsEditingEmail(false);
      return;
    }

    setIsSavingEmail(true);
    try {
      if (onUpdateEmail) {
        const res = await onUpdateEmail(currentStaff.id, clean);
        if (res && res.success) {
          setCurrentStaff((prev) => ({ ...prev, email: clean }));
          setIsEditingEmail(false);
        } else if (res && res.error) {
          setEmailError(res.error);
        }
      }
    } catch (err) {
      setEmailError(err.message || 'Failed to update email.');
    } finally {
      setIsSavingEmail(false);
    }
  };

  return (
    <div className="modal-overlay animate-fade-in" onClick={onClose}>
      <div className="modal-container staff-detail-modal-light animate-scale-up" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div 
              className="staff-modal-avatar-lg"
              style={{ background: getAvatarGradient(currentStaff.full_name) }}
            >
              {getInitials(currentStaff.full_name)}
            </div>
            <div>
              <div className="staff-modal-name-row">
                <h3 className="modal-title">{currentStaff.full_name}</h3>
                <span className={`badge-pill ${isActive ? 'pill-active' : 'pill-inactive'}`}>
                  <span className="pill-dot" />
                  {isActive ? 'Active User' : 'Inactive'}
                </span>
              </div>
              <p className="modal-subtitle">{currentStaff.email}</p>
            </div>
          </div>

          <button 
            type="button" 
            className="btn-close" 
            onClick={onClose}
            aria-label="Close modal"
          >
            <X className="icon-sm" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {/* Section 1: Role & Account Status Banner */}
          <div className="detail-banner-light mb-4">
            <div className="banner-item">
              <span className="banner-label">User Role</span>
              <div className={`role-tag ${isAdmin ? 'role-tag-admin' : 'role-tag-staff'}`}>
                <Shield className="icon-xs mr-1.5" />
                <span>{isAdmin ? 'Administrator' : 'Staff Member'}</span>
              </div>
            </div>

            <div className="banner-item">
              <span className="banner-label">Account Access Status</span>
              <div className={`status-tag ${isActive ? 'status-tag-active' : 'status-tag-inactive'}`}>
                {isActive ? <CheckCircle2 className="icon-xs mr-1.5" /> : <XCircle className="icon-xs mr-1.5" />}
                <span>{isActive ? 'Active (Full Access)' : 'Deactivated (Access Revoked)'}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Info Cards Grid (2-Column) */}
          <div className="staff-info-cards-grid-light">
            <div className="info-card-light">
              <div className="info-card-icon-box bg-blue">
                <User className="icon-sm" />
              </div>
              <div>
                <span className="info-card-label">Full Name</span>
                <p className="info-card-val">{currentStaff.full_name}</p>
              </div>
            </div>

            {/* Email Address Info Card with Inline Edit Mode */}
            <div className={`info-card-light ${isEditingEmail ? 'info-card-highlight' : ''}`}>
              <div className="info-card-icon-box bg-indigo">
                <Mail className="icon-sm" />
              </div>
              <div className="info-card-content-wrap">
                <div className="info-card-header-row">
                  <span className="info-card-label">Email Address</span>
                  {!isEditingEmail && (
                    <button
                      type="button"
                      className="btn-text-action"
                      onClick={() => {
                        setIsEditingEmail(true);
                        setEmailInput(currentStaff.email || '');
                        setEmailError('');
                      }}
                      title="Update Email Address"
                    >
                      <Edit2 className="icon-xs" />
                      <span>Edit</span>
                    </button>
                  )}
                </div>

                {isEditingEmail ? (
                  <form onSubmit={handleSaveEmail} className="edit-email-form">
                    <div className="edit-email-input-group">
                      <input
                        type="email"
                        className="form-input form-input-sm"
                        value={emailInput}
                        onChange={(e) => {
                          setEmailInput(e.target.value);
                          if (emailError) setEmailError('');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            setIsEditingEmail(false);
                            setEmailInput(currentStaff.email || '');
                            setEmailError('');
                          }
                        }}
                        placeholder="Enter new email address"
                        autoFocus
                        disabled={isSavingEmail}
                      />
                    </div>
                    {emailError && (
                      <p className="text-danger text-xs mt-1 mb-1 font-medium flex items-center gap-1">
                        <AlertCircle className="icon-xs flex-shrink-0" />
                        <span>{emailError}</span>
                      </p>
                    )}
                    <div className="edit-email-actions-row">
                      <button
                        type="submit"
                        className="btn btn-primary btn-sm"
                        disabled={isSavingEmail}
                      >
                        {isSavingEmail ? (
                          <>
                            <Loader2 className="icon-xs spinner-icon mr-1" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <Check className="icon-xs mr-1" />
                            <span>Save Email</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setIsEditingEmail(false);
                          setEmailInput(currentStaff.email || '');
                          setEmailError('');
                        }}
                        disabled={isSavingEmail}
                      >
                        <X className="icon-xs mr-1" />
                        <span>Cancel</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  <p className="info-card-val break-all" title={currentStaff.email}>
                    {currentStaff.email}
                  </p>
                )}
              </div>
            </div>

            <div className="info-card-light">
              <div className="info-card-icon-box bg-green">
                <Phone className="icon-sm" />
              </div>
              <div>
                <span className="info-card-label">Mobile Phone</span>
                <p className="info-card-val">{currentStaff.mobile || 'Not provided'}</p>
              </div>
            </div>

            <div className="info-card-light">
              <div className="info-card-icon-box bg-amber">
                <Calendar className="icon-sm" />
              </div>
              <div>
                <span className="info-card-label">Account Created</span>
                <p className="info-card-val">{formatDateTime(currentStaff.created_at)}</p>
              </div>
            </div>
          </div>

          {/* Section 3: Timestamps */}
          <div className="detail-box-light mt-4">
            <div className="detail-box-header">
              <Activity className="icon-xs text-primary" />
              <h4>Activity & Session Timestamps</h4>
            </div>
            <div className="timestamps-grid">
              <div className="timestamp-item">
                <span className="timestamp-label">Last Login:</span>
                <span className="timestamp-val">
                  {currentStaff.last_login_at ? formatDateTime(currentStaff.last_login_at) : 'No login recorded'}
                </span>
              </div>
              <div className="timestamp-item">
                <span className="timestamp-label">Last Logout:</span>
                <span className="timestamp-val">
                  {currentStaff.last_logout_at ? formatDateTime(currentStaff.last_logout_at) : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: Security Permissions */}
          <div className="detail-box-light mt-4">
            <div className="detail-box-header">
              <Lock className="icon-xs text-primary" />
              <h4>Security Permissions</h4>
            </div>
            <div className="permissions-checklist">
              <div className="permission-check-item allowed">
                <CheckCircle2 className="icon-xs check-icon text-success" />
                <span>Register new customer service entries</span>
              </div>
              <div className="permission-check-item allowed">
                <CheckCircle2 className="icon-xs check-icon text-success" />
                <span>View and edit customer service records</span>
              </div>
              <div className={`permission-check-item ${isAdmin ? 'allowed' : 'restricted'}`}>
                {isAdmin ? <CheckCircle2 className="icon-xs check-icon text-success" /> : <XCircle className="icon-xs cross-icon text-danger" />}
                <span>Delete customer records</span>
              </div>
              <div className={`permission-check-item ${isAdmin ? 'allowed' : 'restricted'}`}>
                {isAdmin ? <CheckCircle2 className="icon-xs check-icon text-success" /> : <XCircle className="icon-xs cross-icon text-danger" />}
                <span>Access Admin Portal & Staff Management</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          {/* Update Email ID button in footer */}
          <button
            type="button"
            className="btn btn-primary-outline"
            onClick={() => {
              setIsEditingEmail(true);
              setEmailInput(currentStaff.email || '');
              setEmailError('');
            }}
            title="Update Staff Email ID"
          >
            <Mail className="icon-xs mr-1.5" />
            <span>Update Email ID</span>
          </button>

          {onDeleteStaff && !isAdmin && (
            <button
              type="button"
              className="btn btn-danger-outline"
              onClick={() => {
                onDeleteStaff(currentStaff);
                onClose();
              }}
              title="Permanently delete staff account"
            >
              <Trash2 className="icon-xs mr-1.5" />
              <span>Delete Staff</span>
            </button>
          )}

          {onToggleStatus && !isAdmin && (
            <button
              type="button"
              className={`btn ${isActive ? 'btn-warning-outline' : 'btn-success-outline'}`}
              onClick={() => {
                onToggleStatus(currentStaff);
                onClose();
              }}
            >
              <span>{isActive ? 'Deactivate Account' : 'Activate Account'}</span>
            </button>
          )}

          <button
            type="button"
            className="btn btn-secondary ml-auto"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default StaffDetailModal;
