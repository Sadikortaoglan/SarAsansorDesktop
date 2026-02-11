import apiClient from '@/lib/api'
import { unwrapResponse, unwrapArrayResponse, type ApiResponse } from '@/lib/api-response'
import { formatDateForAPI, convertDateTimeToLocalDate } from '@/lib/date-utils'
import { API_ENDPOINTS } from '@/lib/api-endpoints'

// Backend field isimleri: amount (tutar), payerName, date (odemeTarihi), note (aciklama)
export interface Payment {
  id: number
  maintenanceId: number
  maintenance?: {
    id: number
    elevatorId: number
    elevator?: {
      id: number
      kimlikNo: string
      bina?: string
      binaAdi?: string
    }
    aciklama: string
    ucret: number
  }
  odemeTarihi: string // Backend'den date olarak geliyor
  tutar: number // Backend'den amount olarak geliyor
  odemeYontemi?: 'CASH' | 'CREDIT_CARD' | 'BANK_TRANSFER' | 'CHECK' // Backend'de yok gibi görünüyor
  payerName?: string // Backend'den payerName olarak geliyor
  aciklama?: string // Backend'den note olarak geliyor
  fisNo?: string
  olusturmaTarihi: string
}

export interface CreatePaymentRequest {
  maintenanceId: number
  amount: number // Backend'e amount olarak gönderilecek
  payerName: string // Backend'e payerName olarak gönderilecek
  date: string // Backend'e date olarak gönderilecek (YYYY-MM-DD)
  note?: string // Backend'e note olarak gönderilecek
}

export interface PaymentSummary {
  totalAmount: number
  totalCount: number
  byMethod: {
    method: string
    amount: number
    count: number
  }[]
}

// Backend'den gelen formatı frontend formatına çevir
// YENİ BACKEND FIELD İSİMLERİ (eski field'lar KULLANILMIYOR):
// amount, payerName, date, note
function mapPaymentFromBackend(backend: any): Payment {
  return {
    id: backend.id,
    maintenanceId: backend.maintenanceId || backend.maintenance?.id || 0,
    maintenance: backend.maintenance ? {
      id: backend.maintenance.id,
      elevatorId: backend.maintenance.elevatorId || backend.maintenance.elevator?.id || 0,
      elevator: backend.maintenance.elevator ? {
        id: backend.maintenance.elevator.id,
        kimlikNo: backend.maintenance.elevator.identityNumber || '',
        bina: backend.maintenance.elevator.buildingName || '',
        binaAdi: backend.maintenance.elevator.buildingName,
      } : undefined,
      aciklama: backend.maintenance.description || '',
      ucret: backend.maintenance.amount || 0,
    } : undefined,
    odemeTarihi: backend.date || '',
    tutar: backend.amount || 0,
    payerName: backend.payerName,
    odemeYontemi: backend.odemeYontemi,
    aciklama: backend.note,
    fisNo: backend.fisNo,
    olusturmaTarihi: backend.createdAt || backend.olusturmaTarihi || '',
  }
}

export const paymentService = {
  getAll: async (params?: { dateFrom?: string; dateTo?: string }): Promise<Payment[]> => {
    // Convert datetime to LocalDate if needed
    const cleanParams: { dateFrom?: string; dateTo?: string } = {}
    if (params?.dateFrom) {
      try {
        cleanParams.dateFrom = convertDateTimeToLocalDate(params.dateFrom)
      } catch {
        cleanParams.dateFrom = params.dateFrom.split('T')[0] // Fallback
      }
    }
    if (params?.dateTo) {
      try {
        cleanParams.dateTo = convertDateTimeToLocalDate(params.dateTo)
      } catch {
        cleanParams.dateTo = params.dateTo.split('T')[0] // Fallback
      }
    }
    
    const { data } = await apiClient.get<ApiResponse<any[]>>(API_ENDPOINTS.PAYMENTS.BASE, { params: cleanParams })
    const unwrapped = unwrapArrayResponse(data)
    return unwrapped.map(mapPaymentFromBackend)
  },

  create: async (payment: CreatePaymentRequest): Promise<Payment> => {
    // Ensure date is in LocalDate format (YYYY-MM-DD)
    const dateStr = formatDateForAPI(payment.date)
    
    const backendRequest = {
      maintenanceId: payment.maintenanceId,
      amount: payment.amount,
      payerName: payment.payerName,
      date: dateStr, // LocalDate format
      note: payment.note,
    }
    const { data } = await apiClient.post<ApiResponse<any>>(API_ENDPOINTS.PAYMENTS.BASE, backendRequest)
    const unwrapped = unwrapResponse(data)
    return mapPaymentFromBackend(unwrapped)
  },

  getById: async (id: number): Promise<Payment> => {
    const { data } = await apiClient.get<ApiResponse<any>>(API_ENDPOINTS.PAYMENTS.BY_ID(id))
    const unwrapped = unwrapResponse(data)
    return mapPaymentFromBackend(unwrapped)
  },

  getSummary: async (params?: { dateFrom?: string; dateTo?: string }): Promise<PaymentSummary | null> => {
    try {
      // Convert datetime to LocalDate if needed
      const cleanParams: { dateFrom?: string; dateTo?: string } = {}
      if (params?.dateFrom) {
        try {
          cleanParams.dateFrom = convertDateTimeToLocalDate(params.dateFrom)
        } catch {
          cleanParams.dateFrom = params.dateFrom.split('T')[0] // Fallback
        }
      }
      if (params?.dateTo) {
        try {
          cleanParams.dateTo = convertDateTimeToLocalDate(params.dateTo)
        } catch {
          cleanParams.dateTo = params.dateTo.split('T')[0] // Fallback
        }
      }
      
      const { data } = await apiClient.get<ApiResponse<PaymentSummary>>('/payments/summary', { params: cleanParams })
      return unwrapResponse(data, true)
    } catch (error: any) {
      if (error.response?.status === 404 || error.response?.data?.success === false) {
        return null
      }
      throw error
    }
  },

  exportPdf: async (params?: { dateFrom?: string; dateTo?: string }): Promise<Blob> => {
    const { data } = await apiClient.get('/payments/export/pdf', {
      params,
      responseType: 'blob',
    })
    return data
  },

  exportExcel: async (params?: { dateFrom?: string; dateTo?: string }): Promise<Blob> => {
    const { data } = await apiClient.get('/payments/export/excel', {
      params,
      responseType: 'blob',
    })
    return data
  },
}

