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
 * Formats an ISO string or Date into dd/mm/yyyy, hh:mm AM/PM string
 * e.g. "31/08/2026, 02:45 PM"
 */
export const formatDateTime = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const strHours = String(hours).padStart(2, '0');

  return `${day}/${month}/${year}, ${strHours}:${minutes} ${ampm}`;
};

/**
 * Formats date as dd/mm/yyyy string
 * e.g. "31/08/2026"
 */
export const formatDateOnly = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
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
