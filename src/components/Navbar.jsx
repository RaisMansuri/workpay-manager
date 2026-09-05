import React, { useState, useRef, useEffect } from 'react';
import { 
  Building2, Download, Clock, LogOut, Loader2, 
  LayoutDashboard, Users, Menu, X, ChevronDown, User, KeyRound, Settings 
} from 'lucide-react';

export const Navbar = ({ profile, onLogout, onExportCSV, activeTab = 'dashboard', onTabChange }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  const profileMenuRef = useRef(null);

  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();
  const todayDateStr = `${day}/${month}/${year}`;

  const getInitials = (name) => {
    if (!name) return 'SK';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const isAdmin = profile?.role === 'admin';
  const rawName = profile?.full_name || (isAdmin ? 'Admin' : 'Staff Member');
  const displayName = rawName === 'Admin Manager' ? 'Admin' : rawName;
  const displayRole = isAdmin ? 'Administrator' : 'Staff Member';
  const initials = getInitials(displayName);

  // Close profile dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExportClick = async () => {
    setIsExporting(true);
    try {
      if (onExportCSV) await onExportCSV();
    } finally {
      setTimeout(() => setIsExporting(false), 500);
    }
  };

  const handleLogoutClick = async () => {
    setIsLoggingOut(true);
    try {
      if (onLogout) await onLogout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      <header className="navbar-header">
        <div className="navbar-inner">
          {/* Left: Brand Logo & Application Identity */}
          <div className="brand-group">
            <div className="brand-logo-glow" title="Seva Kendra Management System">
              <Building2 className="brand-icon" />
            </div>
            <div className="brand-text-container">
              <div className="brand-title-row">
                <h1 className="brand-title">Seva Kendra</h1>
                <span className="brand-title-badge">PORTAL</span>
              </div>
              <p className="brand-subtitle">Customer & Service Workflow</p>
            </div>
          </div>

          {/* Center: Navigation Pill Switcher (Visually Centered on Desktop) */}
          {isAdmin && onTabChange && (
            <nav className="navbar-nav-center desktop-only-nav">
              <div className="nav-switcher-container">
                <button
                  type="button"
                  className={`nav-switcher-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
                  onClick={() => onTabChange('dashboard')}
                >
                  <LayoutDashboard className="icon-xs" />
                  <span>Dashboard</span>
                </button>

                <button
                  type="button"
                  className={`nav-switcher-btn ${activeTab === 'staff' ? 'active' : ''}`}
                  onClick={() => onTabChange('staff')}
                >
                  <Users className="icon-xs" />
                  <span>Staff Management</span>
                </button>
              </div>
            </nav>
          )}

          {/* Right Actions & Profile */}
          <div className="navbar-actions">
            {/* User Profile Capsule with Pipe & Direct Logout Button */}
            <div className="user-profile-capsule-direct">
              <div className="avatar-wrapper">
                <div className="user-avatar">{initials}</div>
                <span className="online-indicator" title="Online Live Session" />
              </div>
              <span className="user-name-text">{displayName}</span>

              <span className="capsule-pipe-separator">|</span>

              {onLogout && (
                <button
                  type="button"
                  className="btn-capsule-logout"
                  onClick={handleLogoutClick}
                  disabled={isLoggingOut}
                  title="Logout portal session"
                >
                  {isLoggingOut ? (
                    <Loader2 className="icon-xs spin-slow" />
                  ) : (
                    <LogOut className="icon-xs" />
                  )}
                  <span className="logout-text">{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Fixed Bottom Navigation Bar (<= 768px, EXACTLY TWO ITEMS: Dashboard & Staff Management) */}
      {isAdmin && onTabChange && (
        <nav className="mobile-bottom-nav-bar" aria-label="Mobile Bottom Navigation">
          <button
            type="button"
            className={`mobile-bottom-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => onTabChange('dashboard')}
            aria-label="Navigate to Dashboard"
          >
            {activeTab === 'dashboard' && <div className="mobile-bottom-nav-indicator" />}
            <LayoutDashboard className="mobile-bottom-nav-icon" />
            <span className="mobile-bottom-nav-label">Dashboard</span>
          </button>

          <button
            type="button"
            className={`mobile-bottom-nav-item ${activeTab === 'staff' ? 'active' : ''}`}
            onClick={() => onTabChange('staff')}
            aria-label="Navigate to Staff Management"
          >
            {activeTab === 'staff' && <div className="mobile-bottom-nav-indicator" />}
            <Users className="mobile-bottom-nav-icon" />
            <span className="mobile-bottom-nav-label">Staff Management</span>
          </button>
        </nav>
      )}
    </>
  );
};

export default Navbar;
