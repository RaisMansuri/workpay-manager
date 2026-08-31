import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, Edit3, Trash2, Eye, Clock, CheckCircle2, RotateCcw, 
  Phone, MapPin, Inbox, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, UserPlus 
} from 'lucide-react';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { WORK_STATUS, SEVA_SERVICES } from '../constants/serviceTypes';

export const CustomerTable = ({
  records,
  onEdit,
  onDelete,
  onViewDetails,
  onOpenNewDrawer,
  editingRecordId
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedService, setSelectedService] = useState('All');

  // Pagination state - Default 10 rows per page
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Reset to Page 1 when filters or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedStatus, selectedService, rowsPerPage]);

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

  // Filter records based on Search, Status, and Service Type
  const filteredRecords = records.filter((record) => {
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

    return matchesSearch && matchesStatus && matchesService;
  });

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
            <Clock className="icon-xs" />
            Pending
          </span>
        );
      case WORK_STATUS.IN_PROGRESS:
        return (
          <span className="badge badge-status-in-progress">
            <RotateCcw className="icon-xs spin-slow" />
            In Progress
          </span>
        );
      case WORK_STATUS.COMPLETED:
        return (
          <span className="badge badge-status-completed">
            <CheckCircle2 className="icon-xs" />
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

  return (
    <div className="card table-card">
      {/* Table Top Controls Bar */}
      <div className="table-header-controls">
        <div className="table-controls-left">
          <div className="search-box">
            <Search className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search Customer Name, Mobile Number, or Address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button className="clear-search-btn" onClick={() => setSearchTerm('')}>
                ×
              </button>
            )}
          </div>
        </div>

        <div className="table-controls-right">
          {/* Status Filter Pills */}
          <div className="status-filter-pills">
            {['All', WORK_STATUS.PENDING, WORK_STATUS.IN_PROGRESS, WORK_STATUS.COMPLETED].map((st) => (
              <button
                key={st}
                className={`pill-btn ${selectedStatus === st ? 'active' : ''}`}
                onClick={() => setSelectedStatus(st)}
              >
                {st}
                <span className="pill-count">
                  {st === 'All'
                    ? records.length
                    : records.filter((r) => r.status === st).length}
                </span>
              </button>
            ))}
          </div>

          {/* Service Dropdown Filter */}
          <div className="service-filter-wrapper">
            <Filter className="input-icon" />
            <select
              className="form-select service-select-sm"
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
            >
              <option value="All">All Services</option>
              {SEVA_SERVICES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* New Customer Entry Button */}
          <button 
            className="btn-new-entry"
            onClick={onOpenNewDrawer}
            title="Register a new customer record"
          >
            <UserPlus className="icon-sm" />
            <span>+ New Entry</span>
          </button>
        </div>
      </div>

      {/* Data Table Container */}
      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>Customer Name & Address</th>
              <th>Mobile</th>
              <th>Service Type</th>
              <th>Work Status</th>
              <th className="text-right">Total</th>
              <th className="text-right">Paid</th>
              <th className="text-right">Remaining Balance</th>
              <th>Date & Time</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedRecords.length === 0 ? (
              <tr>
                <td colSpan={9} className="empty-state">
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
                    {/* Customer Name with Initials Avatar */}
                    <td className="cell-customer">
                      <div className="customer-cell-container">
                        <div 
                          className="customer-avatar"
                          style={{ background: getAvatarGradient(record.customerName) }}
                        >
                          {getInitials(record.customerName)}
                        </div>
                        <div className="customer-name-wrapper">
                          <strong className="customer-name">{record.customerName}</strong>
                          {record.address && (
                            <span className="customer-address">
                              <MapPin className="icon-xs inline-icon" />
                              {record.address}
                            </span>
                          )}
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

                    {/* Service Type */}
                    <td className="cell-service">
                      <span className="service-tag">{record.serviceType}</span>
                      {record.workDescription && (
                        <p className="work-desc-preview" title={record.workDescription}>
                          {record.workDescription}
                        </p>
                      )}
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

                        <button
                          className="action-btn delete-btn"
                          title="Delete Record"
                          onClick={() => onDelete(record)}
                        >
                          <Trash2 className="icon-sm" />
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

      {/* Single-Row Centered Pagination Footer */}
      <div className="table-pagination-footer">
        <div className="pagination-info-item">
          <span className="pagination-count-text">
            Showing <strong>{filteredRecords.length > 0 ? startIndex + 1 : 0}</strong> - <strong>{endIndex}</strong> of <strong>{filteredRecords.length}</strong> records
          </span>
          {(searchTerm || selectedStatus !== 'All' || selectedService !== 'All') && (
            <button
              className="btn-link ml-2"
              onClick={() => {
                setSearchTerm('');
                setSelectedStatus('All');
                setSelectedService('All');
              }}
            >
              Clear Filters
            </button>
          )}
        </div>

        <div className="pagination-info-item pagination-rows-select">
          <label htmlFor="rowsPerPageSelect" className="text-xs text-muted">Per page:</label>
          <select
            id="rowsPerPageSelect"
            className="form-select rows-select-sm"
            value={rowsPerPage}
            onChange={(e) => setRowsPerPage(Number(e.target.value))}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        <div className="pagination-info-item pagination-controls">
          <button
            className="page-btn"
            disabled={validCurrentPage <= 1}
            onClick={() => setCurrentPage(1)}
            title="First Page"
          >
            <ChevronsLeft className="icon-sm" />
          </button>
          
          <button
            className="page-btn"
            disabled={validCurrentPage <= 1}
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            title="Previous Page"
          >
            <ChevronLeft className="icon-sm" />
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
            className="page-btn"
            disabled={validCurrentPage >= totalPages}
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            title="Next Page"
          >
            <ChevronRight className="icon-sm" />
          </button>

          <button
            className="page-btn"
            disabled={validCurrentPage >= totalPages}
            onClick={() => setCurrentPage(totalPages)}
            title="Last Page"
          >
            <ChevronsRight className="icon-sm" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerTable;
