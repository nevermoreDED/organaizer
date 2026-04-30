/**
 * Ф_format Date Utility
 * Formats dates as DD.MM.YYYY
 */

export const formatDate = (date) => {
  if (!date) return '';
  
  // If it's a Date object
  if (date instanceof Date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  }
  
  // If it's an ISO string (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)
  if (typeof date === 'string') {
    // Extract just the date part
    const datePart = date.split('T')[0];
    const [year, month, day] = datePart.split('-');
    if (year && month && day) {
      return `${day}.${month}.${year}`;
    }
  }
  
  // Fallback: try to convert to Date
  const d = new Date(date);
  if (!isNaN(d.getTime())) {
    return formatDate(d);
  }
  
  return String(date);
};

export const formatDateTime = (date) => {
  if (!date) return '';
  
  if (date instanceof Date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  }
  
  if (typeof date === 'string') {
    const datePart = date.split('T')[0];
    const [year, month, day] = datePart.split('-');
    const timePart = date.includes('T') ? date.split('T')[1] : '';
    const [rawHours = '', rawMinutes = ''] = timePart.split(':');
    const hours = rawHours.padStart(2, '0');
    const minutes = rawMinutes.padStart(2, '0');
    if (year && month && day) {
      return `${day}.${month}.${year}${rawHours ? ` ${hours}:${minutes}` : ''}`;
    }
  }
  
  const d = new Date(date);
  if (!isNaN(d.getTime())) {
    return formatDateTime(d);
  }
  
  return String(date);
};
