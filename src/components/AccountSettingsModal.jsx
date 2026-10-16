import React, { useState, useEffect } from 'react';
import { 
  Settings, KeyRound, Bell, Sliders, Lock, Eye, EyeOff, 
  Check, X, AlertCircle, CheckCircle2, Loader2, Volume2, ShieldCheck, Database
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../config/supabaseClient';

export const AccountSettingsModal = ({ isOpen, profile, onClose, onPreferencesUpdated, onPasswordUpdated }) => {
  const [activeTab, setActiveTab] = useState('password'); // 'password' | 'preferences'

  // Password State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Preferences State
  const [preferences, setPreferences] = useState({
    smsAlerts: true,
    defaultPageSize: 10,
    audioChimes: true,
    compactView: false
  });
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);
  const [prefsSuccess, setPrefsSuccess] = useState('');
  const [prefsError, setPrefsError] = useState('');

  useEffect(() => {
    if (profile?.preferences) {
      try {
        const p = typeof profile.preferences === 'string' ? JSON.parse(profile.preferences) : profile.preferences;
        setPreferences({
          smsAlerts: p.sms_alerts ?? p.smsAlerts ?? true,
          defaultPageSize: p.default_page_size ?? p.defaultPageSize ?? 10,
          audioChimes: p.audio_chimes ?? p.audioChimes ?? true,
          compactView: p.compact_view ?? p.compactView ?? false
        });
      } catch (e) {
        /* ignore */
      }
    }
  }, [profile, isOpen]);

  if (!isOpen || !profile) return null;

  // Password validation checks
  const isLengthValid = newPassword.length >= 6;
  const isCapitalValid = /^[A-Z]/.test(newPassword);
  const isSpecialValid = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword);
  const isDigitValid = /[0-9]/.test(newPassword);
  const isMatch = newPassword && confirmPassword && newPassword === confirmPassword;

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!isLengthValid) {
      setPasswordError('Password must be at least 6 characters long.');
      return;
    }
    if (!isCapitalValid) {
      setPasswordError('First letter must be a Capital letter (e.g. Seva@123).');
      return;
    }
    if (!isSpecialValid) {
      setPasswordError('Must contain at least 1 special character (e.g. @, #, $).');
      return;
    }
    if (!isDigitValid) {
      setPasswordError('Must contain at least 1 number digit.');
      return;
    }
    if (!isMatch) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setIsChangingPassword(true);
    try {
      if (isSupabaseConfigured() && supabase) {
        const { error } = await supabase.auth.updateUser({
          password: newPassword
        });

        if (error) throw error;
      }

      setPasswordSuccess('Password changed successfully! Next login will require your new password.');
      setNewPassword('');
      setConfirmPassword('');
      if (onPasswordUpdated) onPasswordUpdated();
      setTimeout(() => {
        setPasswordSuccess('');
      }, 4000);
    } catch (err) {
      console.error('Password change failed:', err);
      setPasswordError(err.message || 'Failed to change password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handlePreferencesSubmit = async (e) => {
    e.preventDefault();
    setPrefsError('');
    setPrefsSuccess('');
    setIsSavingPrefs(true);

    try {
      const payload = {
        sms_alerts: preferences.smsAlerts,
        default_page_size: preferences.defaultPageSize,
        audio_chimes: preferences.audioChimes,
        compact_view: preferences.compactView
      };

      if (isSupabaseConfigured() && supabase) {
        const { error } = await supabase
          .from('profiles')
          .update({ preferences: payload, updated_at: new Date().toISOString() })
          .eq('id', profile.id);

        if (error) console.warn('Supabase preferences update notice:', error.message);
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('workpay_user_preferences', JSON.stringify(preferences));
      }

      if (onPreferencesUpdated) {
        onPreferencesUpdated({ ...profile, preferences: payload });
      }

      setPrefsSuccess('Preferences saved successfully!');
      setTimeout(() => {
        setPrefsSuccess('');
      }, 3000);
    } catch (err) {
      console.error('Preferences save failed:', err);
      setPrefsError(err.message || 'Failed to save preferences.');
    } finally {
      setIsSavingPrefs(false);
    }
  };

  return (
    <div className="modal-overlay animate-fade-in" onClick={onClose}>
      <div 
        className="modal-container account-settings-modal-box animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge bg-primary-light text-primary">
              <Settings className="icon-md" />
            </div>
            <div>
              <h3 className="modal-title">Account Settings</h3>
              <p className="modal-subtitle">
                Configure account security credentials, notifications, and application preferences
              </p>
            </div>
          </div>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Close modal">
            <X className="icon-sm" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="settings-tab-switcher">
          <button
            type="button"
            className={`settings-tab-btn ${activeTab === 'password' ? 'active' : ''}`}
            onClick={() => setActiveTab('password')}
          >
            <KeyRound className="icon-xs mr-2" />
            <span>Security & Password</span>
          </button>
          <button
            type="button"
            className={`settings-tab-btn ${activeTab === 'preferences' ? 'active' : ''}`}
            onClick={() => setActiveTab('preferences')}
          >
            <Sliders className="icon-xs mr-2" />
            <span>Workflow Preferences</span>
          </button>
        </div>

        {/* Tab 1: Password Change */}
        {activeTab === 'password' && (
          <form onSubmit={handlePasswordSubmit} className="modal-form-wrapper">
            <div className="modal-body">
              <div className="settings-section-intro">
                <div className="shield-icon-badge">
                  <ShieldCheck className="icon-sm text-primary" />
                </div>
                <div>
                  <h4 className="section-title">Change Account Password</h4>
                  <p className="section-desc">
                    Update your authentication password for <strong>{profile.email}</strong>.
                  </p>
                </div>
              </div>

              {passwordError && (
                <div className="alert-box alert-danger animate-shake mb-3">
                  <AlertCircle className="icon-sm flex-shrink-0 mr-2" />
                  <span>{passwordError}</span>
                </div>
              )}

              {passwordSuccess && (
                <div className="alert-box alert-success animate-fade-in mb-3">
                  <CheckCircle2 className="icon-sm flex-shrink-0 mr-2" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              <div className="form-group mb-3">
                <label className="form-label required">
                  <Lock className="icon-xs text-primary mr-1" /> New Password
                </label>
                <div className="input-with-eye-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-control"
                    placeholder="e.g. Seva@2026"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
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

              {/* Live Requirements Checklist */}
              <div className="password-checklist-grid mb-3">
                <div className={`check-rule ${isLengthValid ? 'met' : ''}`}>
                  <Check className="check-icon" />
                  <span>At least 6 characters</span>
                </div>
                <div className={`check-rule ${isCapitalValid ? 'met' : ''}`}>
                  <Check className="check-icon" />
                  <span>First letter Capital (A-Z)</span>
                </div>
                <div className={`check-rule ${isSpecialValid ? 'met' : ''}`}>
                  <Check className="check-icon" />
                  <span>Special symbol (@, #, $)</span>
                </div>
                <div className={`check-rule ${isDigitValid ? 'met' : ''}`}>
                  <Check className="check-icon" />
                  <span>Contains a number (0-9)</span>
                </div>
              </div>

              <div className="form-group mb-2">
                <label className="form-label required">
                  <Lock className="icon-xs text-primary mr-1" /> Confirm New Password
                </label>
                <div className="input-with-eye-wrapper">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    className={`form-control ${confirmPassword ? (isMatch ? 'is-valid' : 'is-invalid') : ''}`}
                    placeholder="Repeat new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
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
                {confirmPassword && (
                  <span className={`text-xs mt-1 block font-medium ${isMatch ? 'text-green' : 'text-danger'}`}>
                    {isMatch ? '✓ Passwords match perfectly' : '✗ Passwords do not match'}
                  </span>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-cancel-modal"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-save-staff-primary"
                disabled={isChangingPassword || !isMatch || !isLengthValid}
              >
                {isChangingPassword ? (
                  <>
                    <Loader2 className="icon-sm spin-slow mr-2" />
                    Updating Security Key...
                  </>
                ) : (
                  <>
                    <KeyRound className="icon-sm mr-2" />
                    Update Password
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Workflow Preferences */}
        {activeTab === 'preferences' && (
          <form onSubmit={handlePreferencesSubmit} className="modal-form-wrapper">
            <div className="modal-body">
              {prefsError && (
                <div className="alert-box alert-danger animate-shake mb-3">
                  <AlertCircle className="icon-sm flex-shrink-0 mr-2" />
                  <span>{prefsError}</span>
                </div>
              )}

              {prefsSuccess && (
                <div className="alert-box alert-success animate-fade-in mb-3">
                  <CheckCircle2 className="icon-sm flex-shrink-0 mr-2" />
                  <span>{prefsSuccess}</span>
                </div>
              )}

              <div className="preferences-list">
                {/* SMS Alerts Toggle */}
                <div className="pref-item-card">
                  <div className="pref-item-left">
                    <div className="pref-icon-box bg-green-light text-green">
                      <Bell className="icon-sm" />
                    </div>
                    <div>
                      <h4 className="pref-title">Automated Customer SMS</h4>
                      <p className="pref-desc">
                        Send instant confirmation SMS with service type and balance to customer's mobile number.
                      </p>
                    </div>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={preferences.smsAlerts}
                      onChange={(e) => setPreferences({ ...preferences, smsAlerts: e.target.checked })}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                {/* Audio Chime Alerts */}
                <div className="pref-item-card">
                  <div className="pref-item-left">
                    <div className="pref-icon-box bg-blue-light text-primary">
                      <Volume2 className="icon-sm" />
                    </div>
                    <div>
                      <h4 className="pref-title">Sound Chimes</h4>
                      <p className="pref-desc">
                        Play pleasant audio feedback chimes on successful record save and status updates.
                      </p>
                    </div>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={preferences.audioChimes}
                      onChange={(e) => setPreferences({ ...preferences, audioChimes: e.target.checked })}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                {/* Compact Density View */}
                <div className="pref-item-card">
                  <div className="pref-item-left">
                    <div className="pref-icon-box bg-purple-light text-purple">
                      <Sliders className="icon-sm" />
                    </div>
                    <div>
                      <h4 className="pref-title">Compact Table Density</h4>
                      <p className="pref-desc">
                        Reduce row padding for faster data browsing on high-resolution widescreen displays.
                      </p>
                    </div>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={preferences.compactView}
                      onChange={(e) => setPreferences({ ...preferences, compactView: e.target.checked })}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>

                {/* Default Table Page Size */}
                <div className="pref-item-card">
                  <div className="pref-item-left">
                    <div className="pref-icon-box bg-amber-light text-amber">
                      <Database className="icon-sm" />
                    </div>
                    <div>
                      <h4 className="pref-title">Default Rows Per Page</h4>
                      <p className="pref-desc">
                        Choose the default number of customer records shown per page.
                      </p>
                    </div>
                  </div>
                  <select
                    value={preferences.defaultPageSize}
                    onChange={(e) => setPreferences({ ...preferences, defaultPageSize: Number(e.target.value) })}
                    className="pref-select-field"
                  >
                    <option value={10}>10 records</option>
                    <option value={25}>25 records</option>
                    <option value={50}>50 records</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-cancel-modal"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-save-staff-primary"
                disabled={isSavingPrefs}
              >
                {isSavingPrefs ? (
                  <>
                    <Loader2 className="icon-sm spin-slow mr-2" />
                    Saving Preferences...
                  </>
                ) : (
                  <>
                    <Check className="icon-sm mr-2" />
                    Save Preferences
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AccountSettingsModal;
