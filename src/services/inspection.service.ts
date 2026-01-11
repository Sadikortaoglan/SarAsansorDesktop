import apiClient from '@/lib/api'
import { unwrapResponse, unwrapArrayResponse, type ApiResponse } from '@/lib/api-response'

// Backend field isimleri: tarih (denetimTarihi), sonuc: BAŞARILI/BAŞARISIZ/BEKLENİYOR
export interface Inspection {
  id: number
  elevatorId: number
  elevator?: {
    id: number
    kimlikNo: string
    bina?: string
    binaAdi?: string
    adres: string
  }
  denetimTarihi: string // Backend'den tarih olarak geliyor
  denetimYapan?: string // Backend'de yok gibi görünüyor
  sonuc: 'PASS' | 'FAIL' | 'PENDING' // Backend: BAŞARILI/BAŞARISIZ/BEKLENİYOR
  aciklama?: string
  raporNo?: string
  olusturmaTarihi: string
}

export interface CreateInspectionRequest {
  elevatorId: number
  denetimTarihi: string // Backend'e tarih olarak gönderilecek
  denetimYapan?: string
  sonuc: 'PASS' | 'FAIL' | 'PENDING' // Backend'e BAŞARILI/BAŞARISIZ/BEKLENİYOR olarak gönderilecek
  aciklama?: string
  raporNo?: string
}

// Backend sonuc formatını frontend formatına çevir
function mapInspectionResultFromBackend(backendResult: string): 'PASS' | 'FAIL' | 'PENDING' {
  if (backendResult === 'BAŞARILI') return 'PASS'
  if (backendResult === 'BAŞARISIZ') return 'FAIL'
  if (backendResult === 'BEKLENİYOR') return 'PENDING'
  return 'PENDING' // Default
}

// Frontend sonuc formatını backend formatına çevir
function mapInspectionResultToBackend(result: 'PASS' | 'FAIL' | 'PENDING'): string {
  if (result === 'PASS') return 'BAŞARILI'
  if (result === 'FAIL') return 'BAŞARISIZ'
  if (result === 'PENDING') return 'BEKLENİYOR'
  return 'BEKLENİYOR'
}

// Backend'den gelen formatı frontend formatına çevir
// YENİ BACKEND FIELD İSİMLERİ (eski field'lar KULLANILMIYOR):
// date, result, description
function mapInspectionFromBackend(backend: any): Inspection {
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
    denetimTarihi: backend.date || '',
    denetimYapan: backend.denetimYapan,
    sonuc: mapInspectionResultFromBackend(backend.result || 'BEKLENİYOR'),
    aciklama: backend.description,
    raporNo: backend.raporNo,
    olusturmaTarihi: backend.createdAt || backend.olusturmaTarihi || '',
  }
}

// Frontend formatını backend formatına çevir
function mapInspectionToBackend(inspection: CreateInspectionRequest): any {
  // Yeni backend field isimleri: date, result, description
  return {
    elevatorId: inspection.elevatorId,
    date: inspection.denetimTarihi,
    result: mapInspectionResultToBackend(inspection.sonuc),
    description: inspection.aciklama || undefined,
  }
}

export interface UpdateInspectionRequest extends Partial<CreateInspectionRequest> {}

export const inspectionService = {
  getAll: async (): Promise<Inspection[]> => {
    const { data } = await apiClient.get<ApiResponse<any[]>>('/inspections')
    const unwrapped = unwrapArrayResponse(data)
    return unwrapped.map(mapInspectionFromBackend)
  },

  getById: async (id: number): Promise<Inspection> => {
    const { data } = await apiClient.get<ApiResponse<any>>(`/inspections/${id}`)
    const unwrapped = unwrapResponse(data)
    return mapInspectionFromBackend(unwrapped)
  },

  getByElevatorId: async (elevatorId: number): Promise<Inspection[]> => {
    const { data } = await apiClient.get<ApiResponse<any[]>>(`/inspections/elevator/${elevatorId}`)
    const unwrapped = unwrapArrayResponse(data)
    return unwrapped.map(mapInspectionFromBackend)
  },

  create: async (inspection: CreateInspectionRequest): Promise<Inspection> => {
    const backendRequest = mapInspectionToBackend(inspection)
    const { data } = await apiClient.post<ApiResponse<any>>('/inspections', backendRequest)
    const unwrapped = unwrapResponse(data)
    return mapInspectionFromBackend(unwrapped)
  },

  // Not: Postman collection'da update ve delete endpoint'leri yok
  // Sadece GET ve POST işlemleri var
}

