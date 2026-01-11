import apiClient from '@/lib/api'
import { unwrapResponse, unwrapArrayResponse, type ApiResponse } from '@/lib/api-response'

export interface Elevator {
  id: number
  kimlikNo: string
  bina: string // Backend'den binaAdi olarak geliyor
  adres: string
  durak: string // Backend'den asansorNo olarak geliyor
  maviEtiket?: string
  maviEtiketTarihi: string
  bitisTarihi: string
  durum?: 'EXPIRED' | 'WARNING' | 'OK' // Frontend'de hesaplanacak
  // Backend'den gelen ek field'lar
  binaAdi?: string
  asansorNo?: string
  durakSayisi?: number
  kapasite?: number
  hiz?: number
  teknikNotlar?: string
  tahrikTipi?: string
  makineMarka?: string
  kapiTipi?: string
  montajYili?: number
  seriNo?: string
  kumanda?: string
  halat?: string
  modernizasyon?: string
}

export interface CreateElevatorRequest {
  kimlikNo: string
  bina: string
  adres: string
  durak: string
  maviEtiket: string
  maviEtiketTarihi: string
}

export interface UpdateElevatorRequest extends Partial<CreateElevatorRequest> {}

// Backend'den gelen formatı frontend formatına çevir
// YENİ BACKEND FIELD İSİMLERİ (eski field'lar KULLANILMIYOR):
// identityNumber, buildingName, address, elevatorNumber, floorCount, capacity, speed, inspectionDate
function mapElevatorFromBackend(backend: any): Elevator {
  const today = new Date()
  const inspectionDate = backend.inspectionDate || ''
  const bitisTarihi = new Date(backend.bitisTarihi || inspectionDate)
  const daysUntilExpiry = Math.ceil((bitisTarihi.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  
  let durum: 'EXPIRED' | 'WARNING' | 'OK' = 'OK'
  if (daysUntilExpiry < 0) {
    durum = 'EXPIRED'
  } else if (daysUntilExpiry <= 30) {
    durum = 'WARNING'
  }

  return {
    id: backend.id,
    kimlikNo: backend.identityNumber || '',
    bina: backend.buildingName || '',
    adres: backend.address || '',
    durak: backend.elevatorNumber || '',
    maviEtiket: backend.maviEtiket || '',
    maviEtiketTarihi: backend.inspectionDate || '',
    bitisTarihi: backend.bitisTarihi || '',
    durum,
    // Yeni backend field'ları
    binaAdi: backend.buildingName,
    asansorNo: backend.elevatorNumber,
    durakSayisi: backend.floorCount,
    kapasite: backend.capacity,
    hiz: backend.speed,
    teknikNotlar: backend.teknikNotlar,
    tahrikTipi: backend.tahrikTipi,
    makineMarka: backend.makineMarka,
    kapiTipi: backend.kapiTipi,
    montajYili: backend.montajYili,
    seriNo: backend.seriNo,
    kumanda: backend.kumanda,
    halat: backend.halat,
    modernizasyon: backend.modernizasyon,
  }
}

export const elevatorService = {
  getAll: async (): Promise<Elevator[]> => {
    const { data } = await apiClient.get<ApiResponse<any[]>>('/elevators')
    const unwrapped = unwrapArrayResponse(data)
    // Array'i map et
    return Array.isArray(unwrapped) ? unwrapped.map(mapElevatorFromBackend) : []
  },

  getById: async (id: number): Promise<Elevator> => {
    const { data } = await apiClient.get<ApiResponse<any>>(`/elevators/${id}`)
    const unwrapped = unwrapResponse(data)
    return mapElevatorFromBackend(unwrapped)
  },

  getStatus: async (id: number): Promise<'EXPIRED' | 'WARNING' | 'OK'> => {
    // Backend: GET /elevators/{id}/status - durum bilgisini getirir
    const { data } = await apiClient.get<ApiResponse<{ status: string }>>(`/elevators/${id}/status`)
    const unwrapped = unwrapResponse(data)
    const status = unwrapped.status || 'OK'
    if (status === 'EXPIRED') return 'EXPIRED'
    if (status === 'WARNING') return 'WARNING'
    return 'OK'
  },

  create: async (elevator: CreateElevatorRequest): Promise<Elevator> => {
    // Yeni backend field isimleri: identityNumber, buildingName, address, elevatorNumber, inspectionDate
    const backendRequest: any = {
      identityNumber: elevator.kimlikNo,
      buildingName: elevator.bina,
      address: elevator.adres,
      elevatorNumber: elevator.durak,
      inspectionDate: elevator.maviEtiketTarihi,
    }
    // Opsiyonel field'lar: floorCount, capacity, speed eklenecekse buraya eklenebilir
    
    const { data } = await apiClient.post<ApiResponse<any>>('/elevators', backendRequest)
    const unwrapped = unwrapResponse(data)
    return mapElevatorFromBackend(unwrapped)
  },

  update: async (id: number, elevator: UpdateElevatorRequest): Promise<Elevator> => {
    // Yeni backend field isimleri: identityNumber, buildingName, address, elevatorNumber, inspectionDate
    const backendRequest: any = {}
    if (elevator.kimlikNo) backendRequest.identityNumber = elevator.kimlikNo
    if (elevator.bina) backendRequest.buildingName = elevator.bina
    if (elevator.adres) backendRequest.address = elevator.adres
    if (elevator.durak) backendRequest.elevatorNumber = elevator.durak
    if (elevator.maviEtiketTarihi) backendRequest.inspectionDate = elevator.maviEtiketTarihi
    
    const { data } = await apiClient.put<ApiResponse<any>>(`/elevators/${id}`, backendRequest)
    const unwrapped = unwrapResponse(data)
    return mapElevatorFromBackend(unwrapped)
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/elevators/${id}`)
  },
}

