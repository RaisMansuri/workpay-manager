import { formatCurrency, formatDateTime } from '../utils/formatters';

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || '';
const WEB3FORMS_KEY = import.meta.env.VITE_WEB3FORMS_KEY || '';

// Validates UUID format for Web3Forms key
const isValidUuid = (key) => {
  return typeof key === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key.trim());
};

/**
 * Service to handle email notifications for new customer entries
 */
export const emailService = {
  /**
   * Fires an email notification when a new customer entry is created
   */
  sendNewEntryNotification: async (record) => {
    if (!isValidUuid(WEB3FORMS_KEY)) {
      console.log('ℹ️ Web3Forms email notifications ready. Add your free Web3Forms UUID access key in .env to send live emails.');
      return { success: false, reason: 'WEB3FORMS_KEY_INVALID' };
    }

    const emailSubject = `🔔 New Customer Entry: ${record.customerName} (${record.serviceType})`;
    
    const emailBody = `
===============================================
SEVA KENDRA MANAGEMENT SYSTEM - NEW ENTRY
===============================================

Customer Name: ${record.customerName}
Mobile Number: ${record.mobileNumber}
Address: ${record.address || 'N/A'}
Service Type: ${record.serviceType}
Work Status: ${record.status}
Work Notes: ${record.workDescription || 'None'}

BILLING DETAILS:
- Total Amount: ${formatCurrency(record.totalAmount)}
- Paid Amount: ${formatCurrency(record.paidAmount)}
- Remaining Balance: ${formatCurrency(record.remainingBalance)} ${record.remainingBalance > 0 ? '(DUE)' : '(PAID)'}

Entry Date & Time: ${formatDateTime(record.createdAt)}
===============================================
`;

    try {
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          access_key: WEB3FORMS_KEY.trim(),
          email: ADMIN_EMAIL,
          subject: emailSubject,
          message: emailBody,
          from_name: 'Seva Kendra Portal',
          to_email: ADMIN_EMAIL
        })
      });

      const result = await response.json();
      if (result.success) {
        console.log(`✉️ Email notification sent successfully for ${record.customerName}!`);
        return { success: true };
      } else {
        console.log('Email API notice:', result.message);
        return { success: false, message: result.message };
      }
    } catch (err) {
      console.warn('Email notification dispatch error:', err.message);
      return { success: false, error: err.message };
    }
  }
};
