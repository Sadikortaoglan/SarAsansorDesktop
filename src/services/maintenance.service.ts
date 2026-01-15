import apiClient from '@/lib/api'
import { unwrapResponse, unwrapArrayResponse, type ApiResponse } from '@/lib/api-response'

export interface Maintenance {
  id: number
  elevatorId: number
  elevator?: {
    id: number
    kimlikNo: string
    bina?: string
    binaAdi?: string
    adres: string
  }
  tarih: string
  aciklama: string
  ucret: number
  odendi: boolean
  odemeTarihi?: string
}

// Backend field isimleri: teknisyenUserId (opsiyonel)
export interface CreateMaintenanceRequest {
  elevatorId: number
  tarih: string
  aciklama: string
  ucret: number
  teknisyenUserId?: number // Backend'de var ama opsiyonel
}

export interface UpdateMaintenanceRequest extends Partial<CreateMaintenanceRequest> {}

// Backend'den gelen formatı frontend formatına çevir
// YENİ BACKEND FIELD İSİMLERİ (eski field'lar KULLANILMIYOR):
// date, description, technicianUserId, amount, isPaid, paymentDate
function mapMaintenanceFromBackend(backend: any): Maintenance {
  return {
    id: backend.id,
    elevatorId: backend.elevatorId || backend.elevator?.id || 0,
    elevator: backend.elevator ? {
      id: backend.elevator.id,
      kimlikNo: backend.elevator.identityNumber || '',
      bina: backend.elevator.buildingName || '',
      binaAdi: backend.elevator.buildingName,
      adres: backend.elevator.address || '',
    } : undefined,
    tarih: backend.date || '',
    aciklama: backend.description || '',
    ucret: backend.amount || 0,
    odendi: backend.isPaid !== undefined ? backend.isPaid : false,
    odemeTarihi: backend.paymentDate,
  }
}

export interface MaintenanceSummary {
  total: number
  paid: number
  unpaid: number
  totalAmount: number
  paidAmount: number
  unpaidAmount: number
  monthlyData: {
    month: string
    total: number
    paid: number
    unpaid: number
    amount: number
  }[]
}

export const maintenanceService = {
  getAll: async (params?: { paid?: boolean; dateFrom?: string; dateTo?: string }): Promise<Maintenance[]> => {
    const { data } = await apiClient.get<ApiResponse<any[]>>('/maintenances', { params })
    const unwrapped = unwrapArrayResponse(data)
    return unwrapped.map(mapMaintenanceFromBackend)
  },

  getSummary: async (month?: string): Promise<MaintenanceSummary | null> => {
    // Backend: Query parameter ?month=YYYY-MM (örn: 2026-01). Boş bırakılırsa bu ay
    try {
      const params = month ? { month } : undefined
      const { data } = await apiClient.get<ApiResponse<MaintenanceSummary>>('/maintenances/summary', { params })
      return unwrapResponse(data, true)
    } catch (error: any) {
      if (error.response?.status === 404 || error.response?.data?.success === false) {
        return null
      }
      throw error
    }
  },

  getByElevatorId: async (elevatorId: number): Promise<Maintenance[]> => {
    const { data } = await apiClient.get<ApiResponse<any[]>>(
      `/maintenances/elevator/${elevatorId}`
    )
    const unwrapped = unwrapArrayResponse(data)
    return unwrapped.map(mapMaintenanceFromBackend)
  },

  getById: async (id: number): Promise<Maintenance> => {
    const { data } = await apiClient.get<ApiResponse<any>>(`/maintenances/${id}`)
    const unwrapped = unwrapResponse(data)
    return mapMaintenanceFromBackend(unwrapped)
  },

  create: async (maintenance: CreateMaintenanceRequest): Promise<Maintenance> => {
    // Yeni backend field isimleri: date, description, technicianUserId, amount
    const backendRequest: any = {
      elevatorId: maintenance.elevatorId,
      date: maintenance.tarih,
      description: maintenance.aciklama,
      amount: maintenance.ucret,
    }
    // Opsiyonel field'lar
    if (maintenance.teknisyenUserId) {
      backendRequest.technicianUserId = maintenance.teknisyenUserId
    }
    
    const { data } = await apiClient.post<ApiResponse<any>>('/maintenances', backendRequest)
    const unwrapped = unwrapResponse(data)
    return mapMaintenanceFromBackend(unwrapped)
  },

  update: async (id: number, maintenance: UpdateMaintenanceRequest): Promise<Maintenance> => {
    // Yeni backend field isimleri: date, description, technicianUserId, amount
    const backendRequest: any = {}
    if (maintenance.elevatorId) backendRequest.elevatorId = maintenance.elevatorId
    if (maintenance.tarih) backendRequest.date = maintenance.tarih
    if (maintenance.aciklama) backendRequest.description = maintenance.aciklama
    if (maintenance.ucret !== undefined) backendRequest.amount = maintenance.ucret
    if (maintenance.teknisyenUserId) backendRequest.technicianUserId = maintenance.teknisyenUserId
    
    const { data } = await apiClient.put<ApiResponse<any>>(`/maintenances/${id}`, backendRequest)
    const unwrapped = unwrapResponse(data)
    return mapMaintenanceFromBackend(unwrapped)
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/maintenances/${id}`)
  },

  markPaid: async (id: number, paid: boolean = true): Promise<Maintenance> => {
    // Backend: Query parameter ?paid=true
    const { data } = await apiClient.post<ApiResponse<any>>(`/maintenances/${id}/mark-paid?paid=${paid}`)
    const unwrapped = unwrapResponse(data)
    return mapMaintenanceFromBackend(unwrapped)
  },
}

