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

export const dashboardService = {
  getSummary: async (): Promise<DashboardSummary> => {
    const { data } = await apiClient.get<ApiResponse<DashboardSummary>>('/dashboard/summary')
    return unwrapResponse(data)
  },
}

