import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Users, UserPlus, Search, Shield, CheckCircle2, XCircle, 
  Eye, Edit3, Loader2, RefreshCw, MoreVertical, KeyRound, 
  AlertTriangle, X, Clock, Filter, Calendar, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight
} from 'lucide-react';
import { staffService } from '../services/staffService';
import { CreateStaffModal } from './CreateStaffModal';
import { StaffDetailModal } from './StaffDetailModal';
import { ResetPasswordModal } from './ResetPasswordModal';
import { Toast } from './Toast';
import { formatDateTime } from '../utils/formatters';

export const StaffManagement = ({ profile }) => {
  const [staffList, setStaffList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Modals & Menu State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewingStaff, setViewingStaff] = useState(null);
  const [resetPasswordStaff, setResetPasswordStaff] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [toast, setToast] = useState(null);

  const menuRef = useRef(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  // Close 3-dot menu on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadStaffList = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await staffService.getStaffListAsync();
      setStaffList(data);
    } catch (err) {
      console.error('Failed to load staff list:', err);
      showToast('Failed to load staff records.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStaffList();
    const unsubscribe = staffService.subscribeToRealtime((updated) => {
      setStaffList(updated);
    });
    return () => unsubscribe();
  }, [loadStaffList]);

  // Reset pagination on filter or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  // Handle Staff Creation
  const handleCreateStaff = async (staffData) => {
    const result = await staffService.createStaffAsync(staffData);
    if (result.success) {
      setStaffList(result.staffList);
      showToast(`Staff member "${staffData.fullName}" created successfully!`, 'success');
      return { success: true };
    } else {
      const errMsg = result.error || 'Failed to create staff.';
      const isWarning =
        errMsg.toLowerCase().includes('wait') ||
        errMsg.toLowerCase().includes('too many') ||
        errMsg.toLowerCase().includes('rate limit');

      showToast(errMsg, isWarning ? 'warning' : 'error');
      return { success: false, error: result.error };
    }
  };

  // Handle Status Toggle (Activate / Deactivate) with Confirmation
  const confirmToggleStatus = (staff) => {
    const newStatus = staff.status === 'active' ? 'inactive' : 'active';
    setConfirmDialog({
      type: 'status',
      staff,
      newStatus,
      title: newStatus === 'active' ? 'Activate Staff Account?' : 'Deactivate Staff Account?',
      message: newStatus === 'active' 
        ? `Are you sure you want to activate ${staff.full_name}'s account? They will be granted access to the portal.`
        : `Are you sure you want to deactivate ${staff.full_name}'s account? Their portal access will be instantly blocked.`
    });
    setActiveMenuId(null);
  };

  const handleExecuteStatusToggle = async () => {
    if (!confirmDialog?.staff) return;
    const { staff, newStatus } = confirmDialog;
    setConfirmDialog(null);

    const result = await staffService.updateStaffStatusAsync(staff.id, newStatus);
    if (result.success) {
      setStaffList(result.staffList);
      const actionText = newStatus === 'active' ? 'activated' : 'deactivated';
      showToast(`Account for ${staff.full_name} has been ${actionText}.`, 'info');
    } else {
      showToast('Failed to update staff status.', 'error');
    }
  };

  // Filter staff list based on search and status
  const filteredStaff = staffList.filter((staff) => {
    const matchesSearch = 
      (staff.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (staff.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (staff.mobile || '').includes(searchTerm);

    const matchesStatus = 
      statusFilter === 'all' || 
      staff.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Pagination Math
  const totalPages = Math.max(1, Math.ceil(filteredStaff.length / rowsPerPage));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, filteredStaff.length);
  const paginatedStaff = filteredStaff.slice(startIndex, endIndex);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let start = Math.max(1, validCurrentPage - Math.floor(maxVisiblePages / 2));
    let end = Math.min(totalPages, start + maxVisiblePages - 1);
    if (end - start + 1 < maxVisiblePages) {
      start = Math.max(1, end - maxVisiblePages + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  const getInitials = (name) => {
    if (!name) return 'ST';
    const parts = name.trim().split(' ');
    return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
  };

  const activeCount = staffList.filter(s => s.status === 'active').length;
  const inactiveCount = staffList.filter(s => s.status === 'inactive').length;

  return (
    <div className="staff-management-container animate-fade-in">
      {/* 1. Page Header */}
      <div className="staff-header-banner">
        <div className="staff-header-text">
          <span className="staff-eyebrow-label">
            <Shield className="icon-xs mr-1" /> ADMIN PORTAL
          </span>
          <h2 className="staff-header-title">Staff Management</h2>
          <p className="staff-header-subtitle">
            Manage staff credentials, role-based security, and access status
          </p>
        </div>
      </div>

      {/* 2. Summary KPI Metric Cards Grid */}
      <div className="staff-kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon-box bg-blue">
            <Users className="icon-md" />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Total Staff Members</span>
            <h3 className="kpi-value">{staffList.length}</h3>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-box bg-green">
            <CheckCircle2 className="icon-md" />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Active Users</span>
            <h3 className="kpi-value">{activeCount}</h3>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-box bg-red">
            <XCircle className="icon-md" />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">Inactive Accounts</span>
            <h3 className="kpi-value">{inactiveCount}</h3>
          </div>
        </div>
      </div>

      {/* 3. ONE SINGLE UNIFIED PARENT CARD (SEARCH, FILTERS, BUTTONS, GRID & PAGINATION) */}
      <div className="unified-staff-card">
        {/* SINGLE CONTROLS ROW Layout */}
        <div className="unified-single-controls-row">
          {/* LEFT GROUP: Search Input + Status Dropdown */}
          <div className="controls-left-group">
            <div className="search-box">
              <Search className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Search staff by name, email, or mobile..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Search staff members"
              />
              {searchTerm && (
                <button type="button" className="clear-search-btn" onClick={() => setSearchTerm('')}>
                  ×
                </button>
              )}
            </div>

            {/* Status Dropdown Filter */}
            <div className="clean-filter-control">
              <Clock className="filter-control-icon" />
              <select
                className="clean-filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Filter by account status"
              >
                <option value="all">All Statuses ({staffList.length})</option>
                <option value="active">Active Only ({activeCount})</option>
                <option value="inactive">Inactive Only ({inactiveCount})</option>
              </select>
            </div>
          </div>

          {/* RIGHT GROUP: Create New Staff Button + Refresh Button */}
          <div className="controls-right-group">
            <button
              type="button"
              className="btn btn-primary btn-create-staff"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <UserPlus className="icon-sm mr-2" />
              <span>Create New Staff</span>
            </button>

            <button
              type="button"
              className="btn-toolbar-refresh"
              onClick={loadStaffList}
              title="Refresh staff records"
              aria-label="Refresh staff records"
            >
              <RefreshCw className={`icon-sm ${isLoading ? 'spinner-icon' : ''}`} />
            </button>
          </div>
        </div>

        {/* Subtle Divider Line */}
        <div className="unified-divider" />

        {/* Desktop Data Table View */}
        <div className="table-responsive desktop-table-wrapper">
          <table className="staff-data-table">
            <thead>
              <tr>
                <th>Staff Member</th>
                <th>Contact Details</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created Date</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="text-center py-5">
                    <Loader2 className="icon-lg spinner-icon text-primary mb-2" />
                    <p className="text-muted">Loading live staff records...</p>
                  </td>
                </tr>
              ) : paginatedStaff.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-5">
                    <Users className="icon-xl text-muted mb-2" />
                    <p className="font-semibold text-dark">No staff members found</p>
                    <p className="text-sm text-muted">Try adjusting your search filter</p>
                  </td>
                </tr>
              ) : (
                paginatedStaff.map((staff) => {
                  const isActive = staff.status === 'active';
                  const isAdmin = staff.role === 'admin';
                  const isMenuOpen = activeMenuId === staff.id;

                  return (
                    <tr key={staff.id} className="table-row-hover">
                      <td>
                        <div className="staff-user-cell">
                          <div className={`table-avatar ${isAdmin ? 'avatar-admin' : 'avatar-staff'}`}>
                            {getInitials(staff.full_name)}
                          </div>
                          <span className="font-bold text-dark truncate-text" title={staff.full_name}>
                            {staff.full_name}
                          </span>
                        </div>
                      </td>

                      <td>
                        <div className="cell-contact-info">
                          <span className="contact-email truncate-text" title={staff.email}>{staff.email}</span>
                          <span className="contact-mobile">{staff.mobile || 'No mobile'}</span>
                        </div>
                      </td>

                      <td>
                        <span className={`badge ${isAdmin ? 'badge-role-admin' : 'badge-role-staff'}`}>
                          <Shield className="icon-xs mr-1" />
                          {isAdmin ? 'Admin' : 'Staff'}
                        </span>
                      </td>

                      <td>
                        <span className={`badge ${isActive ? 'badge-status-active' : 'badge-status-inactive'}`}>
                          {isActive ? <CheckCircle2 className="icon-xs mr-1" /> : <XCircle className="icon-xs mr-1" />}
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      <td className="text-sm text-muted">
                        {formatDateTime(staff.created_at)}
                      </td>

                      <td className="text-center">
                        <div className="action-buttons-group justify-center">
                          {/* 1. View Icon Button */}
                          <button
                            type="button"
                            className="btn-action-icon"
                            onClick={() => setViewingStaff(staff)}
                            title="View Staff Details"
                          >
                            <Eye className="icon-sm" />
                          </button>

                          {/* 2. Edit Profile Icon Button */}
                          <button
                            type="button"
                            className="btn-action-icon"
                            onClick={() => setViewingStaff(staff)}
                            title="Edit Staff Details"
                          >
                            <Edit3 className="icon-sm" />
                          </button>

                          {/* 3. Reset Password Key Icon Button */}
                          <button
                            type="button"
                            className="btn-action-icon btn-key-action"
                            onClick={() => setResetPasswordStaff(staff)}
                            title="Reset Staff Password"
                          >
                            <KeyRound className="icon-sm text-amber" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="mobile-cards-wrapper">
          {isLoading ? (
            <div className="text-center py-5">
              <Loader2 className="icon-lg spinner-icon text-primary mb-2" />
              <p className="text-muted">Loading staff records...</p>
            </div>
          ) : paginatedStaff.length === 0 ? (
            <div className="empty-card text-center py-5">
              <Users className="icon-xl text-muted mb-2" />
              <p className="font-semibold text-dark">No staff members found</p>
            </div>
          ) : (
            paginatedStaff.map((staff) => {
              const isActive = staff.status === 'active';
              const isAdmin = staff.role === 'admin';

              return (
                <div key={staff.id} className="mobile-card">
                  <div className="mobile-card-header">
                    <div className="mobile-card-user">
                      <div className={`table-avatar ${isAdmin ? 'avatar-admin' : 'avatar-staff'}`}>
                        {getInitials(staff.full_name)}
                      </div>
                      <div>
                        <h4 className="mobile-user-name">{staff.full_name}</h4>
                        <span className="mobile-user-email">{staff.email}</span>
                      </div>
                    </div>
                    <span className={`badge ${isActive ? 'badge-status-active' : 'badge-status-inactive'}`}>
                      {isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="mobile-card-body">
                    <div className="mobile-row">
                      <span className="mobile-label">Role:</span>
                      <span className={`badge ${isAdmin ? 'badge-role-admin' : 'badge-role-staff'}`}>
                        {isAdmin ? 'Administrator' : 'Staff'}
                      </span>
                    </div>
                    <div className="mobile-row">
                      <span className="mobile-label">Mobile:</span>
                      <span className="mobile-val">{staff.mobile || 'Not set'}</span>
                    </div>
                    <div className="mobile-row">
                      <span className="mobile-label">Joined:</span>
                      <span className="mobile-val text-muted">{formatDateTime(staff.created_at)}</span>
                    </div>
                  </div>

                  <div className="mobile-card-footer">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm flex-1"
                      onClick={() => setViewingStaff(staff)}
                    >
                      <Eye className="icon-xs mr-1" /> View Details
                    </button>

                    <button
                      type="button"
                      className="btn btn-secondary btn-sm flex-1 text-amber"
                      onClick={() => setResetPasswordStaff(staff)}
                    >
                      <KeyRound className="icon-xs mr-1" /> Reset Pass
                    </button>

                    {!isAdmin && (
                      <button
                        type="button"
                        className={`btn btn-sm flex-1 ${isActive ? 'btn-danger-outline' : 'btn-success-outline'}`}
                        onClick={() => confirmToggleStatus(staff)}
                      >
                        {isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Unified Pagination Footer */}
        <div className="clean-pagination-footer">
          <div className="pagination-left-info">
            <span className="pagination-count-text">
              Showing <strong>{filteredStaff.length > 0 ? startIndex + 1 : 0}</strong> to <strong>{endIndex}</strong> of <strong>{filteredStaff.length}</strong> records
            </span>
          </div>

          <div className="pagination-right-controls">
            <div className="rows-per-page-group">
              <label htmlFor="staffRowsSelect" className="rows-label">Per page:</label>
              <select
                id="staffRowsSelect"
                className="rows-select-clean"
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="pagination-nav-buttons">
              <button
                className="page-nav-btn"
                disabled={validCurrentPage <= 1}
                onClick={() => setCurrentPage(1)}
                title="First Page"
                aria-label="First Page"
              >
                <ChevronsLeft className="icon-xs" />
              </button>

              <button
                className="page-nav-btn"
                disabled={validCurrentPage <= 1}
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                title="Previous Page"
                aria-label="Previous Page"
              >
                <ChevronLeft className="icon-xs" />
              </button>

              {getPageNumbers().map((pageNum) => (
                <button
                  key={pageNum}
                  className={`page-num-btn ${validCurrentPage === pageNum ? 'active' : ''}`}
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </button>
              ))}

              <button
                className="page-nav-btn"
                disabled={validCurrentPage >= totalPages}
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                title="Next Page"
                aria-label="Next Page"
              >
                <ChevronRight className="icon-xs" />
              </button>

              <button
                className="page-nav-btn"
                disabled={validCurrentPage >= totalPages}
                onClick={() => setCurrentPage(totalPages)}
                title="Last Page"
                aria-label="Last Page"
              >
                <ChevronsRight className="icon-xs" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Action Dialog Modal */}
      {confirmDialog && (
        <div className="modal-overlay animate-fade-in" onClick={() => setConfirmDialog(null)}>
          <div className="modal-container confirm-modal-box animate-scale-up" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <div className={`modal-icon-badge ${confirmDialog.type === 'status' && confirmDialog.newStatus === 'inactive' ? 'bg-red-light text-danger' : 'bg-blue-light text-primary'}`}>
                  <AlertTriangle className="icon-md" />
                </div>
                <div>
                  <h3 className="modal-title">{confirmDialog.title}</h3>
                </div>
              </div>
              <button type="button" className="btn-close" onClick={() => setConfirmDialog(null)}>
                <X className="icon-sm" />
              </button>
            </div>
            <div className="modal-body py-4">
              <p className="text-dark font-medium leading-relaxed">{confirmDialog.message}</p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setConfirmDialog(null)}>
                Cancel
              </button>
              <button 
                type="button" 
                className={`btn ${confirmDialog.type === 'status' && confirmDialog.newStatus === 'inactive' ? 'btn-danger' : 'btn-primary'}`}
                onClick={handleExecuteStatusToggle}
              >
                Confirm Action
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Staff Modal */}
      <CreateStaffModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onStaffCreated={handleCreateStaff}
      />

      {/* Staff Details / Edit Profile Modal */}
      {viewingStaff && (
        <StaffDetailModal
          staff={viewingStaff}
          onClose={() => setViewingStaff(null)}
          onToggleStatus={confirmToggleStatus}
        />
      )}

      {/* Reset Password Form Modal */}
      <ResetPasswordModal
        isOpen={!!resetPasswordStaff}
        staff={resetPasswordStaff}
        onClose={() => setResetPasswordStaff(null)}
        onSuccess={(msg) => showToast(msg, 'success')}
      />

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
};

export default StaffManagement;
