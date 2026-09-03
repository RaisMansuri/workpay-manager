import React, { useState } from 'react';
import { Building2, Eye, EyeOff, Lock, Mail, AlertCircle, Loader2, KeyRound, UserCheck } from 'lucide-react';
import { authService } from '../services/authService';

export const LoginPage = ({ onLoginSuccess, initialError = '' }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(initialError);

  const handleQuickFill = (targetEmail, targetPassword) => {
    setEmail(targetEmail);
    setPassword(targetPassword);
    setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanEmail = email.trim();

    // Validation checks
    if (!cleanEmail) {
      setErrorMessage('Please enter your email address');
      return;
    }

    // Email format validation (unless simple demo shortcut 'admin' or 'staff' is used)
    const isShortcut = cleanEmail === 'admin' || cleanEmail === 'staff';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!isShortcut && !emailRegex.test(cleanEmail)) {
      setErrorMessage('Please enter a valid email address (e.g. admin@sevakendra.com)');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password');
      return;
    }

    setIsLoading(true);

    try {
      const result = await authService.signIn(cleanEmail, password);

      if (result.success) {
        onLoginSuccess(result.user, result.profile);
      } else {
        setErrorMessage(result.error || 'Invalid email or password');
      }
    } catch (err) {
      console.error('Login error:', err);
      setErrorMessage('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card-wrapper">
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
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="loginEmail" className="form-label">
              Email Address / Username
            </label>
            <div className="input-with-icon">
              <Mail className="input-icon" />
              <input
                id="loginEmail"
                type="text"
                className="form-input"
                placeholder="e.g. user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                autoComplete="email"
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

          {/* Remember me */}
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

            {/* 
            <button
              type="button"
              className="forgot-password-link"
              onClick={() => alert('Forgot password link: Please contact your Seva Kendra Administrator to reset your credentials.')}
            >
              Forgot Password?
            </button>
            */}
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


      </div>
    </div>
  );
};

export default LoginPage;
