import React from 'react';
import { Building2, RefreshCw, Download, Clock, UserPlus } from 'lucide-react';

export const Navbar = ({ onResetDemo, onExportCSV, onOpenNewDrawer }) => {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();
  const todayDateStr = `${day}/${month}/${year}`;

  return (
    <header className="navbar">
      <div className="navbar-container">
        {/* Brand logo & titles */}
        <div className="brand-group">
          <div className="brand-icon-wrapper">
            <Building2 className="brand-icon" />
          </div>
          <div>
            <div className="brand-title-row">
              <h1 className="brand-title">Seva Kendra Management System</h1>
              <span className="badge-phase badge-supabase-live">
                <span className="live-dot pulse-blue"></span>
                Supabase PostgreSQL
              </span>
            </div>
            <p className="brand-subtitle">
              Live Multi-User Customer & Service Workflow Portal
            </p>
          </div>
        </div>

        {/* Header Right Actions & Profile */}
        <div className="navbar-actions">
          {/* Action button to open drawer */}
          <button 
            className="btn-header btn-header-primary"
            onClick={onOpenNewDrawer}
            title="Register a new customer record"
          >
            <UserPlus className="icon-sm" />
            <span>+ New Customer Entry</span>
          </button>

          {/* Admin Profile Area */}
          <div className="admin-profile-pill" title="Seva Kendra Admin Account">
            <div className="admin-avatar">SK</div>
            <div className="admin-info">
              <span className="admin-name">Admin Manager</span>
              <span className="admin-role">Seva Kendra #102</span>
            </div>
          </div>

          <div className="date-pill">
            <Clock className="icon-sm" />
            <span>{todayDateStr}</span>
          </div>

          <button 
            className="btn-header"
            onClick={onResetDemo}
            title="Reset database to default sample records"
          >
            <RefreshCw className="icon-sm" />
            <span>Reset Demo</span>
          </button>

          <button 
            className="btn-header"
            onClick={onExportCSV}
            title="Export live records to CSV file"
          >
            <Download className="icon-sm" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
