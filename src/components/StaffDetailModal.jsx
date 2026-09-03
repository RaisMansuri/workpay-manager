import React from 'react';
import { 
  X, User, Mail, Phone, Shield, Calendar, Clock, 
  CheckCircle2, XCircle, FileText, Lock, Activity
} from 'lucide-react';
import { formatDateTime } from '../utils/formatters';

export const StaffDetailModal = ({ staff, onClose, onToggleStatus }) => {
  if (!staff) return null;

  const isActive = staff.status === 'active';
  const isAdmin = staff.role === 'admin';

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

  return (
    <div className="modal-overlay animate-fade-in" onClick={onClose}>
      <div className="modal-container staff-detail-modal-light animate-scale-up" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div 
              className="staff-modal-avatar-lg"
              style={{ background: getAvatarGradient(staff.full_name) }}
            >
              {getInitials(staff.full_name)}
            </div>
            <div>
              <div className="staff-modal-name-row">
                <h3 className="modal-title">{staff.full_name}</h3>
                <span className={`badge-pill ${isActive ? 'pill-active' : 'pill-inactive'}`}>
                  <span className="pill-dot" />
                  {isActive ? 'Active User' : 'Inactive'}
                </span>
              </div>
              <p className="modal-subtitle">{staff.email}</p>
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
                <p className="info-card-val">{staff.full_name}</p>
              </div>
            </div>

            <div className="info-card-light">
              <div className="info-card-icon-box bg-indigo">
                <Mail className="icon-sm" />
              </div>
              <div>
                <span className="info-card-label">Email Address</span>
                <p className="info-card-val truncate" title={staff.email}>{staff.email}</p>
              </div>
            </div>

            <div className="info-card-light">
              <div className="info-card-icon-box bg-green">
                <Phone className="icon-sm" />
              </div>
              <div>
                <span className="info-card-label">Mobile Phone</span>
                <p className="info-card-val">{staff.mobile || 'Not provided'}</p>
              </div>
            </div>

            <div className="info-card-light">
              <div className="info-card-icon-box bg-amber">
                <Calendar className="icon-sm" />
              </div>
              <div>
                <span className="info-card-label">Account Created</span>
                <p className="info-card-val">{formatDateTime(staff.created_at)}</p>
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
                  {staff.last_login_at ? formatDateTime(staff.last_login_at) : 'No login recorded'}
                </span>
              </div>
              <div className="timestamp-item">
                <span className="timestamp-label">Last Logout:</span>
                <span className="timestamp-val">
                  {staff.last_logout_at ? formatDateTime(staff.last_logout_at) : 'N/A'}
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
          {onToggleStatus && !isAdmin && (
            <button
              type="button"
              className={`btn ${isActive ? 'btn-danger-outline' : 'btn-success-outline'}`}
              onClick={() => {
                onToggleStatus(staff.id, isActive ? 'inactive' : 'active');
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
