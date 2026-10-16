import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { SummaryCards } from './components/SummaryCards';
import { CustomerForm } from './components/CustomerForm';
import { CustomerTable } from './components/CustomerTable';
import { CustomerDetailModal } from './components/CustomerDetailModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { Toast } from './components/Toast';
import { LoginPage } from './components/LoginPage';
import { StaffDashboard } from './components/StaffDashboard';
import { StaffManagement } from './components/StaffManagement';
import { ProfileModal } from './components/ProfileModal';
import { SubscriptionModal } from './components/SubscriptionModal';
import { AccountSettingsModal } from './components/AccountSettingsModal';
import { customerStorage } from './services/customerStorage';
import { smsService } from './services/smsService';
import { authService } from './services/authService';
import { subscriptionService } from './services/subscriptionService';
import { staffService } from './services/staffService';
import { Building2, Loader2 } from 'lucide-react';

export function App() {
  // Authentication & Profile State
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [loginInitialError, setLoginInitialError] = useState('');

  // Simple path routing state
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [adminTab, setAdminTab] = useState(() => {
    const path = window.location.pathname;
    return (path === '/staff' || path === '/staff-management' || path.startsWith('/admin/staff')) ? 'staff' : 'dashboard';
  });

  // Keep adminTab in sync with route navigation
  useEffect(() => {
    if (currentPath === '/staff' || currentPath === '/staff-management' || currentPath.startsWith('/admin/staff')) {
      setAdminTab('staff');
    } else if (currentPath === '/dashboard' || currentPath === '/' || currentPath.startsWith('/admin/dashboard')) {
      setAdminTab('dashboard');
    }
  }, [currentPath]);

  // Application Data State
  const [records, setRecords] = useState([]);
  const [editingRecord, setEditingRecord] = useState(null);
  const [viewingRecord, setViewingRecord] = useState(null);
  const [deletingRecord, setDeletingRecord] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [toast, setToast] = useState(null);

  // Profile Dropdown & Modal State ('profile' | 'subscription' | 'settings' | null)
  const [activeModal, setActiveModal] = useState(null);
  const [activeSubscription, setActiveSubscription] = useState(null);
  const [staffCount, setStaffCount] = useState(0);

  // Navigation helper
  const navigate = useCallback((path) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setCurrentPath(path);
  }, []);

  // Listen for browser Back/Forward navigation
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Check and restore Supabase Auth session on initial load
  useEffect(() => {
    let isMounted = true;
    const checkAuth = async () => {
      try {
        const authResult = await authService.getSessionAndProfile();
        if (isMounted) {
          if (authResult.session && authResult.profile) {
            setSession(authResult.session);
            setProfile(authResult.profile);

            // Redirect logged-in users away from /login or default root or old /admin paths
            const path = window.location.pathname;
            if (path === '/' || path === '/login' || path.startsWith('/admin')) {
              const target = (path === '/staff' || path === '/admin/staff') ? '/staff' : '/dashboard';
              navigate(target);
            } else if (['/profile', '/subscription', '/settings'].includes(path)) {
              setActiveModal(path.substring(1));
            }
          } else {
            setSession(null);
            setProfile(null);
            if (authResult.isInactive || authResult.error) {
              setLoginInitialError(authResult.error || 'Your account has been deactivated. Please contact the administrator.');
            }
            navigate('/login');
          }
        }
      } catch (err) {
        console.error('Session check failed:', err);
      } finally {
        if (isMounted) {
          setIsCheckingAuth(false);
        }
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  // Handle successful login
  const handleLoginSuccess = (user, userProfile) => {
    setLoginInitialError('');
    setSession({ user });
    setProfile(userProfile);

    // Redirect to clean dashboard route
    navigate('/dashboard');
  };

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Handle Logout with Centered Loading Overlay & Silent Background
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      await authService.signOut(profile?.id);
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setSession(null);
      setProfile(null);
      setRecords([]);
      setLoginInitialError('');
      setIsLoggingOut(false);
      navigate('/login');
    }
  };

  // Real-time monitoring of logged-in user profile status (e.g. immediate deactivation by admin)
  useEffect(() => {
    if (!session || !profile || !profile.id) return;

    const unsubscribe = authService.subscribeToProfileChanges(profile.id, (updatedProfile) => {
      if (updatedProfile && updatedProfile.status === 'inactive') {
        setSession(null);
        setProfile(null);
        setRecords([]);
        setLoginInitialError('Your account has been deactivated. Please contact the administrator.');
        navigate('/login');
      } else if (updatedProfile) {
        setProfile(updatedProfile);
      }
    });

    const checkDemoDeactivation = () => {
      try {
        const raw = localStorage.getItem('workpay_demo_staff_members');
        if (raw) {
          const list = JSON.parse(raw);
          const current = list.find(s => s.id === profile.id || (s.email && s.email.toLowerCase() === profile.email?.toLowerCase()));
          if (current && current.status === 'inactive') {
            setSession(null);
            setProfile(null);
            setRecords([]);
            setLoginInitialError('Your account has been deactivated. Please contact the administrator.');
            navigate('/login');
          }
        }
      } catch (e) {
        /* ignore */
      }
    };

    window.addEventListener('storage', checkDemoDeactivation);
    window.addEventListener(customerStorage.DB_CHANGE_EVENT, checkDemoDeactivation);

    return () => {
      unsubscribe();
      window.removeEventListener('storage', checkDemoDeactivation);
      window.removeEventListener(customerStorage.DB_CHANGE_EVENT, checkDemoDeactivation);
    };
  }, [session, profile, navigate]);

  // Load active subscription and staff seats usage
  useEffect(() => {
    if (!profile) return;
    subscriptionService.getActiveSubscriptionAsync(profile.id).then((sub) => {
      setActiveSubscription(sub);
    });

    staffService.getStaffListAsync().then((list) => {
      setStaffCount(list ? list.filter(s => s.role !== 'admin').length : 0);
    });

    const unsubscribeStaff = staffService.subscribeToRealtime((list) => {
      setStaffCount(list ? list.filter(s => s.role !== 'admin').length : 0);
    });

    const handleSubChange = (e) => {
      if (e?.detail) setActiveSubscription(e.detail);
    };
    window.addEventListener('workpay_subscription_updated', handleSubChange);
    return () => {
      unsubscribeStaff();
      window.removeEventListener('workpay_subscription_updated', handleSubChange);
    };
  }, [profile]);

  // Handle direct URL modal routes
  useEffect(() => {
    if (['/profile', '/subscription', '/settings'].includes(currentPath)) {
      setActiveModal(currentPath.substring(1));
    }
  }, [currentPath]);

  // Reload records from Supabase
  const reloadData = useCallback(async () => {
    if (!profile) return;
    const loaded = await customerStorage.getRecordsAsync();
    setRecords(loaded);
  }, [profile]);

  // Real-Time Sync & Subscriptions
  useEffect(() => {
    if (!session || !profile) return;

    reloadData();

    const unsubscribeSupabase = customerStorage.subscribeToRealtime((updatedRecords) => {
      setRecords(updatedRecords);
    });

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
  }, [session, profile, reloadData]);

  // Computedynamic KPI summary metrics
  const stats = customerStorage.getSummaryStats(records);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  // Drawer & Form Handlers
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

  const handleStartEdit = (record) => {
    setEditingRecord(record);
    setIsDrawerOpen(true);
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
    if (records.length === 0) {
      showToast('No records available to export.', 'info');
      return;
    }

    const headers = ['Customer Name', 'Mobile Number', 'Address', 'Service Type', 'Work Description', 'Work Status', 'Total Amount', 'Paid Amount', 'Remaining Balance', 'Created Date'];
    
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
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `seva_kendra_records_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Exported ${records.length} customer records to CSV file.`, 'success');
  };

  // Handle legacy /admin/ URL redirection safely in useEffect
  useEffect(() => {
    if (!session || !profile) return;
    if (currentPath.startsWith('/admin')) {
      if (currentPath.includes('staff')) {
        navigate('/staff');
      } else {
        navigate('/dashboard');
      }
    }
  }, [session, profile, currentPath, navigate]);

  // 1. Initial Auth Loading Screen
  if (isCheckingAuth) {
    return (
      <div className="auth-loading-screen">
        <div className="auth-loading-content">
          <div className="brand-icon-wrapper large-icon">
            <Building2 className="brand-icon" />
          </div>
          <h2 className="login-brand-title">Seva Kendra Management System</h2>
          <div className="loading-status">
            <Loader2 className="icon-md spinner-icon text-primary" />
            <span>Verifying Session & Security Permissions...</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated -> Show Login Page
  if (!session || !profile) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} initialError={loginInitialError} />;
  }

  const userRole = (profile.role || 'staff').toLowerCase();

  // 3. Staff Role Protection: Render Staff Dashboard
  if (userRole === 'staff') {
    return (
      <>
        <StaffDashboard
          profile={profile}
          onLogout={handleLogout}
          activeSubscription={activeSubscription}
          onProfileUpdated={(updated) => {
            setProfile(updated);
            showToast('Profile updated successfully!', 'success');
          }}
          onSubscriptionUpdated={(updated) => {
            setActiveSubscription(updated);
            showToast(`Subscription updated to ${updated.planName}!`, 'success');
          }}
        />
        {isLoggingOut && (
          <div className="logout-loading-overlay animate-fade-in">
            <div className="logout-loading-card animate-scale-up">
              <div className="brand-icon-wrapper large-icon mb-3">
                <Building2 className="brand-icon" />
              </div>
              <h3 className="logout-title">Logging out...</h3>
              <div className="loading-status mt-2">
                <Loader2 className="icon-md spinner-icon text-primary" />
                <span>Closing secure portal session</span>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // 4. Admin Role Access: Render full Admin Dashboard or Staff Management
  const isStaffManagement = adminTab === 'staff' || currentPath === '/staff' || currentPath === '/staff-management';

  const handleCloseActiveModal = () => {
    setActiveModal(null);
    if (['/profile', '/subscription', '/settings'].includes(currentPath)) {
      navigate(adminTab === 'staff' ? '/staff' : '/dashboard');
    }
  };

  return (
    <div className="app-layout">
      {/* Top Navbar Header with Admin Profile Dropdown, Navigation & Logout */}
      <Navbar 
        profile={profile}
        onLogout={handleLogout}
        onExportCSV={handleExportCSV}
        onOpenNewDrawer={handleOpenNewDrawer}
        activeTab={adminTab}
        onTabChange={(tab) => {
          setAdminTab(tab);
          navigate(tab === 'staff' ? '/staff' : '/dashboard');
        }}
        onOpenProfile={() => { setActiveModal('profile'); navigate('/profile'); }}
        onOpenSubscription={() => { setActiveModal('subscription'); navigate('/subscription'); }}
        onOpenSettings={() => { setActiveModal('settings'); navigate('/settings'); }}
        activeSubscription={activeSubscription}
      />

      <main className="main-container">
        {isStaffManagement ? (
          <StaffManagement 
            profile={profile} 
            activeSubscription={activeSubscription}
            onOpenSubscription={() => { setActiveModal('subscription'); navigate('/subscription'); }}
          />
        ) : (
          <>
            {/* Dashboard Summary KPI Cards */}
            <SummaryCards stats={stats} />

            {/* Full-Width Dashboard Table Layout */}
            <div className="dashboard-grid">
              <section className="column-full">
                <CustomerTable
                  records={records}
                  profile={profile}
                  userRole="admin"
                  onEdit={handleStartEdit}
                  onDelete={(record) => setDeletingRecord(record)}
                  onViewDetails={(record) => setViewingRecord(record)}
                  onOpenNewDrawer={handleOpenNewDrawer}
                  onExportCSV={handleExportCSV}
                  onRefresh={reloadData}
                  editingRecordId={editingRecord?.id}
                />
              </section>
            </div>
          </>
        )}
      </main>

      {/* Right-Side Sliding Drawer Form */}
      <CustomerForm
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        editingRecord={editingRecord}
        onSave={handleSaveRecord}
        onCancelEdit={() => { setEditingRecord(null); setIsDrawerOpen(false); }}
        existingRecords={records}
      />

      {/* Detail & Delete Modals & Toast */}
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

      {/* 1. My Profile Modal */}
      <ProfileModal
        isOpen={activeModal === 'profile'}
        profile={profile}
        activeSubscription={activeSubscription}
        onClose={handleCloseActiveModal}
        onProfileUpdated={(updated) => {
          setProfile(updated);
          showToast('Profile updated successfully!', 'success');
        }}
      />

      {/* 2. Subscription Plan Modal */}
      <SubscriptionModal
        isOpen={activeModal === 'subscription'}
        activeSubscription={activeSubscription}
        staffCount={staffCount}
        onClose={handleCloseActiveModal}
        onSubscriptionUpdated={(updated) => {
          setActiveSubscription(updated);
          showToast(`Subscription updated to ${updated.planName}!`, 'success');
        }}
      />

      {/* 3. Account Settings Modal */}
      <AccountSettingsModal
        isOpen={activeModal === 'settings'}
        profile={profile}
        onClose={handleCloseActiveModal}
        onPreferencesUpdated={(updated) => {
          setProfile(updated);
          showToast('Account preferences saved!', 'success');
        }}
        onPasswordUpdated={() => {
          showToast('Password updated successfully!', 'success');
        }}
      />

      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Full-Screen Logout Loading Overlay (Silent Background) */}
      {isLoggingOut && (
        <div className="logout-loading-overlay animate-fade-in">
          <div className="logout-loading-card animate-scale-up">
            <div className="brand-icon-wrapper large-icon mb-3">
              <Building2 className="brand-icon" />
            </div>
            <h3 className="logout-title">Logging out...</h3>
            <div className="loading-status mt-2">
              <Loader2 className="icon-md spinner-icon text-primary" />
              <span>Closing secure portal session</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
