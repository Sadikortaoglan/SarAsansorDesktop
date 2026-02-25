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

export const maintenanceCompletionsService = {
  list(page: number, size: number, from?: string, to?: string): Promise<SpringPage<MaintenanceCompletion>> {
    return getPage<MaintenanceCompletion>('/maintenance-completions', { page, size, from, to })
  },
}
