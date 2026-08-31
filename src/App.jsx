import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { SummaryCards } from './components/SummaryCards';
import { CustomerForm } from './components/CustomerForm';
import { CustomerTable } from './components/CustomerTable';
import { CustomerDetailModal } from './components/CustomerDetailModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { Toast } from './components/Toast';
import { customerStorage } from './services/customerStorage';
import { smsService } from './services/smsService';

export function App() {
  const [records, setRecords] = useState([]);
  const [editingRecord, setEditingRecord] = useState(null);
  const [viewingRecord, setViewingRecord] = useState(null);
  const [deletingRecord, setDeletingRecord] = useState(null);
  const [toast, setToast] = useState(null);

  // Reload records asynchronously from Supabase PostgreSQL / Storage
  const reloadData = useCallback(async () => {
    const loaded = await customerStorage.getRecordsAsync();
    setRecords(loaded);
  }, []);

  // Initial load + Real-Time Sync event listeners & Supabase Realtime Subscription
  useEffect(() => {
    reloadData();

    // 1. Supabase Realtime Subscription for PostgreSQL changes across all devices/clients
    const unsubscribeSupabase = customerStorage.subscribeToRealtime((updatedRecords) => {
      setRecords(updatedRecords);
    });

    // 2. Local window event listener for same-tab / multi-tab storage events
    const handleRealTimeSync = () => {
      reloadData();
    };

    window.addEventListener('storage', handleRealTimeSync);
    window.addEventListener(customerStorage.DB_CHANGE_EVENT, handleRealTimeSync);

    return () => {
      unsubscribeSupabase();
      window.removeEventListener('storage', handleRealTimeSync);
      window.removeEventListener(customerStorage.DB_CHANGE_EVENT, handleRealTimeSync);
    };
  }, [reloadData]);

  // Compute dynamic KPI summary metrics
  const stats = customerStorage.getSummaryStats(records);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  // Handle Save (Add or Edit)
  const handleSaveRecord = async (record, isEdit) => {
    // 1. First save customer record in Supabase
    const result = await customerStorage.saveRecordAsync(record);
    if (result.success) {
      setRecords(result.records);
      setEditingRecord(null);

      const savedRecord = result.record || record;

      // 2. Trigger Supabase Edge Function to send SMS to customer's mobile_number
      const smsRes = await smsService.sendCustomerSmsNotification(savedRecord);

      if (smsRes.success) {
        showToast(`Customer entry saved! SMS Sent Successfully to ${smsRes.recipient}`, 'success');
      } else if (smsRes.status === 'SMS Pending / Demo Mode') {
        showToast(`Customer entry saved! (SMS Status: SMS Pending / Demo Mode)`, 'info');
      } else {
        showToast(`Customer entry saved! (SMS Status: ${smsRes.error || 'SMS Failed'})`, 'info');
      }
    } else {
      showToast(`Failed to save record: ${result.error}`, 'error');
    }
  };

  // Handle Edit Action
  const handleStartEdit = (record) => {
    setEditingRecord(record);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingRecord(null);
  };

  // Handle Delete Action
  const handleConfirmDelete = async (id) => {
    const targetRecord = records.find(r => r.id === id);
    const result = await customerStorage.deleteRecordAsync(id);
    if (result.success) {
      setRecords(result.records);
      setDeletingRecord(null);
      if (editingRecord && editingRecord.id === id) {
        setEditingRecord(null);
      }
      showToast(
        targetRecord 
          ? `Customer record for ${targetRecord.customerName} deleted from DB.`
          : 'Customer record deleted from DB.', 
        'info'
      );
    } else {
      showToast(`Failed to delete record: ${result.error}`, 'error');
    }
  };

  // Handle Reset Demo Data
  const handleResetDemo = async () => {
    if (window.confirm('Reset database back to standard sample records?')) {
      const demoRecords = await customerStorage.resetToDemoDataAsync();
      setRecords(demoRecords);
      setEditingRecord(null);
      showToast('Database reset to sample demo customer records.', 'info');
    }
  };

  // CSV Export utility
  const handleExportCSV = () => {
    if (records.length === 0) {
      showToast('No records available to export.', 'info');
      return;
    }

    const headers = ['Customer Name', 'Mobile Number', 'Address', 'Service Type', 'Work Description', 'Work Status', 'Total Amount (INR)', 'Paid Amount (INR)', 'Remaining Balance (INR)', 'Created Date'];
    
    const rows = records.map(r => [
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
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `seva_kendra_records_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Exported ${records.length} customer records to CSV file.`, 'success');
  };

  return (
    <div className="app-layout">
      {/* Top Navbar Header */}
      <Navbar 
        onResetDemo={handleResetDemo}
        onExportCSV={handleExportCSV}
      />

      <main className="main-container">
        {/* Dashboard Summary KPI Cards */}
        <SummaryCards stats={stats} />

        {/* Desktop Two-Column Dashboard Layout */}
        <div className="dashboard-grid">
          {/* Left Column: Form Entry */}
          <section className="column-left">
            <CustomerForm
              editingRecord={editingRecord}
              onSave={handleSaveRecord}
              onCancelEdit={handleCancelEdit}
              existingRecords={records}
            />
          </section>

          {/* Right Column: Customer Data Grid */}
          <section className="column-right">
            <CustomerTable
              records={records}
              onEdit={handleStartEdit}
              onDelete={(record) => setDeletingRecord(record)}
              onViewDetails={(record) => setViewingRecord(record)}
              editingRecordId={editingRecord?.id}
            />
          </section>
        </div>
      </main>

      {/* Modals & Toasts */}
      {viewingRecord && (
        <CustomerDetailModal
          record={viewingRecord}
          onClose={() => setViewingRecord(null)}
          onEditRecord={(record) => handleStartEdit(record)}
        />
      )}

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
}

export default App;
