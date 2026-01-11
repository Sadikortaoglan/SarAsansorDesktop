import apiClient from '@/lib/api'
import { unwrapArrayResponse, type ApiResponse } from '@/lib/api-response'

export interface Warning {
  id: number
  elevatorId: number
  elevator?: {
    id: number
    kimlikNo?: string
    bina?: string
    binaAdi?: string
    adres?: string
    bitisTarihi?: string
  }
  type: 'EXPIRED' | 'WARNING'
  message: string
}

// Backend'den gelen formatı frontend formatına çevir
// YENİ BACKEND FIELD İSİMLERİ (eski field'lar KULLANILMIYOR):
// Elevator için: identityNumber, buildingName, address
function mapWarningFromBackend(backend: any): Warning {
  return {
    id: backend.id,
    elevatorId: backend.elevatorId || backend.elevator?.id || 0,
    elevator: backend.elevator ? {
      id: backend.elevator.id,
      kimlikNo: backend.elevator.identityNumber || '',
      bina: backend.elevator.buildingName || '',
      binaAdi: backend.elevator.buildingName,
      adres: backend.elevator.address || '',
      bitisTarihi: backend.elevator.bitisTarihi,
    } : undefined,
    type: backend.type || 'WARNING',
    message: backend.message || '',
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
}

