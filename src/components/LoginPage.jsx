import React, { useState } from 'react';
import { 
  Building2, Eye, EyeOff, Lock, Mail, AlertCircle, 
  Loader2, KeyRound, CheckCircle2, ArrowLeft 
} from 'lucide-react';
import { authService } from '../services/authService';

export const LoginPage = ({ onLoginSuccess, initialError = '', initialMode = 'login' }) => {
  const [mode, setMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash || '';
      if (hash.includes('type=recovery') || hash.includes('access_token')) {
        return 'update_password';
      }
    }
    return initialMode;
  });

  // Login Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(initialError);

  // Forgot Password States
  const [forgotInput, setForgotInput] = useState('');
  const [isSendingForgot, setIsSendingForgot] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccessData, setForgotSuccessData] = useState(null);

  // Update Password States (from recovery link)
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [updatePasswordError, setUpdatePasswordError] = useState('');
  const [updatePasswordSuccess, setUpdatePasswordSuccess] = useState(false);

  // 1. Handle Main Login Submit
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanInput = email.trim();

    if (!cleanInput) {
      setErrorMessage('Please enter your username or email address');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password');
      return;
    }

    setIsLoading(true);

    try {
      const result = await authService.signIn(cleanInput, password);

      if (result.success) {
        onLoginSuccess(result.user, result.profile);
      } else {
        setErrorMessage(result.error || 'Invalid username/email or password');
      }
    } catch (err) {
      console.error('Login error:', err);
      setErrorMessage('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Handle Forgot Password Submit
  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setForgotError('');

    const clean = forgotInput.trim();
    if (!clean) {
      setForgotError('Please enter your username or email address.');
      return;
    }

    setIsSendingForgot(true);
    try {
      const res = await authService.sendPasswordResetEmail(clean);
      if (res.success) {
        setForgotSuccessData(res);
      } else {
        setForgotError(res.error || 'Failed to send reset link. Please check your username or email.');
      }
    } catch (err) {
      console.error('Password reset email error:', err);
      setForgotError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSendingForgot(false);
    }
  };

  // 3. Handle Set New Password Submit
  const handleUpdatePasswordSubmit = async (e) => {
    e.preventDefault();
    setUpdatePasswordError('');

    const trimmedNew = newPassword.trim();
    const trimmedConfirm = confirmNewPassword.trim();

    if (!trimmedNew || trimmedNew.length < 6) {
      setUpdatePasswordError('Password must be at least 6 characters long.');
      return;
    }

    if (trimmedNew !== trimmedConfirm) {
      setUpdatePasswordError('Passwords do not match. Please re-enter matching passwords.');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const res = await authService.updateNewPassword(trimmedNew);
      if (res.success) {
        setUpdatePasswordSuccess(true);
      } else {
        setUpdatePasswordError(res.error || 'Failed to update password.');
      }
    } catch (err) {
      console.error('Update password error:', err);
      setUpdatePasswordError('An unexpected error occurred. Please try again.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card-wrapper">
        {/* ========================================================================= */}
        {/* VIEW 1: NORMAL LOGIN MODE                                                */}
        {/* ========================================================================= */}
        {mode === 'login' && (
          <>
            {/* Brand Header */}
            <div className="login-brand-header">
              <div className="brand-icon-wrapper large-icon">
                <Building2 className="brand-icon" />
              </div>
            </div>

            {/* Validation Error Alert */}
            {errorMessage && (
              <div
                className={`login-error-alert ${errorMessage.toLowerCase().includes('deactivated') || errorMessage.toLowerCase().includes('inactive') ? 'deactivated-alert' : ''}`}
                role="alert"
              >
                <AlertCircle className="icon-sm flex-shrink-0" />
                <span>
                  {errorMessage.toLowerCase().includes('deactivated') && !errorMessage.startsWith('❌') ? '❌ ' : ''}
                  {errorMessage}
                </span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLoginSubmit} className="login-form">
              <div className="form-group">
                <label htmlFor="loginEmail" className="form-label">
                  Username or Email Address
                </label>
                <div className="input-with-icon">
                  <Mail className="input-icon" />
                  <input
                    id="loginEmail"
                    type="text"
                    className="form-input"
                    placeholder="Enter username or email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    autoComplete="username"
                    autoFocus
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="loginPassword" className="form-label">
                  Password
                </label>
                <div className="input-with-icon">
                  <Lock className="input-icon" />
                  <input
                    id="loginPassword"
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword((prev) => !prev)}
                    tabIndex={-1}
                    title={showPassword ? 'Hide Password' : 'Show Password'}
                  >
                    {showPassword ? <EyeOff className="icon-xs" /> : <Eye className="icon-xs" />}
                  </button>
                </div>
              </div>

              {/* Remember me & Forgot Password Options Row */}
              <div className="login-options-row">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={isLoading}
                  />
                  <span>Remember me</span>
                </label>

                <button
                  type="button"
                  className="forgot-password-link"
                  onClick={() => {
                    setForgotInput(email.trim());
                    setForgotError('');
                    setForgotSuccessData(null);
                    setMode('forgot');
                  }}
                >
                  Forgot Password?
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="btn-submit-main login-btn"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="icon-sm spinner-icon" />
                    <span>Logging in...</span>
                  </>
                ) : (
                  <span>LOGIN</span>
                )}
              </button>
            </form>
          </>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: FORGOT PASSWORD REQUEST MODE                                     */}
        {/* ========================================================================= */}
        {mode === 'forgot' && (
          <>
            <div className="login-brand-header">
              <div className="brand-icon-wrapper large-icon">
                <KeyRound className="brand-icon" />
              </div>
              <h3 className="login-mode-title">Forgot Password</h3>
              <p className="login-mode-subtitle">
                Enter your username or email address and we'll send you instructions to reset your password.
              </p>
            </div>

            {forgotSuccessData ? (
              <div className="login-success-view animate-fade-in text-center">
                <div className="success-icon-badge mb-3">
                  <CheckCircle2 className="icon-xl text-success" />
                </div>
                <h4 className="font-bold text-dark text-lg mb-2">Check Your Email</h4>
                <p className="text-sm text-muted mb-4 leading-relaxed">
                  We have sent password reset instructions to{' '}
                  <strong className="text-dark">{forgotSuccessData.obfuscatedEmail || forgotSuccessData.email}</strong>.
                  Please check your inbox and click the link to reset your password.
                </p>

                <div className="admin-help-box mb-4">
                  <p className="text-xs text-slate-600">
                    💡 <strong>Kendra Staff:</strong> If you don't receive the email, you can also ask your Kendra Administrator to reset your password directly from the Staff Management portal.
                  </p>
                </div>

                <button
                  type="button"
                  className="btn-submit-main login-btn w-full mb-3"
                  onClick={() => {
                    setMode('login');
                    setForgotSuccessData(null);
                  }}
                >
                  Back to Login
                </button>

                <button
                  type="button"
                  className="forgot-password-link text-center block w-full"
                  onClick={() => setForgotSuccessData(null)}
                >
                  Didn't receive email? Try another username/email
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="login-form">
                {forgotError && (
                  <div className="login-error-alert mb-3" role="alert">
                    <AlertCircle className="icon-sm flex-shrink-0" />
                    <span>{forgotError}</span>
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="forgotInput" className="form-label">
                    Username or Email Address
                  </label>
                  <div className="input-with-icon">
                    <Mail className="input-icon" />
                    <input
                      id="forgotInput"
                      type="text"
                      className="form-input"
                      placeholder="Enter username or email address"
                      value={forgotInput}
                      onChange={(e) => setForgotInput(e.target.value)}
                      disabled={isSendingForgot}
                      autoComplete="username"
                      autoFocus
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn-submit-main login-btn w-full"
                  disabled={isSendingForgot}
                >
                  {isSendingForgot ? (
                    <>
                      <Loader2 className="icon-sm spinner-icon" />
                      <span>Sending reset link...</span>
                    </>
                  ) : (
                    <span>SEND RESET LINK</span>
                  )}
                </button>

                <div className="admin-help-box mt-3 mb-2">
                  <p className="text-xs text-slate-500">
                    💡 <strong>Kendra Staff:</strong> You can also contact your Kendra Administrator to reset your password instantly.
                  </p>
                </div>

                <div className="back-to-login-row">
                  <button
                    type="button"
                    className="back-to-login-btn"
                    onClick={() => {
                      setMode('login');
                      setForgotError('');
                    }}
                    disabled={isSendingForgot}
                  >
                    <ArrowLeft className="icon-xs" />
                    <span>Back to Login</span>
                  </button>
                </div>
              </form>
            )}
          </>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: SET NEW PASSWORD MODE (FROM EMAIL RECOVERY LINK)                 */}
        {/* ========================================================================= */}
        {mode === 'update_password' && (
          <>
            <div className="login-brand-header">
              <div className="brand-icon-wrapper large-icon">
                <Lock className="brand-icon" />
              </div>
              <h3 className="login-mode-title">Set New Password</h3>
              <p className="login-mode-subtitle">
                Please choose a new password with at least 6 characters.
              </p>
            </div>

            {updatePasswordSuccess ? (
              <div className="login-success-view animate-fade-in text-center">
                <div className="success-icon-badge mb-3">
                  <CheckCircle2 className="icon-xl text-success" />
                </div>
                <h4 className="font-bold text-dark text-lg mb-2">Password Updated!</h4>
                <p className="text-sm text-muted mb-4">
                  Your password has been changed successfully. You can now log in with your new password.
                </p>
                <button
                  type="button"
                  className="btn-submit-main login-btn w-full"
                  onClick={() => {
                    if (window.location.hash) {
                      window.history.replaceState(null, '', window.location.pathname);
                    }
                    setMode('login');
                    setUpdatePasswordSuccess(false);
                  }}
                >
                  Proceed to Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleUpdatePasswordSubmit} className="login-form">
                {updatePasswordError && (
                  <div className="login-error-alert mb-3" role="alert">
                    <AlertCircle className="icon-sm flex-shrink-0" />
                    <span>{updatePasswordError}</span>
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="newPassword" className="form-label">
                    New Password
                  </label>
                  <div className="input-with-icon">
                    <Lock className="input-icon" />
                    <input
                      id="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      className="form-input"
                      placeholder="Enter new password (min. 6 characters)"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={isUpdatingPassword}
                      autoComplete="new-password"
                      autoFocus
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      tabIndex={-1}
                    >
                      {showNewPassword ? <EyeOff className="icon-xs" /> : <Eye className="icon-xs" />}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="confirmNewPassword" className="form-label">
                    Confirm New Password
                  </label>
                  <div className="input-with-icon">
                    <Lock className="input-icon" />
                    <input
                      id="confirmNewPassword"
                      type={showConfirmNewPassword ? 'text' : 'password'}
                      className="form-input"
                      placeholder="Re-enter your new password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      disabled={isUpdatingPassword}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowConfirmNewPassword((prev) => !prev)}
                      tabIndex={-1}
                    >
                      {showConfirmNewPassword ? <EyeOff className="icon-xs" /> : <Eye className="icon-xs" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn-submit-main login-btn w-full"
                  disabled={isUpdatingPassword}
                >
                  {isUpdatingPassword ? (
                    <>
                      <Loader2 className="icon-sm spinner-icon" />
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
                    onClick={() => {
                      if (window.location.hash) {
                        window.history.replaceState(null, '', window.location.pathname);
                      }
                      setMode('login');
                    }}
                    disabled={isUpdatingPassword}
                  >
                    <ArrowLeft className="icon-xs" />
                    <span>Back to Login</span>
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
