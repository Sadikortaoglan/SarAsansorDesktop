import apiClient from '@/lib/api'
import { unwrapResponse, type ApiResponse } from '@/lib/api-response'

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
    const { data } = await apiClient.get<ApiResponse<DashboardSummary>>('/dashboard/summary')
    return unwrapResponse(data)
  },

  getCounts: async (): Promise<DashboardCounts> => {
    const { data } = await apiClient.get<ApiResponse<DashboardCounts>>('/dashboard/counts')
    return unwrapResponse(data)
  },
}

