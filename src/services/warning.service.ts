import apiClient from '@/lib/api'
import { unwrapArrayResponse, type ApiResponse } from '@/lib/api-response'

export interface Warning {
  id: number
  elevatorId?: number
  identityNo: string
  buildingName: string
  address: string
  maintenanceEndDate: string
  status: 'EXPIRED' | 'WARNING'
  elevator?: {
    id: number
    kimlikNo?: string
    bina?: string
    binaAdi?: string
    adres?: string
    bitisTarihi?: string
  }
  type?: 'EXPIRED' | 'WARNING'
  message?: string
}

function mapWarningFromBackend(backend: any): Warning {
  const identityNo = backend.identityNo || backend.elevator?.identityNumber || backend.elevator?.kimlikNo || ''
  const buildingName = backend.buildingName || backend.elevator?.buildingName || backend.elevator?.bina || backend.elevator?.binaAdi || ''
  const address = backend.address || backend.elevator?.address || backend.elevator?.adres || ''
  const maintenanceEndDate = backend.maintenanceEndDate || backend.elevator?.bitisTarihi || ''
  
  let status: 'EXPIRED' | 'WARNING' = 'WARNING'
  if (backend.status === 'EXPIRED' || backend.type === 'EXPIRED') {
    status = 'EXPIRED'
  } else if (backend.status === 'WARNING' || backend.type === 'WARNING') {
    status = 'WARNING'
  }

  return {
    id: backend.id,
    elevatorId: backend.elevatorId || backend.elevator?.id,
    identityNo,
    buildingName,
    address,
    maintenanceEndDate,
    status,
    elevator: backend.elevator ? {
      id: backend.elevator.id,
      kimlikNo: backend.elevator.identityNumber || backend.elevator.identityNo || identityNo,
      bina: backend.elevator.buildingName || buildingName,
      binaAdi: backend.elevator.buildingName || buildingName,
      adres: backend.elevator.address || address,
      bitisTarihi: backend.elevator.bitisTarihi || maintenanceEndDate,
    } : undefined,
    type: status,
    message: backend.message || '',
  }
}

export interface GroupedWarningElevator {
  identityNo: string
  maintenanceEndDate: string
  status: 'EXPIRED' | 'WARNING'
}

export interface GroupedWarning {
  buildingName: string
  address: string
  status: 'EXPIRED' | 'WARNING'
  elevators: GroupedWarningElevator[]
}

function mapGroupedWarningFromBackend(backend: any): GroupedWarning {
  return {
    buildingName: backend.buildingName || '',
    address: backend.address || '',
    status: backend.status === 'EXPIRED' ? 'EXPIRED' : 'WARNING',
    elevators: (backend.elevators || []).map((elevator: any) => ({
      identityNo: elevator.identityNo || '',
      maintenanceEndDate: elevator.maintenanceEndDate || '',
      status: elevator.status === 'EXPIRED' ? 'EXPIRED' : 'WARNING',
    })),
  }
}

export const warningService = {
  getExpired: async (): Promise<Warning[]> => {
    const { data } = await apiClient.get<ApiResponse<Warning[]>>('/warnings?type=EXPIRED')
    const unwrapped = unwrapArrayResponse(data)
    return Array.isArray(unwrapped) ? unwrapped.map(mapWarningFromBackend) : []
  },

  getWarnings: async (): Promise<Warning[]> => {
    const { data } = await apiClient.get<ApiResponse<Warning[]>>('/warnings?type=WARNING')
    const unwrapped = unwrapArrayResponse(data)
    return Array.isArray(unwrapped) ? unwrapped.map(mapWarningFromBackend) : []
  },

  getGrouped: async (): Promise<GroupedWarning[]> => {
    const { data } = await apiClient.get<ApiResponse<GroupedWarning[]>>('/warnings/grouped')
    const unwrapped = unwrapArrayResponse(data)
    return Array.isArray(unwrapped) ? unwrapped.map(mapGroupedWarningFromBackend) : []
  },
}

