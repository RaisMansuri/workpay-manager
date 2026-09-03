import { supabase } from '../config/supabaseClient';
import { getInitialDemoData } from '../utils/initialDemoData';
import { isToday } from '../utils/formatters';
import { emailService } from './emailService';
import { smsService } from './smsService';

const DB_CHANGE_EVENT = 'seva_kendra_db_change';

const notifyDbChange = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(DB_CHANGE_EVENT));
  }
};

/**
 * Format database snake_case row to frontend camelCase object
 */
const mapRowToRecord = (row) => ({
  id: row.id,
  customerName: row.customer_name,
  mobileNumber: row.mobile_number,
  address: row.address || '',
  serviceType: row.service_type,
  workDescription: row.work_description || '',
  status: row.status,
  totalAmount: Number(row.total_amount) || 0,
  paidAmount: Number(row.paid_amount) || 0,
  remainingBalance: Number(row.remaining_balance) || 0,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  createdBy: row.created_by || null,
  updatedBy: row.updated_by || null
});

/**
 * Format frontend camelCase object to database snake_case row
 */
const mapRecordToRow = (record) => {
  const row = {
    id: record.id,
    customer_name: record.customerName,
    mobile_number: record.mobileNumber,
    address: record.address || '',
    service_type: record.serviceType,
    work_description: record.workDescription || '',
    status: record.status,
    total_amount: Number(record.totalAmount) || 0,
    paid_amount: Number(record.paidAmount) || 0,
    remaining_balance: Number(record.remainingBalance) || 0,
    updated_at: new Date().toISOString()
  };
  if (record.createdBy) row.created_by = record.createdBy;
  if (record.updatedBy) row.updated_by = record.updatedBy;
  return row;
};

/**
 * Service to manage records strictly in PostgreSQL Supabase Cloud Database.
 * No local storage fallbacks.
 */
export const customerStorage = {
  DB_CHANGE_EVENT,

  /**
   * Fetch records directly from Supabase PostgreSQL
   */
  getRecordsAsync: async () => {
    if (!supabase) {
      console.error('Supabase client is not initialized.');
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('customer_records')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === 'PGRST205') {
          console.error('Table customer_records does not exist in Supabase yet. Please run supabase_schema.sql in Supabase SQL Editor.');
        } else {
          console.error('Supabase PostgreSQL fetch error:', error);
        }
        return [];
      }

      if (data && Array.isArray(data)) {
        return data.map(mapRowToRecord);
      }

      return [];
    } catch (err) {
      console.error('Error fetching records from Supabase:', err);
      return [];
    }
  },

  /**
   * Insert / Update record in Supabase PostgreSQL
   */
  saveRecordAsync: async (record) => {
    if (!supabase) {
      return { success: false, error: 'Supabase client is not connected.' };
    }

    const nowISO = new Date().toISOString();
    const total = Number(record.totalAmount) || 0;
    const paid = Number(record.paidAmount) || 0;
    const remainingBalance = Math.max(0, total - paid);

    // Retrieve active logged-in user session UUID
    let currentUserId = null;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      currentUserId = session?.user?.id || null;
    } catch (e) {
      /* ignore auth session lookup error */
    }

    const formattedRecord = {
      ...record,
      totalAmount: total,
      paidAmount: paid,
      remainingBalance,
      updatedAt: nowISO
    };

    try {
      const row = mapRecordToRow(formattedRecord);
      if (!record.createdAt) {
        row.created_at = nowISO;
        if (currentUserId) row.created_by = currentUserId;
      }
      if (currentUserId) {
        row.updated_by = currentUserId;
      }

      const { data, error } = await supabase
        .from('customer_records')
        .upsert(row, { onConflict: 'id' })
        .select('*');

      if (error) {
        console.error('Supabase PostgreSQL save error:', error);
        if (error.code === 'PGRST205' || error.message?.includes('customer_records')) {
          return { 
            success: false, 
            error: "Database table 'customer_records' not created in Supabase yet. Please run supabase_schema.sql in Supabase SQL Editor." 
          };
        }
        throw error;
      }

      notifyDbChange();
      
      // Fire email notification asynchronously (does not block UI)
      emailService.sendNewEntryNotification(formattedRecord).catch(err => {
        console.warn('Email dispatch notice:', err);
      });

      // Fire customer SMS/WhatsApp notification asynchronously
      smsService.sendCustomerSmsNotification(formattedRecord).catch(err => {
        console.warn('SMS dispatch notice:', err);
      });

      const allRecords = await customerStorage.getRecordsAsync();
      return { success: true, records: allRecords, record: data ? mapRowToRecord(data[0]) : formattedRecord };
    } catch (err) {
      console.error('Supabase save error:', err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Delete record from Supabase PostgreSQL
   */
  deleteRecordAsync: async (id) => {
    if (!supabase) {
      return { success: false, error: 'Supabase client is not connected.' };
    }

    try {
      const { error } = await supabase
        .from('customer_records')
        .delete()
        .eq('id', id);

      if (error) throw error;

      notifyDbChange();
      const allRecords = await customerStorage.getRecordsAsync();
      return { success: true, records: allRecords };
    } catch (err) {
      console.error('Supabase delete error:', err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Subscribe to Supabase Realtime changes across all connected clients/tabs
   */
  subscribeToRealtime: (onDataChange) => {
    if (!supabase) return () => {};

    try {
      const channelName = `customer-records-sync-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'customer_records' },
          async () => {
            const updated = await customerStorage.getRecordsAsync();
            onDataChange(updated);
          }
        )
        .subscribe();

      return () => {
        try {
          supabase.removeChannel(channel);
        } catch (e) {
          /* ignore cleanup errors */
        }
      };
    } catch (err) {
      console.warn('Realtime subscription notice:', err);
      return () => {};
    }
  },

  /**
   * Reset PostgreSQL data to Demo Records
   */
  resetToDemoDataAsync: async () => {
    if (!supabase) return [];

    const demoData = getInitialDemoData();

    try {
      await supabase.from('customer_records').delete().neq('id', '0');
      const rows = demoData.map(mapRecordToRow);
      await supabase.from('customer_records').insert(rows);
      notifyDbChange();
      return demoData;
    } catch (err) {
      console.error('Supabase reset error:', err);
      return [];
    }
  },

  getSummaryStats: (records = []) => {
    let todaysEntries = 0;
    let todaysCollection = 0;
    let totalPendingBalance = 0;
    let completedServices = 0;

    const list = Array.isArray(records) ? records : [];

    list.forEach((record) => {
      if (!record) return;
      if (isToday(record.createdAt)) {
        todaysEntries += 1;
        todaysCollection += Number(record.paidAmount) || 0;
      }

      const balance = Number(record.remainingBalance) || 0;
      if (balance > 0) {
        totalPendingBalance += balance;
      }

      if (record.status === 'Completed') {
        completedServices += 1;
      }
    });

    return {
      todaysEntries,
      todaysCollection,
      totalPendingBalance,
      completedServices
    };
  }
};
