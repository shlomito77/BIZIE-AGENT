/**
 * Validation utilities for BIZIE application
 * Provides safe input validation and sanitization
 */

/**
 * Validates Israeli phone number format
 * Accepts: 050-1234567, 0501234567, +972501234567
 */
export function validatePhone(phone: string): boolean {
  if (!phone) return false;
  
  // Remove spaces and dashes
  const cleaned = phone.replace(/[\s-]/g, '');
  
  // Israeli phone patterns
  const patterns = [
    /^0\d{9}$/,           // 0501234567
    /^0\d{8}$/,           // 050123456 (old format)
    /^\+972\d{9}$/,       // +972501234567
  ];
  
  return patterns.some(pattern => pattern.test(cleaned));
}

/**
 * Sanitizes phone number to standard format
 */
export function sanitizePhone(phone: string): string {
  return phone.replace(/[\s-]/g, '');
}

/**
 * Validates customer name
 * Must be 2-50 characters, Hebrew or English letters, spaces allowed
 */
export function validateName(name: string): boolean {
  if (!name || name.trim().length < 2 || name.trim().length > 50) {
    return false;
  }
  
  // Allow Hebrew, English, spaces, and common punctuation
  const namePattern = /^[\u0590-\u05FFa-zA-Z\s'-]+$/;
  return namePattern.test(name.trim());
}

/**
 * Sanitizes name - removes dangerous characters
 */
export function sanitizeName(name: string): string {
  return name.trim().replace(/[<>\"']/g, '');
}

/**
 * Validates email format
 */
export function validateEmail(email: string): boolean {
  if (!email) return false;
  
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
}

/**
 * Sanitizes text input - prevents XSS
 */
export function sanitizeText(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validates service ID format
 */
export function validateServiceId(serviceId: string): boolean {
  // Service IDs should be alphanumeric, 1-10 characters
  return /^[a-zA-Z0-9]{1,10}$/.test(serviceId);
}

/**
 * Validates date string (ISO format)
 */
export function validateDateString(dateStr: string): boolean {
  try {
    const date = new Date(dateStr);
    return date instanceof Date && !isNaN(date.getTime());
  } catch {
    return false;
  }
}
