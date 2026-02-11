import apiClient from '@/lib/api'
import { unwrapResponse, type ApiResponse } from '@/lib/api-response'
import { API_ENDPOINTS, validateEndpoint } from '@/lib/api-endpoints'

export interface DashboardSummary {
  totalElevators: number
  totalMaintenances: number
  totalIncome: number
  totalDebt: number
  expiredCount: number
  warningCount: number
}

export interface DashboardCounts {
  elevators: number
  maintenances: number
  inspections: number
  faults: number
  parts: number
  warnings: number
  maintenanceTemplates: number
  maintenancePlansUpcoming: number
  maintenanceSessionsCompleted: number
}

export const dashboardService = {
  getSummary: async (): Promise<DashboardSummary> => {
    const endpoint = API_ENDPOINTS.DASHBOARD.SUMMARY
    const { data } = await apiClient.get<ApiResponse<DashboardSummary>>(endpoint)
    return unwrapResponse(data)
  },

  getCounts: async (): Promise<DashboardCounts> => {
    const endpoint = API_ENDPOINTS.DASHBOARD.COUNTS
    validateEndpoint(endpoint)
    
    try {
      const { data } = await apiClient.get<ApiResponse<DashboardCounts>>(endpoint)
      return unwrapResponse(data)
    } catch (error: any) {
      // If endpoint doesn't exist, return empty counts
      if (error.response?.status === 404) {
        console.warn(`Endpoint ${endpoint} not found. Returning empty counts.`)
        return {
          elevators: 0,
          maintenances: 0,
          inspections: 0,
          faults: 0,
          parts: 0,
          warnings: 0,
          maintenanceTemplates: 0,
          maintenancePlansUpcoming: 0,
          maintenanceSessionsCompleted: 0,
        }
      }
      throw error
    }
  },
}

