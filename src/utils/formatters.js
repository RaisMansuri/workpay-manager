/**
 * Formats a numeric value into Indian Rupee currency format (e.g. ₹1,500)
 */
export const formatCurrency = (amount) => {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(num);
};

/**
 * Formats an ISO string or Date into a human-readable date & time string
 * e.g. "30 Aug 2026, 02:45 PM"
 */
export const formatDateTime = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

/**
 * Formats date for HTML date input YYYY-MM-DD
 */
export const formatDateOnly = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
};

/**
 * Checks if an ISO date string corresponds to Today
 */
export const isToday = (dateString) => {
  if (!dateString) return false;
  const date = new Date(dateString);
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

/**
 * Generates next Customer ID based on existing records count
 */
export const generateNextCustomerId = (existingRecords = []) => {
  const currentYear = new Date().getFullYear();
  let maxSeq = 0;

  existingRecords.forEach((record) => {
    if (record.id && typeof record.id === 'string') {
      const parts = record.id.split('-');
      if (parts.length === 3 && !isNaN(parseInt(parts[2], 10))) {
        const seq = parseInt(parts[2], 10);
        if (seq > maxSeq) maxSeq = seq;
      }
    }
  });

  const nextSeq = String(maxSeq + 1).padStart(3, '0');
  return `SK-${currentYear}-${nextSeq}`;
};
