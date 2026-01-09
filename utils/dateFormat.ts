/**
 * Format date to Indonesian format (DD/MM/YYYY)
 * @param date - Date string or Date object
 * @returns Formatted date string in DD/MM/YYYY format
 */
export function formatDateID(date: string | Date): string {
  return new Date(date).toLocaleDateString('id-ID');
}

/**
 * Format date to Indonesian format with month name (DD MMM YYYY)
 * @param date - Date string or Date object
 * @returns Formatted date string with month name
 */
export function formatDateIDWithMonth(date: string | Date): string {
  return new Date(date).toLocaleDateString('id-ID', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}

/**
 * Format month-year for dropdown options (MMM YYYY)
 * @param monthYear - Month-year string in YYYY-MM format
 * @returns Formatted month-year string
 */
export function formatMonthYearID(monthYear: string): string {
  return new Date(`${monthYear}-01`).toLocaleDateString('id-ID', { 
    year: 'numeric', 
    month: 'long' 
  });
}