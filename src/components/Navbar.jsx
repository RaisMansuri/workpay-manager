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

        {/* Right Actions & Profile (Desktop) */}
        <div className="navbar-actions desktop-only-actions">

          {/* Export CSV Button - Only visible to Admin on Dashboard */}
          {isAdmin && activeTab === 'dashboard' && (
            <button
              type="button"
              className="btn-nav btn-export"
              onClick={handleExportClick}
              disabled={isExporting}
              title="Export customer records to CSV"
            >
              {isExporting ? (
                <>
                  <Loader2 className="icon-xs spinner-icon" />
                  <span className="btn-text">Exporting...</span>
                </>
              ) : (
                <>
                  <Download className="icon-xs" />
                  <span className="btn-text">Export CSV</span>
                </>
              )}
            </button>
          )}

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

        {/* Mobile Hamburger Menu Button (< 768px) */}
        <button
          type="button"
          className="mobile-hamburger-btn"
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          aria-label="Toggle Navigation Menu"
        >
          {isMobileMenuOpen ? <X className="icon-md" /> : <Menu className="icon-md" />}
        </button>
      </div>

      {/* Mobile Collapsible Navigation Menu Drawer */}
      {isMobileMenuOpen && (
        <div className="mobile-nav-dropdown animate-fade-in">
          {/* User Profile Card */}
          <div className="mobile-user-card mb-3">
            <div className="avatar-wrapper">
              <div className="user-avatar">{initials}</div>
              <span className="online-indicator" />
            </div>
            <div>
              <div className="user-name">{displayName}</div>
              <div className="user-role-badge">{displayRole}</div>
            </div>
          </div>

          {/* Admin Navigation Pills */}
          {isAdmin && onTabChange && (
            <div className="mobile-nav-pills mb-3">
              <button
                type="button"
                className={`mobile-nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => {
                  onTabChange('dashboard');
                  setIsMobileMenuOpen(false);
                }}
              >
                <LayoutDashboard className="icon-xs mr-2" />
                <span>Dashboard</span>
              </button>
              <button
                type="button"
                className={`mobile-nav-btn ${activeTab === 'staff' ? 'active' : ''}`}
                onClick={() => {
                  onTabChange('staff');
                  setIsMobileMenuOpen(false);
                }}
              >
                <Users className="icon-xs mr-2" />
                <span>Staff Management</span>
              </button>
            </div>
          )}

          {/* Actions Bar */}
          <div className="mobile-actions-row">
            {activeTab === 'dashboard' && (
              <button
                type="button"
                className="btn-nav btn-export flex-1"
                onClick={() => {
                  handleExportClick();
                  setIsMobileMenuOpen(false);
                }}
                disabled={isExporting}
              >
                <Download className="icon-xs" />
                <span>Export CSV</span>
              </button>
            )}

            {onLogout && (
              <button
                type="button"
                className="btn-nav btn-logout flex-1"
                onClick={handleLogoutClick}
                disabled={isLoggingOut}
              >
                <LogOut className="icon-xs" />
                <span>Logout</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
