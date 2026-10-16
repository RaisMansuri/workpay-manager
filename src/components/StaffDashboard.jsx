import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './Navbar';
import { SummaryCards } from './SummaryCards';
import { CustomerForm } from './CustomerForm';
import { CustomerTable } from './CustomerTable';
import { CustomerDetailModal } from './CustomerDetailModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { ProfileModal } from './ProfileModal';
import { SubscriptionModal } from './SubscriptionModal';
import { AccountSettingsModal } from './AccountSettingsModal';
import { Toast } from './Toast';
import { customerStorage } from '../services/customerStorage';
import { smsService } from '../services/smsService';
import { subscriptionService } from '../services/subscriptionService';

export const StaffDashboard = ({ profile, onLogout, activeSubscription, onProfileUpdated, onSubscriptionUpdated }) => {
  const [records, setRecords] = useState([]);
  const [editingRecord, setEditingRecord] = useState(null);
  const [viewingRecord, setViewingRecord] = useState(null);
  const [deletingRecord, setDeletingRecord] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [activeModal, setActiveModal] = useState(null); // 'profile' | 'subscription' | 'settings' | null
  const [localSub, setLocalSub] = useState(activeSubscription || null);

  useEffect(() => {
    if (activeSubscription) {
      setLocalSub(activeSubscription);
    } else if (profile?.id) {
      subscriptionService.getActiveSubscriptionAsync(profile.id).then(setLocalSub);
    }
  }, [activeSubscription, profile]);

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
    const staffId = profile.id ? String(profile.id).toLowerCase() : '';
    const staffEmail = profile.email ? String(profile.email).toLowerCase() : '';
    const staffName = profile.full_name ? String(profile.full_name).toLowerCase() : '';

    const creatorProf = r.creatorProfile || r.profiles;
    if (creatorProf) {
      const role = String(creatorProf.role || '').toLowerCase();
      if (role === 'admin') return false;
      const cId = String(creatorProf.id || '').toLowerCase();
      const cEmail = String(creatorProf.email || '').toLowerCase();
      const cName = String(creatorProf.full_name || '').toLowerCase();
      return (
        (staffId && cId === staffId) ||
        (staffEmail && cEmail === staffEmail) ||
        (staffName && cName === staffName)
      );
    }

    const creatorId = String(r.created_by || r.createdBy || '').trim().toLowerCase();
    if (!creatorId) return false;
    if (creatorId === 'admin' || creatorId.includes('admin')) return false;

    return (
      (staffId && creatorId === staffId) ||
      (staffEmail && creatorId === staffEmail) ||
      (staffName && creatorId === staffName)
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
    const creatorId = profile?.id;
    const recordToSave = {
      ...record,
      created_by: isEdit ? (record.created_by || record.createdBy || creatorId) : creatorId,
      createdBy: isEdit ? (record.createdBy || record.created_by || creatorId) : creatorId
    };
    const result = await customerStorage.saveRecordAsync(recordToSave);
    if (result.success) {
      setRecords(result.records);
      setEditingRecord(null);
      setIsDrawerOpen(false);

      const savedRecord = result.record || record;
      await smsService.sendCustomerSmsNotification(savedRecord);
      showToast('Save Successfully', 'success');
    } else {
      showToast(`Failed to save record: ${result.error}`, 'error');
    }
  };

  const handleConfirmDelete = async (id) => {
    const result = await customerStorage.deleteRecordAsync(id);
    if (result.success) {
      setRecords(result.records);
      setDeletingRecord(null);
      if (editingRecord && editingRecord.id === id) {
        setEditingRecord(null);
        setIsDrawerOpen(false);
      }
      showToast('Record deleted.', 'info');
    } else {
      showToast(`Failed to delete record: ${result.error}`, 'error');
    }
  };

  const handleExportCSV = () => {
    if (staffRecords.length === 0) {
      showToast('No records available to export.', 'info');
      return;
    }

    const headers = ['Customer Name', 'Mobile Number', 'Address', 'Service Type', 'Work Description', 'Work Status', 'Total Amount', 'Paid Amount', 'Remaining Balance', 'Created Date'];
    
    const rows = staffRecords.map(r => [
      `"${(r.customerName || '').replace(/"/g, '""')}"`,
      `"${r.mobileNumber}"`,
      `"${(r.address || '').replace(/"/g, '""')}"`,
      `"${(r.serviceType || '').replace(/"/g, '""')}"`,
      `"${(r.workDescription || '').replace(/"/g, '""')}"`,
      `"${r.status}"`,
      r.totalAmount,
      r.paidAmount,
      r.remainingBalance,
      `"${r.createdAt}"`
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
      {/* Top Navbar with Profile Dropdown & Logout */}
      <Navbar
        profile={profile}
        onLogout={onLogout}
        onExportCSV={handleExportCSV}
        onOpenNewDrawer={handleOpenNewDrawer}
        onOpenProfile={() => setActiveModal('profile')}
        onOpenSubscription={() => setActiveModal('subscription')}
        onOpenSettings={() => setActiveModal('settings')}
        activeSubscription={localSub}
      />

      <main className="main-container">
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
              onDelete={(record) => setDeletingRecord(record)}
              onViewDetails={(r) => setViewingRecord(r)}
              onOpenNewDrawer={handleOpenNewDrawer}
              onExportCSV={handleExportCSV}
              onRefresh={reloadData}
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

      {/* Profile Modal */}
      <ProfileModal
        isOpen={activeModal === 'profile'}
        profile={profile}
        activeSubscription={localSub}
        onClose={() => setActiveModal(null)}
        onProfileUpdated={(updated) => {
          if (onProfileUpdated) onProfileUpdated(updated);
          showToast('Profile updated successfully!', 'success');
        }}
      />

      {/* Subscription Modal */}
      <SubscriptionModal
        isOpen={activeModal === 'subscription'}
        activeSubscription={localSub}
        staffCount={1}
        onClose={() => setActiveModal(null)}
        onSubscriptionUpdated={(updated) => {
          setLocalSub(updated);
          if (onSubscriptionUpdated) onSubscriptionUpdated(updated);
          showToast(`Subscription updated to ${updated.planName}!`, 'success');
        }}
      />

      {/* Account Settings Modal */}
      <AccountSettingsModal
        isOpen={activeModal === 'settings'}
        profile={profile}
        onClose={() => setActiveModal(null)}
        onPreferencesUpdated={(updated) => {
          if (onProfileUpdated) onProfileUpdated(updated);
          showToast('Preferences saved successfully!', 'success');
        }}
        onPasswordUpdated={() => {
          showToast('Password updated successfully!', 'success');
        }}
      />

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
};

export default StaffDashboard;
