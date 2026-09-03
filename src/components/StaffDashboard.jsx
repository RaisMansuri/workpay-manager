import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './Navbar';
import { SummaryCards } from './SummaryCards';
import { CustomerForm } from './CustomerForm';
import { CustomerTable } from './CustomerTable';
import { CustomerDetailModal } from './CustomerDetailModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { Toast } from './Toast';
import { customerStorage } from '../services/customerStorage';
import { smsService } from '../services/smsService';
import { UserCheck } from 'lucide-react';

export const StaffDashboard = ({ profile, onLogout }) => {
  const [records, setRecords] = useState([]);
  const [editingRecord, setEditingRecord] = useState(null);
  const [viewingRecord, setViewingRecord] = useState(null);
  const [deletingRecord, setDeletingRecord] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [toast, setToast] = useState(null);

  // Reload records asynchronously from Supabase PostgreSQL
  const reloadData = useCallback(async () => {
    const loaded = await customerStorage.getRecordsAsync();
    setRecords(loaded);
  }, []);

  useEffect(() => {
    reloadData();

    // Realtime sync
    const unsubscribeSupabase = customerStorage.subscribeToRealtime((updatedRecords) => {
      setRecords(updatedRecords);
    });

    return () => {
      unsubscribeSupabase();
    };
  }, [reloadData]);

  // Filter customer records created strictly by this logged-in staff member
  const staffRecords = records.filter((r) => {
    if (!profile) return false;
    const creator = String(r.created_by || r.createdBy || '').trim();
    
    // 1. Exclude null / empty / unassigned records
    if (!creator) return false;
    
    // 2. Exclude Admin created records
    if (creator.toLowerCase() === 'admin' || creator.toLowerCase().includes('admin')) return false;

    // 3. Show ONLY records created by this logged-in staff user (matching ID, email, or name)
    const staffId = profile.id ? String(profile.id).toLowerCase() : '';
    const staffEmail = profile.email ? String(profile.email).toLowerCase() : '';
    const staffName = profile.full_name ? String(profile.full_name).toLowerCase() : '';

    const creatorLower = creator.toLowerCase();

    return (
      (staffId && creatorLower === staffId) ||
      (staffEmail && creatorLower === staffEmail) ||
      (staffName && creatorLower === staffName)
    );
  });

  const stats = customerStorage.getSummaryStats(staffRecords);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const handleOpenNewDrawer = () => {
    setEditingRecord(null);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setEditingRecord(null);
  };

  const handleSaveRecord = async (record, isEdit) => {
    const creatorName = profile?.full_name || profile?.email || 'Rahul';
    const recordToSave = {
      ...record,
      created_by: isEdit ? (record.created_by || creatorName) : creatorName,
      createdBy: isEdit ? (record.createdBy || creatorName) : creatorName
    };
    const result = await customerStorage.saveRecordAsync(recordToSave);
    if (result.success) {
      setRecords(result.records);
      setEditingRecord(null);
      setIsDrawerOpen(false);

      const savedRecord = result.record || record;
      const smsRes = await smsService.sendCustomerSmsNotification(savedRecord);

      if (smsRes.success) {
        showToast(`Customer entry saved! SMS Sent Successfully`, 'success');
      } else {
        showToast(`Customer entry saved!`, 'info');
      }
    } else {
      showToast(`Failed to save record: ${result.error}`, 'error');
    }
  };

  const handleConfirmDelete = async (id) => {
    const targetRecord = records.find(r => r.id === id);
    const result = await customerStorage.deleteRecordAsync(id);
    if (result.success) {
      setRecords(result.records);
      setDeletingRecord(null);
      if (editingRecord && editingRecord.id === id) {
        setEditingRecord(null);
        setIsDrawerOpen(false);
      }
      showToast(
        targetRecord 
          ? `Customer record for ${targetRecord.customerName} deleted.`
          : 'Customer record deleted.', 
        'info'
      );
    } else {
      showToast(`Failed to delete record: ${result.error}`, 'error');
    }
  };

  const handleExportCSV = () => {
    if (staffRecords.length === 0) {
      showToast('No records available to export.', 'info');
      return;
    }
    const headers = ['Customer Name', 'Mobile Number', 'Address', 'Service Type', 'Work Status', 'Total Amount', 'Paid Amount', 'Remaining Balance'];
    const rows = staffRecords.map(r => [
      `"${r.customerName || ''}"`,
      `"${r.mobileNumber}"`,
      `"${r.address || ''}"`,
      `"${r.serviceType || ''}"`,
      `"${r.status}"`,
      r.totalAmount,
      r.paidAmount,
      r.remainingBalance
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `staff_records_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="app-layout">
      {/* Top Navbar with Profile & Logout */}
      <Navbar
        profile={profile}
        onLogout={onLogout}
        onExportCSV={handleExportCSV}
        onOpenNewDrawer={handleOpenNewDrawer}
      />

      <main className="main-container">
        {/* Welcome Header */}
        <div className="staff-welcome-banner">
          <div className="welcome-text-group">
            <h2 className="welcome-title">
              <UserCheck className="icon-md text-primary" />
              <span>Welcome, {profile?.full_name || 'Staff Member'}</span>
            </h2>
            <p className="welcome-subtitle">
              Staff Portal • Register & track customer service requests
            </p>
          </div>
        </div>

        {/* Dynamic Summary Cards for Logged-In Staff User */}
        <SummaryCards stats={stats} />

        {/* Customer Records Table Section */}
        <div className="dashboard-grid mt-4">
          <section className="column-full">
            <CustomerTable
              records={staffRecords}
              profile={profile}
              userRole="staff"
              onEdit={(r) => { setEditingRecord(r); setIsDrawerOpen(true); }}
              onViewDetails={(r) => setViewingRecord(r)}
              onOpenNewDrawer={handleOpenNewDrawer}
              editingRecordId={editingRecord?.id}
            />
          </section>
        </div>
      </main>

      {/* Customer Form Drawer */}
      <CustomerForm
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        editingRecord={editingRecord}
        onSave={handleSaveRecord}
        onCancelEdit={() => { setEditingRecord(null); setIsDrawerOpen(false); }}
        existingRecords={staffRecords}
      />

      {/* Detail Modal */}
      {viewingRecord && (
        <CustomerDetailModal
          record={viewingRecord}
          onClose={() => setViewingRecord(null)}
          onEditRecord={(r) => { setEditingRecord(r); setIsDrawerOpen(true); }}
        />
      )}

      {/* Delete Modal */}
      {deletingRecord && (
        <DeleteConfirmModal
          record={deletingRecord}
          onClose={() => setDeletingRecord(null)}
          onConfirm={handleConfirmDelete}
        />
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
};

export default StaffDashboard;
