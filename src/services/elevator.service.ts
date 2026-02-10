import apiClient from '@/lib/api'
import { unwrapResponse, unwrapArrayResponse, type ApiResponse } from '@/lib/api-response'

export type LabelType = 'GREEN' | 'BLUE' | 'YELLOW' | 'RED' | 'ORANGE'

export interface Elevator {
  id: number
  kimlikNo: string
  bina: string // Backend'den binaAdi olarak geliyor
  adres: string
  durak: string // Backend'den asansorNo olarak geliyor
  labelType?: LabelType // Etiket tipi (GREEN, BLUE, YELLOW, RED)
  labelDate?: string // Etiket tarihi
  blueLabel?: boolean
  maviEtiketTarihi: string
  bitisTarihi: string
  durum?: 'EXPIRED' | 'WARNING' | 'OK' | 'ACTIVE' // Frontend'de hesaplanacak
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
  // Manager Information
  managerName?: string
  managerTc?: string
  managerPhone?: string
  managerEmail?: string
  // Current Account Information
  currentAccountId?: number
  currentAccountName?: string
  currentAccountBalance?: number
  currentAccountDebt?: number
  currentAccountCredit?: number
}

export interface CreateElevatorRequest {
  kimlikNo: string
  bina: string
  adres: string
  durak: string
  labelType: LabelType
  labelDate: string
  endDate: string
  managerTcIdentityNumber: string
  managerPhoneNumber: string
}

export interface UpdateElevatorRequest extends Partial<CreateElevatorRequest> {}

// Backend'den gelen formatı frontend formatına çevir
// YENİ BACKEND FIELD İSİMLERİ (eski field'lar KULLANILMIYOR):
// identityNumber, buildingName, address, elevatorNumber, floorCount, capacity, speed, inspectionDate
function mapElevatorFromBackend(backend: any): Elevator {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const inspectionDate = backend.inspectionDate || ''
  const bitisTarihi = backend.bitisTarihi || backend.endDate || inspectionDate
  const endDate = new Date(bitisTarihi)
  endDate.setHours(0, 0, 0, 0)
  const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  
  // Backend'den gelen status'u kontrol et, yoksa hesapla
  let durum: 'EXPIRED' | 'WARNING' | 'OK' | 'ACTIVE' = 'OK'
  if (backend.status) {
    const status = backend.status.toUpperCase()
    if (status === 'EXPIRED') durum = 'EXPIRED'
    else if (status === 'WARNING') durum = 'WARNING'
    else if (status === 'ACTIVE' || status === 'OK') durum = 'ACTIVE'
  } else {
    // Frontend'de hesapla
    if (daysUntilExpiry < 0) {
      durum = 'EXPIRED'
    } else if (daysUntilExpiry <= 30) {
      durum = 'WARNING'
    } else {
      durum = 'ACTIVE'
    }
  }

  // Label type mapping
  const labelType: LabelType | undefined = backend.labelType || backend.label_type
    ? (backend.labelType || backend.label_type).toUpperCase() as LabelType
    : undefined

  return {
    id: backend.id,
    kimlikNo: backend.identityNumber || '',
    bina: backend.buildingName || '',
    adres: backend.address || '',
    durak: backend.elevatorNumber || '',
    labelType,
    labelDate: backend.labelDate || backend.label_date || backend.inspectionDate || '',
    blueLabel: backend.blueLabel ?? backend.blue_label ?? false,
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
    // Manager Information
    managerName: backend.managerName || backend.manager_name,
    managerTc: backend.managerTc || backend.manager_tc || backend.managerTcIdentity,
    managerPhone: backend.managerPhone || backend.manager_phone,
    managerEmail: backend.managerEmail || backend.manager_email,
    // Current Account Information
    currentAccountId: backend.currentAccountId || backend.current_account_id,
    currentAccountName: backend.currentAccountName || backend.current_account_name,
    currentAccountBalance: backend.currentAccountBalance || backend.current_account_balance,
    currentAccountDebt: backend.currentAccountDebt || backend.current_account_debt,
    currentAccountCredit: backend.currentAccountCredit || backend.current_account_credit,
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
    // Yeni backend field isimleri: identityNumber, buildingName, address, elevatorNumber, labelType, labelDate, endDate, managerTcIdentityNumber, managerPhoneNumber
    const backendRequest: any = {
      identityNumber: elevator.kimlikNo,
      buildingName: elevator.bina,
      address: elevator.adres,
      elevatorNumber: elevator.durak,
      labelType: elevator.labelType,
      labelDate: elevator.labelDate,
      endDate: elevator.endDate,
      managerTcIdentityNumber: elevator.managerTcIdentityNumber,
      managerPhoneNumber: elevator.managerPhoneNumber,
    }
    
    const { data } = await apiClient.post<ApiResponse<any>>('/elevators', backendRequest)
    const unwrapped = unwrapResponse(data)
    return mapElevatorFromBackend(unwrapped)
  },

  update: async (id: number, elevator: UpdateElevatorRequest): Promise<Elevator> => {
    const backendRequest: any = {}
    if (elevator.kimlikNo !== undefined) backendRequest.identityNumber = elevator.kimlikNo
    if (elevator.bina !== undefined) backendRequest.buildingName = elevator.bina
    if (elevator.adres !== undefined) backendRequest.address = elevator.adres
    if (elevator.durak !== undefined) backendRequest.elevatorNumber = elevator.durak
    if (elevator.labelType !== undefined) backendRequest.labelType = elevator.labelType
    if (elevator.labelDate !== undefined) backendRequest.labelDate = elevator.labelDate
    if (elevator.endDate !== undefined) backendRequest.endDate = elevator.endDate
    if (elevator.managerTcIdentityNumber !== undefined) backendRequest.managerTcIdentityNumber = elevator.managerTcIdentityNumber
    if (elevator.managerPhoneNumber !== undefined) backendRequest.managerPhoneNumber = elevator.managerPhoneNumber
    
    const { data } = await apiClient.put<ApiResponse<any>>(`/elevators/${id}`, backendRequest)
    const unwrapped = unwrapResponse(data)
    return mapElevatorFromBackend(unwrapped)
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/elevators/${id}`)
  },
}

