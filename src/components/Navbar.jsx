import React, { useState, useRef, useEffect } from 'react';
import { 
  Building2, LogOut, Loader2, LayoutDashboard, Users, 
  ChevronDown, User, Settings, Sparkles, Shield, Check, CreditCard
} from 'lucide-react';

export const Navbar = ({ 
  profile, 
  onLogout, 
  onExportCSV, 
  activeTab = 'dashboard', 
  onTabChange,
  onOpenProfile,
  onOpenSubscription,
  onOpenSettings,
  activeSubscription
}) => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const profileMenuRef = useRef(null);

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
  const avatarUrl = profile?.avatar_url;

  // Plan name & tier
  const planName = activeSubscription?.planName || 'Pro Plan';
  const planTier = (activeSubscription?.planTier || 'pro').toUpperCase();

  // Close profile dropdown on click outside or Escape key
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileDropdownOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsProfileDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleLogoutClick = async () => {
    setIsProfileDropdownOpen(false);
    setIsLoggingOut(true);
    try {
      if (onLogout) await onLogout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleItemSelect = (callback) => {
    setIsProfileDropdownOpen(false);
    if (callback) callback();
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

          {/* Right Actions & Professional Profile Dropdown */}
          <div className="navbar-actions">
            <div className="profile-dropdown-wrapper" ref={profileMenuRef}>
              {/* Dropdown Trigger Pill */}
              <button
                type="button"
                className={`profile-dropdown-trigger ${isProfileDropdownOpen ? 'active' : ''}`}
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                aria-haspopup="true"
                aria-expanded={isProfileDropdownOpen}
                aria-label="User profile and menu"
              >
                <div className="avatar-wrapper">
                  {avatarUrl ? (
                    <img 
                      src={avatarUrl} 
                      alt={displayName} 
                      className="user-avatar-img" 
                    />
                  ) : (
                    <div className="user-avatar">{initials}</div>
                  )}
                  <span className="online-indicator" title="Online Live Session" />
                </div>

                <span className="user-name-text">{displayName}</span>

                <ChevronDown className={`icon-xs chevron-icon ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Floating Profile Dropdown Card */}
              {isProfileDropdownOpen && (
                <div 
                  className="profile-dropdown-menu animate-fade-in-down" 
                  role="menu"
                  aria-orientation="vertical"
                >
                  {/* Dropdown Header Card */}
                  <div className="dropdown-user-header">
                    <div className="dropdown-avatar-box">
                      {avatarUrl ? (
                        <img 
                          src={avatarUrl} 
                          alt={displayName} 
                          className="dropdown-avatar-img" 
                        />
                      ) : (
                        <div className="dropdown-avatar-initials">{initials}</div>
                      )}
                    </div>
                    <div className="dropdown-user-meta">
                      <h4 className="dropdown-user-name">{displayName}</h4>
                      <p className="dropdown-user-email">{profile?.email || 'user@sevakendra.com'}</p>
                      
                      <div className="dropdown-badges-row">
                        <span className="badge badge-role-tag">
                          <Shield className="icon-xs mr-1" />
                          {displayRole}
                        </span>
                        <span className="badge badge-sub-tag">
                          <span className="status-dot-green"></span>
                          {planName}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="dropdown-divider" />

                  {/* Dropdown Menu Items */}
                  <div className="dropdown-items-list">
                    {/* Item 1: My Profile */}
                    <button
                      type="button"
                      className="dropdown-menu-item"
                      role="menuitem"
                      onClick={() => handleItemSelect(onOpenProfile)}
                    >
                      <div className="menu-item-icon bg-blue-subtle text-primary">
                        <User className="icon-sm" />
                      </div>
                      <div className="menu-item-text">
                        <span className="menu-item-title">My Profile</span>
                        <span className="menu-item-desc">Personal details & profile photo</span>
                      </div>
                    </button>

                    {/* Item 2: Subscription Plan */}
                    <button
                      type="button"
                      className="dropdown-menu-item"
                      role="menuitem"
                      onClick={() => handleItemSelect(onOpenSubscription)}
                    >
                      <div className="menu-item-icon bg-purple-subtle text-purple">
                        <Sparkles className="icon-sm" />
                      </div>
                      <div className="menu-item-text">
                        <div className="menu-item-title-row">
                          <span className="menu-item-title">Subscription Plan</span>
                          <span className="badge-item-highlight">Active</span>
                        </div>
                        <span className="menu-item-desc">View plans, billing & festive offers</span>
                      </div>
                    </button>

                    {/* Item 3: Account Settings */}
                    <button
                      type="button"
                      className="dropdown-menu-item"
                      role="menuitem"
                      onClick={() => handleItemSelect(onOpenSettings)}
                    >
                      <div className="menu-item-icon bg-slate-subtle text-slate-700">
                        <Settings className="icon-sm" />
                      </div>
                      <div className="menu-item-text">
                        <span className="menu-item-title">Account Settings</span>
                        <span className="menu-item-desc">Password change & preferences</span>
                      </div>
                    </button>
                  </div>

                  <div className="dropdown-divider" />

                  {/* Item 4: Logout */}
                  <div className="dropdown-footer-item">
                    <button
                      type="button"
                      className="dropdown-menu-item menu-item-logout"
                      role="menuitem"
                      onClick={handleLogoutClick}
                      disabled={isLoggingOut}
                    >
                      <div className="menu-item-icon bg-red-subtle text-danger">
                        {isLoggingOut ? (
                          <Loader2 className="icon-sm spin-slow" />
                        ) : (
                          <LogOut className="icon-sm" />
                        )}
                      </div>
                      <div className="menu-item-text">
                        <span className="menu-item-title text-danger">
                          {isLoggingOut ? 'Logging out...' : 'Logout'}
                        </span>
                        <span className="menu-item-desc">Sign out of your session</span>
                      </div>
                    </button>
                  </div>
                </div>
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
