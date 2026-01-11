import apiClient from '@/lib/api'
import { unwrapResponse, unwrapArrayResponse, type ApiResponse } from '@/lib/api-response'

// Backend field isimleri: arizaKonu, binaYetkiliMesaji, status: ACIK/TAMAMLANDI
export interface Fault {
  id: number
  elevatorId: number
  elevator?: {
    id: number
    kimlikNo: string
    bina?: string
    binaAdi?: string
    adres: string
  }
  gorusulenKisi: string // Backend'den aynı geliyor
  arizaKonusu: string // Backend'den arizaKonu olarak geliyor
  mesaj: string // Backend'den binaYetkiliMesaji olarak geliyor
  aciklama?: string
  durum: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' // Backend: ACIK/TAMAMLANDI
  olusturmaTarihi: string
  guncellemeTarihi?: string
}

export interface CreateFaultRequest {
  elevatorId: number
  gorusulenKisi: string
  arizaKonusu: string
  mesaj: string
  aciklama?: string
}

export interface UpdateFaultStatusRequest {
  durum: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED'
}

// Backend durum formatını frontend formatına çevir
function mapFaultStatusFromBackend(backendStatus: string): 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' {
  if (backendStatus === 'TAMAMLANDI') return 'COMPLETED'
  if (backendStatus === 'ACIK') return 'OPEN'
  return 'OPEN' // Default
}

// Frontend durum formatını backend formatına çevir
function mapFaultStatusToBackend(status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED'): string {
  if (status === 'COMPLETED') return 'TAMAMLANDI'
  if (status === 'OPEN' || status === 'IN_PROGRESS') return 'ACIK'
  return 'ACIK'
}

// Backend'den gelen formatı frontend formatına çevir
// YENİ BACKEND FIELD İSİMLERİ (eski field'lar KULLANILMIYOR):
// faultSubject, contactPerson, buildingAuthorizedMessage, description
function mapFaultFromBackend(backend: any): Fault {
  return {
    id: backend.id,
    elevatorId: backend.elevatorId || backend.elevator?.id,
    elevator: backend.elevator ? {
      id: backend.elevator.id,
      kimlikNo: backend.elevator.identityNumber || '',
      bina: backend.elevator.buildingName || '',
      binaAdi: backend.elevator.buildingName,
      adres: backend.elevator.address || '',
    } : undefined,
    gorusulenKisi: backend.contactPerson || '',
    arizaKonusu: backend.faultSubject || '',
    mesaj: backend.buildingAuthorizedMessage || '',
    aciklama: backend.description,
    durum: mapFaultStatusFromBackend(backend.status || 'ACIK'),
    olusturmaTarihi: backend.createdAt || backend.olusturmaTarihi || '',
    guncellemeTarihi: backend.updatedAt || backend.guncellemeTarihi,
  }
}

// Frontend formatını backend formatına çevir
function mapFaultToBackend(fault: CreateFaultRequest): any {
  return {
    elevatorId: fault.elevatorId,
    faultSubject: fault.arizaKonusu,
    contactPerson: fault.gorusulenKisi,
    buildingAuthorizedMessage: fault.mesaj,
    description: fault.aciklama,
  }
}

export const faultService = {
  getAll: async (): Promise<Fault[]> => {
    const { data } = await apiClient.get<ApiResponse<any[]>>('/faults')
    const unwrapped = unwrapArrayResponse(data)
    return unwrapped.map(mapFaultFromBackend)
  },

  getOpen: async (): Promise<Fault[]> => {
    // Backend: status=ACIK veya boş (tüm açık olanlar)
    const { data } = await apiClient.get<ApiResponse<any[]>>('/faults', {
      params: { status: 'ACIK' }
    })
    const unwrapped = unwrapArrayResponse(data)
    return unwrapped.map(mapFaultFromBackend).filter(f => f.durum === 'OPEN' || f.durum === 'IN_PROGRESS')
  },

  getCompleted: async (): Promise<Fault[]> => {
    // Backend: status=TAMAMLANDI
    const { data } = await apiClient.get<ApiResponse<any[]>>('/faults', {
      params: { status: 'TAMAMLANDI' }
    })
    const unwrapped = unwrapArrayResponse(data)
    return unwrapped.map(mapFaultFromBackend).filter(f => f.durum === 'COMPLETED')
  },

  getById: async (id: number): Promise<Fault> => {
    const { data } = await apiClient.get<ApiResponse<any>>(`/faults/${id}`)
    const unwrapped = unwrapResponse(data)
    return mapFaultFromBackend(unwrapped)
  },

  create: async (fault: CreateFaultRequest): Promise<Fault> => {
    const backendRequest = mapFaultToBackend(fault)
    const { data } = await apiClient.post<ApiResponse<any>>('/faults', backendRequest)
    const unwrapped = unwrapResponse(data)
    return mapFaultFromBackend(unwrapped)
  },

  updateStatus: async (id: number, status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED'): Promise<Fault> => {
    // Backend: Query parameter ?status=TAMAMLANDI veya ?status=ACIK
    // IN_PROGRESS durumu backend'de yok, OPEN olarak gönderilecek
    const backendStatus = mapFaultStatusToBackend(status === 'IN_PROGRESS' ? 'OPEN' : status)
    const { data } = await apiClient.put<ApiResponse<any>>(`/faults/${id}/status?status=${backendStatus}`)
    const unwrapped = unwrapResponse(data)
    return mapFaultFromBackend(unwrapped)
  },
}

