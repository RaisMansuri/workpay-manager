import React, { useState, useEffect } from 'react';
import { Building2, Lock, Eye, EyeOff, AlertCircle, Loader2, CheckCircle2, ArrowLeft, RefreshCw } from 'lucide-react';
import { supabase } from '../config/supabaseClient';

export const ResetPasswordPage = ({ onSuccess, onBackToLogin }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [hasValidToken, setHasValidToken] = useState(true);

  // Check on mount if valid recovery token or session exists
  useEffect(() => {
    let isMounted = true;

    const checkRecoverySession = async () => {
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      const hasRecoveryIndicator =
        hash.includes('type=recovery') ||
        hash.includes('access_token') ||
        search.includes('type=recovery') ||
        search.includes('token');

      if (!hasRecoveryIndicator) {
        // Also check if an active recovery session exists in Supabase
        const { data: { session } } = await supabase.auth.getSession();
        if (!session && isMounted) {
          setHasValidToken(false);
          setErrorMessage('No active password reset token found. The link may have expired or is invalid.');
        }
      }
    };

    checkRecoverySession();

    // Listen for Supabase PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        if (isMounted) {
          setHasValidToken(true);
          setErrorMessage('');
        }
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const trimmedPassword = newPassword.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (!trimmedPassword) {
      setErrorMessage('Please enter a new password.');
      return;
    }

    if (trimmedPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (trimmedPassword !== trimmedConfirm) {
      setErrorMessage('Passwords do not match. Please re-enter matching passwords.');
      return;
    }

    setIsLoading(true);

    try {
      // Direct call to supabase.auth.updateUser with new password
      const { error } = await supabase.auth.updateUser({
        password: trimmedPassword
      });

      if (error) {
        setErrorMessage(error.message || 'Failed to update password. Please try again.');
        return;
      }

      setIsSuccess(true);

      // Cleanly clear recovery token hash from the URL
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', '/login');
      }

      // Auto-redirect to login after 2 seconds
      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        } else if (onBackToLogin) {
          onBackToLogin();
        }
      }, 2000);
    } catch (err) {
      console.error('Password reset error:', err);
      setErrorMessage('An unexpected error occurred while resetting password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card-wrapper animate-scale-up">
        {/* Brand Header */}
        <div className="login-brand-header">
          <div className="brand-icon-wrapper large-icon">
            <Building2 className="brand-icon" />
          </div>
          <h3 className="login-mode-title">Reset your password</h3>
          <p className="login-mode-subtitle">
            Enter a new password with at least 8 characters to secure your account.
          </p>
        </div>

        {/* State 1: Success State */}
        {isSuccess ? (
          <div className="login-success-view animate-fade-in text-center">
            <div className="success-icon-badge mb-3">
              <CheckCircle2 className="icon-xl text-success" />
            </div>
            <h4 className="font-bold text-dark text-lg mb-2">Password Changed Successfully!</h4>
            <p className="text-sm text-muted mb-4 leading-relaxed">
              Your password has been updated. Redirecting you to the login page...
            </p>
            <button
              type="button"
              className="btn-submit-main login-btn w-full"
              onClick={() => {
                if (onSuccess) onSuccess();
                else if (onBackToLogin) onBackToLogin();
              }}
            >
              Proceed to Login
            </button>
          </div>
        ) : !hasValidToken ? (
          /* State 2: Invalid or Expired Token State */
          <div className="animate-fade-in text-center">
            <div className="login-error-alert mb-4 text-left" role="alert">
              <AlertCircle className="icon-sm flex-shrink-0" />
              <span>{errorMessage || 'This password reset link has expired or is invalid.'}</span>
            </div>
            <p className="text-sm text-muted mb-4">
              Your recovery link is no longer valid or has expired. Please request a new link to reset your password.
            </p>
            <button
              type="button"
              className="btn-submit-main login-btn w-full mb-3"
              onClick={onBackToLogin}
            >
              <RefreshCw className="icon-xs mr-1.5 inline-block" />
              <span>Request a new link</span>
            </button>
            <button
              type="button"
              className="back-to-login-btn text-center block w-full mt-2"
              onClick={onBackToLogin}
            >
              Back to Login
            </button>
          </div>
        ) : (
          /* State 3: Active Password Reset Form */
          <form onSubmit={handleSubmit} className="login-form">
            {errorMessage && (
              <div className="login-error-alert mb-3" role="alert">
                <AlertCircle className="icon-sm flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="resetNewPassword" className="form-label">
                New Password
              </label>
              <div className="input-with-icon">
                <Lock className="input-icon" />
                <input
                  id="resetNewPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Enter new password (min. 8 characters)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete="new-password"
                  autoFocus
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  tabIndex={-1}
                  title={showNewPassword ? 'Hide Password' : 'Show Password'}
                >
                  {showNewPassword ? <EyeOff className="icon-xs" /> : <Eye className="icon-xs" />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="resetConfirmPassword" className="form-label">
                Confirm Password
              </label>
              <div className="input-with-icon">
                <Lock className="input-icon" />
                <input
                  id="resetConfirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Re-enter your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  tabIndex={-1}
                  title={showConfirmPassword ? 'Hide Password' : 'Show Password'}
                >
                  {showConfirmPassword ? <EyeOff className="icon-xs" /> : <Eye className="icon-xs" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn-submit-main login-btn w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="icon-sm spinner-icon mr-1" />
                  <span>Updating password...</span>
                </>
              ) : (
                <span>SAVE NEW PASSWORD</span>
              )}
            </button>

            <div className="back-to-login-row">
              <button
                type="button"
                className="back-to-login-btn"
                onClick={onBackToLogin}
                disabled={isLoading}
              >
                <ArrowLeft className="icon-xs mr-1" />
                <span>Back to Login</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;
