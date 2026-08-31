import { supabase } from '../config/supabaseClient';

const SMS_HISTORY_KEY = 'seva_kendra_sms_history_v1';

/**
 * Formats a 10-digit Indian mobile number to E.164 format (+917698063189)
 */
export const formatIndianE164 = (mobileNumber) => {
  if (!mobileNumber) return '';
  const cleanMobile = String(mobileNumber).replace(/\D/g, '');
  if (cleanMobile.length === 10) {
    return `+91${cleanMobile}`;
  } else if (!cleanMobile.startsWith('+')) {
    return `+${cleanMobile}`;
  }
  return cleanMobile;
};

/**
 * Secure Frontend SMS Service
 * Invokes Supabase Edge Function 'send-sms' ONLY.
 * Zero Twilio API keys or secrets in frontend code!
 */
export const smsService = {
  /**
   * Generates customer service receipt message text
   */
  generateCustomerMessage: (record) => {
    return `Hello ${record.customerName},

Your ${record.serviceType} service request has been registered successfully.

Total: Rs. ${record.totalAmount}
Paid: Rs. ${record.paidAmount}
Balance: Rs. ${record.remainingBalance}

Thank you for visiting our Kendra.`;
  },

  /**
   * Generates a WhatsApp Web link pre-filled with customer receipt message
   */
  getWhatsAppLink: (record) => {
    const e164 = formatIndianE164(record.mobileNumber).replace('+', '');
    const text = encodeURIComponent(smsService.generateCustomerMessage(record));
    return `https://wa.me/${e164}?text=${text}`;
  },

  /**
   * Reads SMS delivery history from storage
   */
  getNotificationHistory: () => {
    try {
      const stored = localStorage.getItem(SMS_HISTORY_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  /**
   * Appends an SMS log entry to history
   */
  logNotification: (record, status, error = null, sid = null) => {
    const newLogEntry = {
      id: `sms_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      customerName: record.customerName,
      mobileNumber: formatIndianE164(record.mobileNumber),
      message: smsService.generateCustomerMessage(record),
      timestamp: new Date().toISOString(),
      status: status,
      sid: sid || null,
      error: error || null
    };

    try {
      const history = smsService.getNotificationHistory();
      const updatedHistory = [newLogEntry, ...history].slice(0, 100); // Keep last 100 entries
      localStorage.setItem(SMS_HISTORY_KEY, JSON.stringify(updatedHistory));
    } catch (err) {
      console.warn('Error saving SMS history log:', err);
    }

    return newLogEntry;
  },

  /**
   * Triggers the secure Supabase Edge Function 'send-sms' ONLY
   */
  sendCustomerSmsNotification: async (record) => {
    const customerMobile = formatIndianE164(record.mobileNumber);
    const messageText = smsService.generateCustomerMessage(record);

    try {
      // 1. Invoke Supabase Edge Function 'send-sms' strictly
      if (supabase && supabase.functions) {
        const { data, error } = await supabase.functions.invoke('send-sms', {
          body: {
            mobile_number: customerMobile,
            customer_name: record.customerName,
            service_type: record.serviceType,
            total_amount: record.totalAmount,
            paid_amount: record.paidAmount,
            remaining_balance: record.remainingBalance,
            message: messageText
          }
        });

        // A. Confirmed Twilio SID Delivery
        if (!error && data && data.success && data.sid) {
          console.log(`✅ SMS Sent Successfully to ${customerMobile}! SID: ${data.sid}`);
          smsService.logNotification(record, 'SMS Sent Successfully', null, data.sid);
          return {
            success: true,
            status: 'SMS Sent Successfully',
            recipient: customerMobile,
            sid: data.sid,
            details: data
          };
        }

        // B. Provider Error / Trial Restriction Response from Edge Function
        if (data && !data.success) {
          const errDetail = data.error || 'SMS delivery failed';
          const statusText = data.status || 'SMS Failed';
          console.warn('Edge Function SMS response:', errDetail);
          smsService.logNotification(record, statusText, errDetail);
          return {
            success: false,
            status: statusText,
            recipient: customerMobile,
            error: errDetail
          };
        }

        // C. Network / Edge Function Invoke Error
        if (error) {
          console.log('ℹ️ Edge Function send-sms notice:', error.message);
          const demoStatus = 'SMS Pending / Demo Mode';
          const demoError = "Edge Function 'send-sms' is not deployed yet or secrets not set.";
          smsService.logNotification(record, demoStatus, demoError);
          return {
            success: false,
            status: demoStatus,
            recipient: customerMobile,
            error: demoError
          };
        }
      }

      // 2. Demo / Fallback Mode when Supabase client is uninitialized
      const fallbackStatus = 'SMS Pending / Demo Mode';
      const fallbackError = 'Supabase client Edge Function is uninitialized.';
      smsService.logNotification(record, fallbackStatus, fallbackError);
      return {
        success: false,
        status: fallbackStatus,
        recipient: customerMobile,
        error: fallbackError,
        whatsAppUrl: smsService.getWhatsAppLink(record)
      };

    } catch (err) {
      console.log('SMS Edge Function dispatch notice:', err.message);
      const errStatus = 'SMS Pending / Demo Mode';
      const errDetail = err.message || 'SMS dispatch failed';
      smsService.logNotification(record, errStatus, errDetail);
      return {
        success: false,
        status: errStatus,
        recipient: customerMobile,
        error: errDetail
      };
    }
  }
};
