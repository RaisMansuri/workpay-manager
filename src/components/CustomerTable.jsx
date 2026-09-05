import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Search, Filter, Edit3, Trash2, Eye, Clock, RotateCcw, Download,
  Phone, MapPin, Inbox, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, UserPlus, Info, X, Calendar, SlidersHorizontal, Users, User, ChevronDown, Check
} from 'lucide-react';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { WORK_STATUS, SEVA_SERVICES, CUSTOMER_REQUIREMENTS } from '../constants/serviceTypes';
import { staffService } from '../services/staffService';

// Reusable Service Info Tooltip Component
const ServiceInfoTooltip = ({ tooltipId, activeTooltipId, setActiveTooltipId, serviceType, workDescription }) => {
  const isOpen = activeTooltipId === tooltipId;
  const notesText = workDescription && workDescription.trim() ? workDescription.trim() : 'No notes available';

  const toggleTooltip = (e) => {
    e.stopPropagation();
    setActiveTooltipId((prev) => (prev === tooltipId ? null : tooltipId));
  };

  return (
    <div className="service-info-badge-group">
      <span className="service-tag">{serviceType}</span>
      <div className="service-info-icon-wrapper">
        <button
          type="button"
          className="service-info-btn"
          onClick={toggleTooltip}
          onMouseEnter={() => setActiveTooltipId(tooltipId)}
          onMouseLeave={() => setActiveTooltipId((prev) => (prev === tooltipId ? null : prev))}
          aria-label="Notes information"
        >
          <Info className="icon-xs" />
        </button>

        {isOpen && (
          <div className="service-compact-tooltip" onClick={(e) => e.stopPropagation()}>
            <div className="tooltip-title">Work Description / Notes</div>
            <div className="tooltip-body">{notesText}</div>
          </div>
        )}
      </div>
    </div>
  );
};

// Reusable Address Location Tooltip Component
const AddressInfoTooltip = ({ tooltipId, activeTooltipId, setActiveTooltipId, address }) => {
  const isOpen = activeTooltipId === tooltipId;
  const addressText = address && address.trim() ? address.trim() : 'No address available';

  const toggleTooltip = (e) => {
    e.stopPropagation();
    setActiveTooltipId((prev) => (prev === tooltipId ? null : tooltipId));
  };

  return (
    <div className="address-info-icon-wrapper">
      <button
        type="button"
        className="address-location-btn"
        onClick={toggleTooltip}
        onMouseEnter={() => setActiveTooltipId(tooltipId)}
        onMouseLeave={() => setActiveTooltipId((prev) => (prev === tooltipId ? null : prev))}
        aria-label="Address details"
      >
        <MapPin className="icon-xs" />
      </button>

      {isOpen && (
        <div className="service-compact-tooltip address-tooltip" onClick={(e) => e.stopPropagation()}>
          <div className="tooltip-title">Address / Locality</div>
          <div className="tooltip-body">{addressText}</div>
        </div>
      )}
    </div>
  );
};

// React Portal Filter Popover / Bottom Sheet Component
const FilterPopover = ({
  isOpen,
  onClose,
  anchorRef,
  records,
  selectedStatus,
  selectedService,
  selectedRequirement,
  selectedDateOption,
  fromDate,
  toDate,
  onApplyFilters,
  onResetFilters
}) => {
  const [draftStatus, setDraftStatus] = useState(selectedStatus);
  const [draftService, setDraftService] = useState(selectedService);
  const [draftRequirement, setDraftRequirement] = useState(selectedRequirement || 'All');
  const [draftDateOption, setDraftDateOption] = useState(selectedDateOption);
  const [draftFromDate, setDraftFromDate] = useState(fromDate);
  const [draftToDate, setDraftToDate] = useState(toDate);
  const [coords, setCoords] = useState({ top: 0, right: 0, isMobile: false });

  // Sync draft state when opened
  useEffect(() => {
    if (isOpen) {
      setDraftStatus(selectedStatus);
      setDraftService(selectedService);
      setDraftRequirement(selectedRequirement || 'All');
      setDraftDateOption(selectedDateOption);
      setDraftFromDate(fromDate);
      setDraftToDate(toDate);
    }
  }, [isOpen, selectedStatus, selectedService, selectedRequirement, selectedDateOption, fromDate, toDate]);

  // Calculate positioning coordinates relative to anchor button
  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      const isMobile = window.innerWidth <= 768;
      if (isMobile) {
        setCoords({ isMobile: true, top: 0, right: 0 });
      } else if (anchorRef && anchorRef.current) {
        const rect = anchorRef.current.getBoundingClientRect();
        const rightSpace = window.innerWidth - rect.right;
        const top = rect.bottom + 8;
        setCoords({
          top,
          right: Math.max(16, rightSpace),
          isMobile: false
        });
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, anchorRef]);

  // Outside click & Escape key listener
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e) => {
      if (anchorRef && anchorRef.current && anchorRef.current.contains(e.target)) {
        return;
      }
      const popoverEl = document.getElementById('filter-popover-portal-container');
      if (popoverEl && !popoverEl.contains(e.target)) {
        onClose();
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, anchorRef, onClose]);

  if (!isOpen) return null;

  const handleApply = () => {
    onApplyFilters({
      status: draftStatus,
      service: draftService,
      requirement: draftRequirement,
      dateOption: draftDateOption,
      fromDate: draftFromDate,
      toDate: draftToDate
    });
  };

  const DATE_OPTIONS = ['All Time', 'Today', 'Yesterday', 'This Week', 'This Month', 'Custom Date Range'];

  const popoverContent = (
    <div className={`filter-popover-backdrop ${coords.isMobile ? 'is-mobile' : 'is-desktop'}`}>
      <div
        id="filter-popover-portal-container"
        className={`filter-popover-panel ${coords.isMobile ? 'mobile-sheet' : 'desktop-popover'}`}
        style={
          !coords.isMobile
            ? {
              position: 'fixed',
              top: `${coords.top}px`,
              right: `${coords.right}px`,
              zIndex: 10000
            }
            : {}
        }
      >
        <div className="filter-modal-header">
          <div className="filter-modal-title">
            <SlidersHorizontal className="icon-sm" />
            <span>Filters</span>
          </div>
          <button className="drawer-close-btn" onClick={onClose} title="Close Filters (Esc)">
            <X className="icon-sm" />
          </button>
        </div>

        <div className="filter-modal-body">
          {/* Work Status Section */}
          <div className="filter-section">
            <label className="filter-section-label">Work Status</label>
            <div className="filter-pills-grid">
              {['All', WORK_STATUS.PENDING, WORK_STATUS.IN_PROGRESS, WORK_STATUS.COMPLETED].map((st) => (
                <button
                  key={st}
                  type="button"
                  className={`filter-pill-btn ${draftStatus === st ? 'active' : ''}`}
                  onClick={() => setDraftStatus(st)}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Service Type Section */}
          <div className="filter-section">
            <label className="filter-section-label">Service Type</label>
            <select
              className="form-select filter-select"
              value={draftService}
              onChange={(e) => setDraftService(e.target.value)}
            >
              <option value="All">All Services</option>
              {SEVA_SERVICES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter Section */}
          <div className="filter-section">
            <label className="filter-section-label">Date Filter</label>
            <div className="date-options-grid">
              {DATE_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={`date-option-btn ${draftDateOption === opt ? 'active' : ''}`}
                  onClick={() => setDraftDateOption(opt)}
                >
                  {opt}
                </button>
              ))}
            </div>

            {draftDateOption === 'Custom Date Range' && (
              <div className="custom-date-inputs">
                <div className="form-group date-field mb-0">
                  <label className="form-label text-xs">From Date</label>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={draftFromDate}
                    onChange={(e) => setDraftFromDate(e.target.value)}
                  />
                </div>
                <div className="form-group date-field mb-0">
                  <label className="form-label text-xs">To Date</label>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={draftToDate}
                    onChange={(e) => setDraftToDate(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="filter-modal-footer">
          <button type="button" className="btn btn-secondary flex-1" onClick={onResetFilters}>
            Reset
          </button>
          <button type="button" className="btn btn-primary flex-1" onClick={handleApply}>
            Apply
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(popoverContent, document.body);
};

export const CustomerTable = ({
  records,
  onEdit,
  onDelete,
  onViewDetails,
  onOpenNewDrawer,
  onExportCSV,
  editingRecordId,
  userRole = 'admin',
  profile
}) => {
  const effectiveRole = profile?.role || userRole;
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedService, setSelectedService] = useState('All');
  const [selectedRequirement, setSelectedRequirement] = useState('All');
  const [selectedDateOption, setSelectedDateOption] = useState('All Time');
  const [selectedStaff, setSelectedStaff] = useState('All');
  const [staffOptions, setStaffOptions] = useState([]);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [isStaffDropdownOpen, setIsStaffDropdownOpen] = useState(false);
  const staffDropdownRef = useRef(null);

  // Fetch staff options from database & subscribe to Realtime updates
  useEffect(() => {
    let isMounted = true;
    const fetchStaff = async () => {
      try {
        const data = await staffService.getStaffListAsync();
        if (isMounted) {
          setStaffOptions(data || []);
        }
      } catch (err) {
        console.error('Failed to load staff list for filter:', err);
      }
    };
    fetchStaff();

    const unsubscribe = staffService.subscribeToRealtime((updated) => {
      if (isMounted && updated) {
        setStaffOptions(updated);
      }
    });

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Extract all unique staff users dynamically from DB profiles AND customer records
  const uniqueStaffOptions = useMemo(() => {
    const map = new Map();

    // 1. Add staff from database profiles
    (staffOptions || []).forEach((s) => {
      if (s && s.role !== 'admin' && s.full_name !== 'Admin' && s.full_name !== 'Admin Manager') {
        const idKey = s.id || s.email;
        if (idKey) {
          map.set(String(idKey).toLowerCase(), {
            id: s.id || s.email,
            name: s.full_name || s.email || 'Staff User'
          });
        }
      }
    });

    // 2. Add creators from customer records
    (records || []).forEach((r) => {
      const creator = String(r.created_by || r.createdBy || '').trim();
      if (
        creator &&
        creator.toLowerCase() !== 'admin' &&
        !creator.toLowerCase().includes('admin')
      ) {
        const key = creator.toLowerCase();
        if (!map.has(key)) {
          const found = (staffOptions || []).find(
            (s) => (s.id && String(s.id).toLowerCase() === key) || (s.email && s.email.toLowerCase() === key)
          );

          let displayName = found?.full_name || found?.email;
          if (!displayName) {
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(creator);
            displayName = isUUID ? 'Staff User' : (creator.includes('@') ? creator.split('@')[0] : creator);
          }

          map.set(key, {
            id: creator,
            name: displayName
          });
        }
      }
    });

    return Array.from(map.values());
  }, [staffOptions, records]);

  // Close custom staff dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (staffDropdownRef.current && !staffDropdownRef.current.contains(e.target)) {
        setIsStaffDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Helper for resolving Creator Staff User Name directly from matching profile ID in public.profiles
  const getStaffName = (creatorId) => {
    if (!creatorId) return 'Admin';
    const str = String(creatorId).trim();
    if (str.toLowerCase() === 'admin' || str.toLowerCase().includes('admin')) {
      return 'Admin';
    }

    // 1. Direct match by ID in staffOptions (from public.profiles table)
    let found = (staffOptions || []).find(
      (s) => s.id && String(s.id).toLowerCase() === str.toLowerCase()
    );

    // 2. Direct match by Email or Name in staffOptions
    if (!found) {
      found = (staffOptions || []).find(
        (s) =>
          (s.email && s.email.toLowerCase() === str.toLowerCase()) ||
          (s.full_name && s.full_name.toLowerCase() === str.toLowerCase())
      );
    }

    // 3. Match from localStorage cached profiles
    if (!found && typeof window !== 'undefined') {
      try {
        const cachedStr = localStorage.getItem('workpay_cached_staff_profiles');
        if (cachedStr) {
          const cachedProfiles = JSON.parse(cachedStr);
          found = cachedProfiles.find(
            (s) =>
              (s.id && String(s.id).toLowerCase() === str.toLowerCase()) ||
              (s.email && s.email.toLowerCase() === str.toLowerCase()) ||
              (s.full_name && s.full_name.toLowerCase() === str.toLowerCase())
          );
        }
      } catch (err) { /* ignore */ }
    }

    // Return full_name directly from public.profiles table
    if (found?.full_name) {
      return found.full_name;
    }

    if (found?.email) {
      const prefix = found.email.split('@')[0];
      return prefix.charAt(0).toUpperCase() + prefix.slice(1);
    }

    // 4. Match currently logged-in profile
    if (profile) {
      const pId = profile.id ? String(profile.id).toLowerCase() : '';
      const pEmail = profile.email ? profile.email.toLowerCase() : '';
      if (
        (pId && str.toLowerCase() === pId) ||
        (pEmail && str.toLowerCase() === pEmail)
      ) {
        if (profile.full_name) return profile.full_name;
      }
    }

    // 5. If str is an email address
    if (str.includes('@')) {
      const prefix = str.split('@')[0];
      return prefix.charAt(0).toUpperCase() + prefix.slice(1);
    }

    // 6. If str is a plain name string
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
    if (!isUUID && str.length > 0) {
      return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // 7. Fallback for non-admin creator ID: resolve to staff full name or Staff User (NEVER Admin)
    const staffObj = (staffOptions || []).find((s) => s.role !== 'admin' && s.full_name);
    if (staffObj?.full_name) {
      return staffObj.full_name;
    }

    return profile?.role === 'staff' ? (profile.full_name || 'Staff User') : 'Staff User';
  };

  // Ref for anchoring desktop filter popover
  const desktopFilterBtnRef = useRef(null);
  const mobileFilterBtnRef = useRef(null);

  // Filter Panel Open State
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  // Pagination state - Default 10 rows per page
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Active Tooltip state (only one tooltip open at a time)
  const [activeTooltipId, setActiveTooltipId] = useState(null);

  // Close active tooltip when clicking anywhere outside
  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveTooltipId(null);
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  // Reset to Page 1 when filters or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedStatus, selectedService, selectedRequirement, selectedDateOption, selectedStaff, fromDate, toDate, rowsPerPage]);

  // Helper for generating Customer Initials Avatar
  const getInitials = (name) => {
    if (!name) return 'CK';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Helper for generating deterministic colorful avatar background
  const getAvatarGradient = (name) => {
    const gradients = [
      'linear-gradient(135deg, #3b82f6, #1d4ed8)',
      'linear-gradient(135deg, #10b981, #047857)',
      'linear-gradient(135deg, #6366f1, #4338ca)',
      'linear-gradient(135deg, #f59e0b, #b45309)',
      'linear-gradient(135deg, #ec4899, #be185d)',
      'linear-gradient(135deg, #8b5cf6, #6d28d9)',
      'linear-gradient(135deg, #06b6d4, #0e7490)'
    ];
    let hash = 0;
    const str = name || 'Customer';
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % gradients.length;
    return gradients[index];
  };

  // Helper for filtering records by Date Option
  const filterByDateOption = (recordDateStr, option, fDateStr, tDateStr) => {
    if (!recordDateStr || option === 'All Time') return true;

    const recDate = new Date(recordDateStr);
    if (isNaN(recDate.getTime())) return true;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (option === 'Today') {
      return recDate >= todayStart && recDate <= todayEnd;
    }

    if (option === 'Yesterday') {
      const yestStart = new Date(todayStart);
      yestStart.setDate(yestStart.getDate() - 1);
      const yestEnd = new Date(todayEnd);
      yestEnd.setDate(yestEnd.getDate() - 1);
      return recDate >= yestStart && recDate <= yestEnd;
    }

    if (option === 'This Week') {
      const weekStart = new Date(todayStart);
      const day = weekStart.getDay();
      const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
      weekStart.setDate(diff);
      return recDate >= weekStart && recDate <= todayEnd;
    }

    if (option === 'This Month') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return recDate >= monthStart && recDate <= todayEnd;
    }

    if (option === 'Custom Date Range') {
      let valid = true;
      if (fDateStr) {
        const fDate = new Date(`${fDateStr}T00:00:00`);
        if (!isNaN(fDate.getTime())) {
          valid = valid && recDate >= fDate;
        }
      }
      if (tDateStr) {
        const tDate = new Date(`${tDateStr}T23:59:59.999`);
        if (!isNaN(tDate.getTime())) {
          valid = valid && recDate <= tDate;
        }
      }
      return valid;
    }

    return true;
  };

  // Filter records based on Search, Status, Service Type, Requirement, and Date Filter
  const filteredRecords = (records || []).filter((record) => {
    if (!record) return false;
    const query = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !query ||
      (record.customerName && record.customerName.toLowerCase().includes(query)) ||
      (record.mobileNumber && record.mobileNumber.includes(query)) ||
      (record.address && record.address.toLowerCase().includes(query)) ||
      (record.serviceType && record.serviceType.toLowerCase().includes(query));

    const matchesStatus =
      selectedStatus === 'All' || record.status === selectedStatus;

    const matchesService =
      selectedService === 'All' || record.serviceType === selectedService;

    const matchesRequirement =
      selectedRequirement === 'All' ||
      record.requirement === selectedRequirement;

    const matchesDate = filterByDateOption(record.createdAt, selectedDateOption, fromDate, toDate);

    const creator = String(record.createdBy || record.created_by || '').trim();
    let matchesStaff = selectedStaff === 'All';

    if (!matchesStaff && creator) {
      const creatorLower = creator.toLowerCase();
      const selectedLower = selectedStaff.toLowerCase();

      // Find selected staff profile object from staffOptions
      const targetStaff = staffOptions.find(
        (s) =>
          (s.id && String(s.id).toLowerCase() === selectedLower) ||
          (s.email && s.email.toLowerCase() === selectedLower) ||
          (s.full_name && s.full_name.toLowerCase() === selectedLower)
      );

      if (targetStaff) {
        const targetId = targetStaff.id ? String(targetStaff.id).toLowerCase() : '';
        const targetEmail = targetStaff.email ? targetStaff.email.toLowerCase() : '';
        const targetName = targetStaff.full_name ? targetStaff.full_name.toLowerCase() : '';

        matchesStaff =
          (targetId && creatorLower === targetId) ||
          (targetEmail && creatorLower === targetEmail) ||
          (targetName && creatorLower === targetName);
      } else {
        matchesStaff = creatorLower === selectedLower;
      }
    }

    return matchesSearch && matchesStatus && matchesService && matchesRequirement && matchesDate && matchesStaff;
  });

  const activeFilterCount =
    (selectedStatus !== 'All' ? 1 : 0) +
    (selectedService !== 'All' ? 1 : 0) +
    (selectedRequirement !== 'All' ? 1 : 0) +
    (selectedDateOption !== 'All Time' ? 1 : 0) +
    (selectedStaff !== 'All' ? 1 : 0);

  const handleApplyMobileFilters = ({ status, service, requirement, dateOption, fromDate: fD, toDate: tD }) => {
    setSelectedStatus(status);
    setSelectedService(service);
    if (requirement) setSelectedRequirement(requirement);
    setSelectedDateOption(dateOption);
    setFromDate(fD);
    setToDate(tD);
    setIsFilterPanelOpen(false);
  };

  const handleResetMobileFilters = () => {
    setSelectedStatus('All');
    setSelectedService('All');
    setSelectedRequirement('All');
    setSelectedDateOption('All Time');
    setSelectedStaff('All');
    setFromDate('');
    setToDate('');
    setIsFilterPanelOpen(false);
  };

  // Calculate Pagination Slices
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / rowsPerPage));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, filteredRecords.length);
  const paginatedRecords = filteredRecords.slice(startIndex, endIndex);

  const getStatusBadge = (status) => {
    switch (status) {
      case WORK_STATUS.PENDING:
        return (
          <span className="badge badge-status-pending">
            Pending
          </span>
        );
      case WORK_STATUS.IN_PROGRESS:
        return (
          <span className="badge badge-status-in-progress">
            In Progress
          </span>
        );
      case WORK_STATUS.COMPLETED:
        return (
          <span className="badge badge-status-completed">
            Completed
          </span>
        );
      default:
        return <span className="badge">{status}</span>;
    }
  };

  // Generate page numbers array for pagination bar
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

  const activeAnchorRef = window.innerWidth <= 768 ? mobileFilterBtnRef : desktopFilterBtnRef;

  return (
    <div className="card table-card">
      {/* Table Top Controls Bar */}
      <div className="table-header-controls">
        {/* ROW 1: Search Left | New Entry Right */}
        <div className="filter-row-1">
          <div className="search-box">
            <Search className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search customer or mobile..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button className="clear-search-btn" onClick={() => setSearchTerm('')}>
                ×
              </button>
            )}
          </div>

          <div className="table-actions-group">
            {onExportCSV && effectiveRole === 'admin' && (
              <button
                type="button"
                className="btn-export-table"
                onClick={onExportCSV}
                title="Export customer records to CSV file"
              >
                <Download className="icon-sm text-secondary" />
                <span>Export CSV</span>
              </button>
            )}

            <button
              className="btn-new-entry"
              onClick={onOpenNewDrawer}
              title="Register a new customer record"
            >
              <UserPlus className="icon-sm" />
              <span>New Entry</span>
            </button>
          </div>
        </div>

        {/* ROW 2: Filters Row (Status | Service | Date/Time | Staff Member) */}
        <div className="filter-row-2">
          {/* Status Dropdown Filter */}
          <div className="clean-filter-control">
            <Clock className="filter-control-icon" />
            <select
              className="clean-filter-select"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              aria-label="Filter by work status"
            >
              <option value="All">All Statuses ({records.length})</option>
              <option value={WORK_STATUS.PENDING}>
                Pending ({records.filter((r) => r.status === WORK_STATUS.PENDING).length})
              </option>
              <option value={WORK_STATUS.IN_PROGRESS}>
                In Progress ({records.filter((r) => r.status === WORK_STATUS.IN_PROGRESS).length})
              </option>
              <option value={WORK_STATUS.COMPLETED}>
                Completed ({records.filter((r) => r.status === WORK_STATUS.COMPLETED).length})
              </option>
            </select>
          </div>

          {/* Requirement Dropdown Filter */}
          <div className="clean-filter-control">
            <SlidersHorizontal className="filter-control-icon" />
            <select
              className="clean-filter-select"
              value={selectedRequirement}
              onChange={(e) => setSelectedRequirement(e.target.value)}
              aria-label="Filter by requirement"
            >
              <option value="All">All Requirements ({records.length})</option>
              {CUSTOMER_REQUIREMENTS.map((r) => (
                <option key={r} value={r}>
                  {r} ({records.filter((rec) => rec.requirement === r).length})
                </option>
              ))}
            </select>
          </div>

          {/* Service Dropdown Filter */}
          <div className="clean-filter-control">
            <Filter className="filter-control-icon" />
            <select
              className="clean-filter-select"
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              aria-label="Filter by service type"
            >
              <option value="All">All Services</option>
              {SEVA_SERVICES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter Dropdown */}
          <div className="clean-filter-control">
            <Calendar className="filter-control-icon" />
            <select
              className="clean-filter-select"
              value={selectedDateOption}
              onChange={(e) => setSelectedDateOption(e.target.value)}
              aria-label="Filter by date range"
            >
              <option value="All Time">All Time</option>
              <option value="Today">Today</option>
              <option value="Yesterday">Yesterday</option>
              <option value="This Week">This Week</option>
              <option value="This Month">This Month</option>
              <option value="Custom Date Range">Custom Date Range</option>
            </select>
          </div>

          {/* Simple Staff Member Dropdown Filter (Excludes Admin) */}
          {effectiveRole === 'admin' && (
            <div className="clean-filter-control">
              <Users className="filter-control-icon" />
              <select
                className="clean-filter-select"
                value={selectedStaff}
                onChange={(e) => setSelectedStaff(e.target.value)}
                aria-label="Filter by staff member"
              >
                <option value="All">All Staff Users</option>
                {uniqueStaffOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedDateOption === 'Custom Date Range' && (
            <div className="custom-date-inputs">
              <div className="date-input-pill" title="Start Date">
                <span className="date-pill-label">From:</span>
                <input
                  type="date"
                  className="date-picker-input"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>
              <span className="date-range-separator">to</span>
              <div className="date-input-pill" title="End Date">
                <span className="date-pill-label">To:</span>
                <input
                  type="date"
                  className="date-picker-input"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>
              {(fromDate || toDate) && (
                <button
                  type="button"
                  className="btn-clear-date"
                  onClick={() => {
                    setFromDate('');
                    setToDate('');
                  }}
                  title="Clear custom date selection"
                >
                  <X className="icon-xs" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Desktop Data Table View (> 768px) */}
      <div className="table-responsive desktop-table-view">
        <table className="data-table">
          <thead>
            <tr>
              <th>Customer Name & Address</th>
              <th>Mobile</th>
              <th className="text-left">Requirement</th>
              <th>Service Type</th>
              <th>Work Status</th>
              <th className="text-right">Total</th>
              <th className="text-right">Paid</th>
              <th className="text-right">Remaining Balance</th>
              <th>Date & Time</th>
              <th>Created By</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedRecords.length === 0 ? (
              <tr>
                <td colSpan={11} className="empty-state">
                  <div className="empty-state-content">
                    <Inbox className="empty-icon" />
                    <h4>No Customer Records Found</h4>
                    <p>Try adjusting your search query or status filters.</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedRecords.map((record) => {
                const isEditingThis = editingRecordId === record.id;
                const hasBalance = record.remainingBalance > 0;

                return (
                  <tr
                    key={record.id}
                    className={`table-row ${isEditingThis ? 'editing-row' : ''}`}
                  >
                    {/* Customer Name with Initials Avatar & Location Icon Tooltip */}
                    <td className="cell-customer">
                      <div className="customer-cell-container">
                        <div
                          className="customer-avatar"
                          style={{ background: getAvatarGradient(record.customerName) }}
                        >
                          {getInitials(record.customerName)}
                        </div>
                        <div className="customer-name-wrapper">
                          <div className="customer-name-row">
                            <strong className="customer-name">{record.customerName}</strong>
                            <AddressInfoTooltip
                              tooltipId={`dt-addr-${record.id}`}
                              activeTooltipId={activeTooltipId}
                              setActiveTooltipId={setActiveTooltipId}
                              address={record.address}
                            />
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Mobile */}
                    <td className="cell-mobile">
                      <a href={`tel:${record.mobileNumber}`} className="mobile-link">
                        <Phone className="icon-xs" />
                        {record.mobileNumber}
                      </a>
                    </td>

                    {/* Requirement Badge */}
                    <td className="cell-requirement text-left">
                      {record.requirement ? (
                        <span className="badge badge-requirement">
                          {record.requirement}
                        </span>
                      ) : (
                        <span className="text-muted text-xs">—</span>
                      )}
                    </td>

                    {/* Service Type with Info Tooltip */}
                    <td className="cell-service">
                      <ServiceInfoTooltip
                        tooltipId={`dt-svc-${record.id}`}
                        activeTooltipId={activeTooltipId}
                        setActiveTooltipId={setActiveTooltipId}
                        serviceType={record.serviceType}
                        workDescription={record.workDescription}
                      />
                    </td>

                    {/* Work Status */}
                    <td className="cell-status">{getStatusBadge(record.status)}</td>

                    {/* Total Amount */}
                    <td className="cell-amount text-right font-medium">
                      {formatCurrency(record.totalAmount)}
                    </td>

                    {/* Paid Amount */}
                    <td className="cell-amount text-right font-medium text-green">
                      {formatCurrency(record.paidAmount)}
                    </td>

                    {/* Remaining Balance */}
                    <td className="cell-amount text-right">
                      {hasBalance ? (
                        <span className="remaining-balance-pill">
                          {formatCurrency(record.remainingBalance)} Due
                        </span>
                      ) : (
                        <span className="paid-balance-pill">
                          Paid (₹0)
                        </span>
                      )}
                    </td>

                    {/* Date & Time */}
                    <td className="cell-date">
                      <span className="date-text">{formatDateTime(record.createdAt)}</span>
                    </td>

                    {/* Created By Staff Member */}
                    <td className="cell-created-by">
                      <span className="badge badge-staff-user">
                        <User className="icon-xs mr-1" />
                        {getStaffName(record.createdBy || record.created_by)}
                      </span>
                    </td>

                    {/* Action buttons */}
                    <td className="cell-actions text-center">
                      <div className="action-buttons-group">
                        <button
                          className="action-btn edit-btn"
                          title="Edit Customer Record"
                          onClick={() => onEdit(record)}
                        >
                          <Edit3 className="icon-sm" />
                        </button>

                        <button
                          className="action-btn view-btn"
                          title="View Service Ticket / Receipt"
                          onClick={() => onViewDetails(record)}
                        >
                          <Eye className="icon-sm" />
                        </button>

                        {effectiveRole !== 'staff' && onDelete && (
                          <button
                            className="action-btn delete-btn"
                            title="Delete Record"
                            onClick={() => onDelete(record)}
                          >
                            <Trash2 className="icon-sm" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Khata Book Ledger List View (<= 768px) */}
      <div className="mobile-card-list-view">
        {paginatedRecords.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-content">
              <Inbox className="empty-icon" />
              <h4>No Customer Records Found</h4>
              <p>Try adjusting your search query or status filters.</p>
            </div>
          </div>
        ) : (
          paginatedRecords.map((record) => {
            const isEditingThis = editingRecordId === record.id;
            const hasBalance = record.remainingBalance > 0;

            return (
              <div
                key={record.id}
                className={`mobile-ledger-card ${isEditingThis ? 'editing-card' : ''}`}
              >
                {/* 1. Header: Avatar | Name + Location Icon | Status Badge */}
                <div className="ledger-card-header">
                  <div className="ledger-customer-info">
                    <div
                      className="customer-avatar"
                      style={{ background: getAvatarGradient(record.customerName) }}
                    >
                      {getInitials(record.customerName)}
                    </div>
                    <div className="ledger-customer-details">
                      <div className="customer-name-row">
                        <h4 className="ledger-customer-name">{record.customerName}</h4>
                        <AddressInfoTooltip
                          tooltipId={`mb-addr-${record.id}`}
                          activeTooltipId={activeTooltipId}
                          setActiveTooltipId={setActiveTooltipId}
                          address={record.address}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="ledger-status-box">
                    {getStatusBadge(record.status)}
                  </div>
                </div>

                {/* 2. Contact Phone, Requirement Badge & Service Tag Row */}
                <div className="ledger-tags-row">
                  <a href={`tel:${record.mobileNumber}`} className="mobile-phone-pill" title="Tap to Call Customer">
                    <Phone className="icon-xs" />
                    <span>{record.mobileNumber}</span>
                  </a>

                  {record.requirement && (
                    <span className="badge badge-requirement">
                      {record.requirement}
                    </span>
                  )}

                  <ServiceInfoTooltip
                    tooltipId={`mb-svc-${record.id}`}
                    activeTooltipId={activeTooltipId}
                    setActiveTooltipId={setActiveTooltipId}
                    serviceType={record.serviceType}
                    workDescription={record.workDescription}
                  />
                </div>

                {/* 4. 3-Column Khata Book Ledger Payment Grid */}
                <div className="ledger-payment-grid">
                  <div className="ledger-col">
                    <span className="ledger-label">TOTAL</span>
                    <span className="ledger-val">{formatCurrency(record.totalAmount)}</span>
                  </div>

                  <div className="ledger-col">
                    <span className="ledger-label">PAID</span>
                    <span className="ledger-val text-green">{formatCurrency(record.paidAmount)}</span>
                  </div>

                  <div className="ledger-col">
                    <span className="ledger-label">BALANCE</span>
                    {hasBalance ? (
                      <span className="remaining-balance-pill">
                        {formatCurrency(record.remainingBalance)} Due
                      </span>
                    ) : (
                      <span className="paid-balance-pill">
                        Paid (₹0)
                      </span>
                    )}
                  </div>
                </div>

                {/* 5. Card Footer: Date on left & Icon-Only Action Buttons on Right */}
                <div className="mobile-card-actions">
                  <span className="ledger-date-text">
                    <Clock className="icon-xs inline-icon" />
                    {formatDateTime(record.createdAt)}
                  </span>

                  <div className="action-buttons-group mobile-actions-right">
                    <button
                      className="action-btn edit-btn"
                      title="Edit Customer Record"
                      onClick={() => onEdit(record)}
                    >
                      <Edit3 className="icon-sm" />
                    </button>

                    <button
                      className="action-btn view-btn"
                      title="View Service Ticket / Receipt"
                      onClick={() => onViewDetails(record)}
                    >
                      <Eye className="icon-sm" />
                    </button>

                    {effectiveRole !== 'staff' && onDelete && (
                      <button
                        className="action-btn delete-btn"
                        title="Delete Record"
                        onClick={() => onDelete(record)}
                      >
                        <Trash2 className="icon-sm" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* React Portal Filter Popover / Bottom Sheet */}
      <FilterPopover
        isOpen={isFilterPanelOpen}
        onClose={() => setIsFilterPanelOpen(false)}
        anchorRef={activeAnchorRef}
        records={records}
        selectedStatus={selectedStatus}
        selectedService={selectedService}
        selectedDateOption={selectedDateOption}
        fromDate={fromDate}
        toDate={toDate}
        onApplyFilters={handleApplyMobileFilters}
        onResetFilters={handleResetMobileFilters}
      />

      {/* Single-Row Refined Pagination Footer */}
      <div className="clean-pagination-footer">
        <div className="pagination-left-info">
          <span className="pagination-count-text">
            Showing <strong>{filteredRecords.length > 0 ? startIndex + 1 : 0}</strong> - <strong>{endIndex}</strong> of <strong>{filteredRecords.length}</strong> records
          </span>
          {(searchTerm || selectedStatus !== 'All' || selectedService !== 'All' || selectedDateOption !== 'All Time') && (
            <button
              type="button"
              className="btn-clear-filters-secondary"
              onClick={() => {
                setSearchTerm('');
                setSelectedStatus('All');
                setSelectedService('All');
                setSelectedDateOption('All Time');
                setFromDate('');
                setToDate('');
              }}
            >
              Clear Filters
            </button>
          )}
        </div>

        <div className="pagination-right-controls">
          <div className="rows-per-page-group">
            <label htmlFor="rowsPerPageSelect" className="rows-label">Per page:</label>
            <select
              id="rowsPerPageSelect"
              className="rows-select-clean"
              value={rowsPerPage}
              onChange={(e) => setRowsPerPage(Number(e.target.value))}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
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
  );
};

export default CustomerTable;
