import React, { useState, useEffect, useRef } from 'react';
import { 
  User, Mail, Phone, Shield, Camera, X, Check, 
  Loader2, Sparkles, AlertCircle, CheckCircle2, Upload, Trash2
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../config/supabaseClient';

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=256&q=80'
];

export const ProfileModal = ({ isOpen, profile, onClose, onProfileUpdated, activeSubscription }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setEmail(profile.email || '');
      setMobile(profile.mobile || '');
      setAvatarUrl(profile.avatar_url || '');
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [profile, isOpen]);

  if (!isOpen || !profile) return null;

  const isAdmin = profile.role === 'admin';
  const roleLabel = isAdmin ? 'Administrator' : 'Staff Member';

  const getInitials = (name) => {
    if (!name) return 'SK';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg('Image size should be less than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAvatarUrl(reader.result);
      setErrorMsg('');
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setAvatarUrl('');
  };

  const handleSelectPreset = (url) => {
    setAvatarUrl(url);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!fullName.trim()) {
      setErrorMsg('Full Name cannot be empty.');
      return;
    }

    if (mobile && !/^\d{10}$/.test(mobile.trim())) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }

    setIsSubmitting(true);
    const nowISO = new Date().toISOString();

    try {
      const updates = {
        full_name: fullName.trim(),
        mobile: mobile ? mobile.trim() : null,
        avatar_url: avatarUrl || null,
        updated_at: nowISO
      };

      if (isSupabaseConfigured() && supabase) {
        // 1. Update in profiles table
        const { error: profileError } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', profile.id);

        if (profileError) {
          console.warn('Profile table update error:', profileError.message);
        }

        // 2. Update user metadata in Supabase Auth
        try {
          await supabase.auth.updateUser({
            data: {
              full_name: fullName.trim(),
              mobile: mobile ? mobile.trim() : null,
              avatar_url: avatarUrl || null
            }
          });
        } catch (e) {
          console.warn('Auth metadata update notice:', e);
        }
      }

      const updatedProfile = {
        ...profile,
        ...updates
      };

      if (typeof window !== 'undefined') {
        const cachedStaff = localStorage.getItem('workpay_cached_staff_profiles');
        if (cachedStaff) {
          try {
            const list = JSON.parse(cachedStaff);
            const nextList = list.map(item => item.id === profile.id ? { ...item, ...updates } : item);
            localStorage.setItem('workpay_cached_staff_profiles', JSON.stringify(nextList));
          } catch (e) {
            /* ignore */
          }
        }
      }

      if (onProfileUpdated) {
        onProfileUpdated(updatedProfile);
      }

      setSuccessMsg('Profile updated successfully!');
      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err) {
      console.error('Failed to update profile:', err);
      setErrorMsg(err.message || 'Failed to update profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay animate-fade-in" onClick={onClose}>
      <div 
        className="modal-container profile-setup-modal-box animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge bg-blue-light text-primary">
              <User className="icon-md" />
            </div>
            <div>
              <div className="modal-title-with-badge">
                <h3 className="modal-title">My Profile</h3>
                <span className="badge badge-profile-role">
                  <Shield className="icon-xs mr-1" />
                  {roleLabel}
                </span>
                {activeSubscription && (
                  <span className="badge badge-sub-pill">
                    <Sparkles className="icon-xs mr-1" />
                    {activeSubscription.planName}
                  </span>
                )}
              </div>
              <p className="modal-subtitle">
                Manage your account credentials, contact information, and avatar
              </p>
            </div>
          </div>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Close modal">
            <X className="icon-sm" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="modal-form-wrapper">
          <div className="modal-body">
            {/* Avatar Section */}
            <div className="profile-avatar-banner-section">
              <div className="profile-avatar-display-wrapper">
                {avatarUrl ? (
                  <img 
                    src={avatarUrl} 
                    alt={fullName || 'User Avatar'} 
                    className="profile-modal-avatar-img" 
                  />
                ) : (
                  <div className="profile-modal-avatar-placeholder">
                    {getInitials(fullName || profile.full_name)}
                  </div>
                )}

                <button
                  type="button"
                  className="profile-avatar-upload-trigger"
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload Photo"
                >
                  <Camera className="icon-xs" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden-file-input"
                  onChange={handleImageFileChange}
                />
              </div>

              <div className="profile-avatar-info">
                <h4 className="avatar-user-name">{fullName || profile.full_name || 'User'}</h4>
                <p className="avatar-user-email">{email || profile.email}</p>
                
                <div className="avatar-quick-actions">
                  <button
                    type="button"
                    className="btn-avatar-action"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="icon-xs mr-1" />
                    Upload Photo
                  </button>
                  {avatarUrl && (
                    <button
                      type="button"
                      className="btn-avatar-action btn-avatar-remove"
                      onClick={handleRemovePhoto}
                    >
                      <Trash2 className="icon-xs mr-1" />
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Preset Avatars Selection */}
            <div className="profile-preset-avatars-row">
              <span className="preset-label">Or choose an avatar:</span>
              <div className="preset-avatar-grid">
                {PRESET_AVATARS.map((url, index) => (
                  <button
                    key={index}
                    type="button"
                    className={`preset-avatar-thumb ${avatarUrl === url ? 'active' : ''}`}
                    onClick={() => handleSelectPreset(url)}
                  >
                    <img src={url} alt={`Preset ${index + 1}`} />
                    {avatarUrl === url && <div className="preset-check"><Check className="icon-xs" /></div>}
                  </button>
                ))}
              </div>
            </div>

            {/* Error & Success Messages */}
            {errorMsg && (
              <div className="alert-box alert-danger animate-shake mb-3">
                <AlertCircle className="icon-sm flex-shrink-0 mr-2" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="alert-box alert-success animate-fade-in mb-3">
                <CheckCircle2 className="icon-sm flex-shrink-0 mr-2" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Form Fields: 2-Column Grid */}
            <div className="profile-fields-2col-grid">
              {/* Field 1: Full Name */}
              <div className="form-group">
                <label className="form-label">
                  <User className="icon-xs text-primary mr-1" />
                  <span>Full Name <span className="required-star">*</span></span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Suleman Mansuri"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              {/* Field 2: Email Address (Read-only login identifier) */}
              <div className="form-group">
                <label className="form-label">
                  <Mail className="icon-xs text-primary mr-1" />
                  <span>Email Address <span className="text-muted text-xs font-normal ml-1">(Login ID)</span></span>
                </label>
                <input
                  type="email"
                  className="form-control"
                  value={email}
                  disabled
                  readOnly
                  title="Email is tied to your Supabase security account"
                  style={{ background: '#f8fafc', color: '#64748b', cursor: 'not-allowed' }}
                />
              </div>

              {/* Field 3: Mobile Number */}
              <div className="form-group">
                <label className="form-label">
                  <Phone className="icon-xs text-primary mr-1" />
                  <span>Mobile Number</span>
                </label>
                <input
                  type="tel"
                  maxLength={10}
                  className="form-control"
                  placeholder="e.g. 9876543210 (10 digits)"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                />
              </div>

              {/* Field 4: Account Privilege */}
              <div className="form-group">
                <label className="form-label">
                  <Shield className="icon-xs text-primary mr-1" />
                  <span>Account Privilege</span>
                </label>
                <div className="profile-privilege-card">
                  <div className="privilege-item">
                    <span className="privilege-label">Role:</span>
                    <span className="privilege-value font-semibold text-primary">{roleLabel}</span>
                  </div>
                  <div className="privilege-item">
                    <span className="badge badge-success-subtle">
                      <span className="status-dot-green"></span> Active Live
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Actions Footer */}
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-cancel-modal"
              onClick={onClose}
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
                  Saving Changes...
                </>
              ) : (
                <>
                  <Check className="icon-sm mr-2" />
                  Save Profile Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileModal;
