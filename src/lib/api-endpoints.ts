/**
 * Centralized API endpoint definitions
 * All endpoints should be defined here to ensure consistency
 */

export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/auth/login',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout',
  },

  // Dashboard
  DASHBOARD: {
    SUMMARY: '/dashboard/summary',
    COUNTS: '/dashboard/counts', // Verify this exists in backend
  },

  // Elevators
  ELEVATORS: {
    BASE: '/elevators',
    BY_ID: (id: number) => `/elevators/${id}`,
  },

  // Maintenances
  MAINTENANCES: {
    BASE: '/maintenances',
    BY_ID: (id: number) => `/maintenances/${id}`,
    BY_ELEVATOR: (elevatorId: number) => `/maintenances/elevator/${elevatorId}`,
    SUMMARY: '/maintenances/summary',
    MARK_PAID: (id: number) => `/maintenances/${id}/mark-paid`,
  },

  // Maintenance Plans
  MAINTENANCE_PLANS: {
    BASE: '/maintenance-plans',
    BY_ID: (id: number) => `/maintenance-plans/${id}`,
    COMPLETE: (id: number) => `/maintenance-plans/${id}/complete`,
    RESCHEDULE: (id: number) => `/maintenance-plans/${id}/reschedule`,
  },

  // Inspections
  INSPECTIONS: {
    BASE: '/inspections',
    BY_ID: (id: number) => `/inspections/${id}`,
    BY_ELEVATOR: (elevatorId: number) => `/inspections/elevator/${elevatorId}`,
  },

  // Faults
  FAULTS: {
    BASE: '/faults',
    BY_ID: (id: number) => `/faults/${id}`,
    UPDATE_STATUS: (id: number) => `/faults/${id}/status`,
  },

  // Parts
  PARTS: {
    BASE: '/parts',
    BY_ID: (id: number) => `/parts/${id}`,
  },

  // Payments
  PAYMENTS: {
    BASE: '/payments',
    BY_ID: (id: number) => `/payments/${id}`,
  },

  // Users
  USERS: {
    BASE: '/users',
    BY_ID: (id: number) => `/users/${id}`,
  },

  // Warnings
  WARNINGS: {
    BASE: '/warnings',
    GROUPED: '/warnings/grouped',
  },

  // Offers
  OFFERS: {
    BASE: '/offers',
    BY_ID: (id: number) => `/offers/${id}`,
    BY_ELEVATOR: (elevatorId: number) => `/offers/elevator/${elevatorId}`,
    EXPORT_PDF: (id: number) => `/offers/${id}/export/pdf`,
  },
} as const

/**
 * Check if an endpoint exists (for development/debugging)
 */
export function validateEndpoint(endpoint: string): boolean {
  // In production, this could check against a backend API schema
  // For now, we'll just log a warning if using potentially non-existent endpoints
  const potentiallyMissing = ['/dashboard/counts']
  
  if (potentiallyMissing.includes(endpoint)) {
    console.warn(`⚠️ Endpoint may not exist: ${endpoint}. Verify backend implementation.`)
  }
  
  return true
}
