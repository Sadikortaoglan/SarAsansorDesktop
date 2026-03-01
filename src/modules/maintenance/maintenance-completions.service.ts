import { getPage } from '@/modules/shared/api'
import type { SpringPage } from '@/modules/shared/types'

export interface MaintenanceCompletion {
  id: number
  elevatorId: number
  elevatorCode: string
  elevatorBuildingName: string
  elevatorAddress: string
  templateId?: number
  templateName?: string
  plannedDate: string
  assignedTechnicianId?: number
  assignedTechnicianName?: string
  status: string
  completedDate?: string
  note?: string
}

function isMissingEndpointError(error: any): boolean {
  const status = error?.response?.status
  const message = error?.response?.data?.message
  return status === 404 && typeof message === 'string' && message.includes('No static resource')
}

function emptyPage<T>(page: number, size: number): SpringPage<T> {
  return {
    content: [],
    totalPages: 0,
    totalElements: 0,
    size,
    number: page,
    first: true,
    last: true,
    numberOfElements: 0,
    empty: true,
  }
}

export const maintenanceCompletionsService = {
  async list(page: number, size: number, from?: string, to?: string): Promise<SpringPage<MaintenanceCompletion>> {
    try {
      return await getPage<MaintenanceCompletion>('/maintenance-completions', { page, size, from, to })
    } catch (error: any) {
      if (isMissingEndpointError(error)) return emptyPage<MaintenanceCompletion>(page, size)
      throw error
    }
  },
}
