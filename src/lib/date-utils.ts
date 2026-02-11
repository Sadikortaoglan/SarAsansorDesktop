/**
 * Date formatting utilities for API communication
 * Backend expects LocalDate (YYYY-MM-DD) format, not datetime
 */

/**
 * Converts a Date object or date string to YYYY-MM-DD format (LocalDate)
 * Removes time component if present
 * @param date - Date object, ISO string, or date string
 * @returns YYYY-MM-DD formatted string
 */
export function formatDateForAPI(date: Date | string | undefined | null): string {
  if (!date) {
    throw new Error('Date is required')
  }

  let dateObj: Date
  if (typeof date === 'string') {
    // If already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date
    }
    // If datetime format (YYYY-MM-DDTHH:mm:ss or YYYY-MM-DDTHH:mm), extract date part
    if (date.includes('T')) {
      return date.split('T')[0]
    }
    dateObj = new Date(date)
  } else {
    dateObj = date
  }

  if (isNaN(dateObj.getTime())) {
    throw new Error(`Invalid date: ${date}`)
  }

  const year = dateObj.getFullYear()
  const month = String(dateObj.getMonth() + 1).padStart(2, '0')
  const day = String(dateObj.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

/**
 * Converts a datetime string to LocalDate format
 * Handles formats like: "2026-01-01T00:00:00", "2026-01-01T00:00", "2026-01-01"
 * @param datetime - Datetime string
 * @returns YYYY-MM-DD formatted string
 */
export function convertDateTimeToLocalDate(datetime: string): string {
  if (!datetime) {
    throw new Error('Datetime string is required')
  }

  // If already in YYYY-MM-DD format, return as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(datetime)) {
    return datetime
  }

  // Extract date part from datetime string
  if (datetime.includes('T')) {
    return datetime.split('T')[0]
  }

  // Try parsing as date
  const date = new Date(datetime)
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid datetime format: ${datetime}`)
  }

  return formatDateForAPI(date)
}

/**
 * Validates if a string is in YYYY-MM-DD format
 */
export function isValidLocalDate(dateString: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateString)
}

/**
 * Formats a date for display (Turkish locale)
 */
export function formatDateForDisplay(date: Date | string | undefined | null): string {
  if (!date) return '-'

  const dateObj = typeof date === 'string' ? new Date(date) : date
  if (isNaN(dateObj.getTime())) return '-'

  return dateObj.toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
