import apiClient from '@/lib/api'
import { unwrapResponse, unwrapArrayResponse, type ApiResponse } from '@/lib/api-response'
import { formatDateForAPI } from '@/lib/date-utils'
import { API_ENDPOINTS } from '@/lib/api-endpoints'

// Backend field isimleri: elevatorIdentityNumber, elevatorBuildingName, date, result, description
export interface Inspection {
  id: number
  elevatorId: number
  elevatorIdentityNumber: string
  elevatorBuildingName: string
  elevator?: {
    id: number
    kimlikNo: string
    bina?: string
    binaAdi?: string
    adres: string
  }
  denetimTarihi: string // Backend'den date olarak geliyor
  denetimYapan?: string // Backend'de yok gibi görünüyor
  sonuc: 'PASS' | 'FAIL' | 'PENDING' // Backend: BAŞARILI/BAŞARISIZ/BEKLENİYOR
  aciklama?: string
  raporNo?: string
  olusturmaTarihi: string
  inspectionColor?: 'GREEN' | 'YELLOW' | 'RED' | 'ORANGE' // Asansör rengi
  contactedPersonName?: string // Görüşülen kişi
}

export interface CreateInspectionRequest {
  elevatorId: number
  denetimTarihi: string // Backend'e tarih olarak gönderilecek
  denetimYapan?: string
  sonuc: 'PASS' | 'FAIL' | 'PENDING' // Backend'e BAŞARILI/BAŞARISIZ/BEKLENİYOR olarak gönderilecek
  aciklama?: string
  raporNo?: string
  inspectionColor: 'GREEN' | 'YELLOW' | 'RED' | 'ORANGE' // Asansör rengi (zorunlu)
  contactedPersonName?: string // Görüşülen kişi (opsiyonel)
}

// Backend sonuc formatını frontend formatına çevir
// API dokümantasyonuna göre: PASSED, FAILED, PENDING
// Backend'den PASSED/FAILED/PENDING gelebilir veya Türkçe gelebilir (backend enum mapping var)
function mapInspectionResultFromBackend(backendResult: string): 'PASS' | 'FAIL' | 'PENDING' {
  if (backendResult === 'PASSED' || backendResult === 'BAŞARILI') return 'PASS'
  if (backendResult === 'FAILED' || backendResult === 'BAŞARISIZ') return 'FAIL'
  if (backendResult === 'PENDING' || backendResult === 'BEKLENİYOR') return 'PENDING'
  return 'PENDING' // Default
}

// Frontend sonuc formatını backend formatına çevir
// API dokümantasyonuna göre: PASSED, FAILED, PENDING gönderilmeli (backend enum mapping var ama direkt İngilizce gönder)
function mapInspectionResultToBackend(result: 'PASS' | 'FAIL' | 'PENDING'): string {
  // API dokümantasyonuna göre direkt İngilizce gönder
  if (result === 'PASS') return 'PASSED'
  if (result === 'FAIL') return 'FAILED'
  if (result === 'PENDING') return 'PENDING'
  return 'PENDING'
}

// Backend'den gelen formatı frontend formatına çevir
// YENİ BACKEND FIELD İSİMLERİ (eski field'lar KULLANILMIYOR):
// elevatorIdentityNumber, elevatorBuildingName, date, result, description, inspectionColor, contactedPersonName
function mapInspectionFromBackend(backend: any): Inspection {
  // Inspection color mapping - Backend'den direkt inspectionColor geliyor
  const inspectionColor = backend.inspectionColor || backend.inspection_color
    ? (backend.inspectionColor || backend.inspection_color).toUpperCase().trim() as 'GREEN' | 'YELLOW' | 'RED' | 'ORANGE'
    : undefined

  // Contacted person name mapping
  const contactedPersonName = backend.contactedPersonName || backend.contacted_person_name || undefined

  // Debug: Log backend data
  console.log('Mapping inspection from backend:', {
    id: backend.id,
    inspectionColor: backend.inspectionColor,
    contactedPersonName: backend.contactedPersonName,
    result: backend.result,
  })

  return {
    id: backend.id,
    elevatorId: backend.elevatorId || backend.elevator?.id || 0,
    // Backend returns: elevatorCode, elevatorIdentityNumber
    elevatorIdentityNumber: backend.elevatorCode || backend.elevatorIdentityNumber || backend.elevator?.identityNumber || '',
    elevatorBuildingName: backend.elevatorBuildingName || backend.elevator?.buildingName || '',
    elevator: backend.elevator ? {
      id: backend.elevator.id,
      kimlikNo: backend.elevator.identityNumber || backend.elevatorCode || backend.elevatorIdentityNumber || '',
      bina: backend.elevator.buildingName || backend.elevatorBuildingName || '',
      binaAdi: backend.elevator.buildingName || backend.elevatorBuildingName,
      adres: backend.elevator.address || '',
    } : undefined,
    // Backend returns: inspectionDate (prioritize this)
    denetimTarihi: backend.inspectionDate || backend.date || '',
    denetimYapan: backend.denetimYapan,
    // Backend returns: result (PASSED, FAILED, PENDING)
    sonuc: mapInspectionResultFromBackend(backend.result || 'PENDING'),
    aciklama: backend.description,
    raporNo: backend.raporNo,
    olusturmaTarihi: backend.createdAt || backend.olusturmaTarihi || '',
    // Backend returns: inspectionColor, contactedPersonName
    inspectionColor,
    contactedPersonName,
  }
}

// Frontend formatını backend formatına çevir
function mapInspectionToBackend(inspection: CreateInspectionRequest): any {
  // Yeni backend field isimleri: date, result, description, inspectionColor, contactedPersonName
  // Ensure date is in LocalDate format (YYYY-MM-DD)
  const dateStr = formatDateForAPI(inspection.denetimTarihi)
  
  return {
    elevatorId: inspection.elevatorId,
    date: dateStr, // LocalDate format
    result: mapInspectionResultToBackend(inspection.sonuc),
    description: inspection.aciklama || undefined,
    inspectionColor: inspection.inspectionColor,
    contactedPersonName: inspection.contactedPersonName || undefined,
  }
}

export interface UpdateInspectionRequest extends Partial<CreateInspectionRequest> {}

export const inspectionService = {
  getAll: async (): Promise<Inspection[]> => {
    const { data } = await apiClient.get<ApiResponse<any[]>>(API_ENDPOINTS.INSPECTIONS.BASE)
    const unwrapped = unwrapArrayResponse(data)
    return unwrapped.map(mapInspectionFromBackend)
  },

  getById: async (id: number): Promise<Inspection> => {
    const { data } = await apiClient.get<ApiResponse<any>>(API_ENDPOINTS.INSPECTIONS.BY_ID(id))
    const unwrapped = unwrapResponse(data)
    return mapInspectionFromBackend(unwrapped)
  },

  getByElevatorId: async (elevatorId: number): Promise<Inspection[]> => {
    const { data } = await apiClient.get<ApiResponse<any[]>>(API_ENDPOINTS.INSPECTIONS.BY_ELEVATOR(elevatorId))
    const unwrapped = unwrapArrayResponse(data)
    return unwrapped.map(mapInspectionFromBackend)
  },

  create: async (inspection: CreateInspectionRequest): Promise<Inspection> => {
    const backendRequest = mapInspectionToBackend(inspection)
    const { data } = await apiClient.post<ApiResponse<any>>(API_ENDPOINTS.INSPECTIONS.BASE, backendRequest)
    const unwrapped = unwrapResponse(data)
    return mapInspectionFromBackend(unwrapped)
  },

  // Not: Postman collection'da update ve delete endpoint'leri yok
  // Sadece GET ve POST işlemleri var
}

