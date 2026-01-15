import apiClient from '@/lib/api'
import { unwrapResponse, unwrapArrayResponse, type ApiResponse } from '@/lib/api-response'

export interface OfferItem {
  id: number
  partId: number
  part?: {
    id: number
    name: string
    unitPrice: number
  }
  quantity: number
  unitPrice: number
  total: number
}

export interface Offer {
  id: number
  elevatorId: number
  elevator?: {
    id: number
    kimlikNo: string
    bina: string
  }
  date: string
  vatRate: number
  discountAmount: number
  subtotal: number
  totalAmount: number
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED'
  items: OfferItem[]
}

export interface CreateOfferRequest {
  elevatorId: number
  date: string
  vatRate?: number
  discountAmount?: number
  status?: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED'
  items: {
    partId: number
    quantity: number
    unitPrice: number
  }[]
}

export interface UpdateOfferRequest extends Partial<CreateOfferRequest> {}

function mapOfferFromBackend(backend: any): Offer {
  return {
    id: backend.id,
    elevatorId: backend.elevatorId || backend.elevator?.id || 0,
    elevator: backend.elevator ? {
      id: backend.elevator.id,
      kimlikNo: backend.elevator.identityNumber || backend.elevator.kimlikNo || '',
      bina: backend.elevator.buildingName || backend.elevator.bina || '',
    } : undefined,
    date: backend.date || '',
    vatRate: backend.vatRate || 0,
    discountAmount: backend.discountAmount || 0,
    subtotal: backend.subtotal || 0,
    totalAmount: backend.totalAmount || 0,
    status: backend.status || 'PENDING',
    items: (backend.items || []).map((item: any) => ({
      id: item.id || 0,
      partId: item.partId,
      part: item.part ? {
        id: item.part.id,
        name: item.part.name,
        unitPrice: item.part.unitPrice || item.unitPrice,
      } : undefined,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.total || (item.quantity * item.unitPrice),
    })),
  }
}

// Not: Postman collection'da Offers endpoint'leri yok, bu yüzden opsiyonel hale getirildi
export const offerService = {
  getAll: async (): Promise<Offer[]> => {
    try {
      const { data } = await apiClient.get<ApiResponse<any[]>>('/offers')
      const unwrapped = unwrapArrayResponse(data, true)
      return Array.isArray(unwrapped) ? unwrapped.map(mapOfferFromBackend) : []
    } catch (error: any) {
      if (error.response?.status === 404 || error.response?.data?.success === false) {
        return []
      }
      throw error
    }
  },

  getById: async (id: number): Promise<Offer | null> => {
    try {
      const { data } = await apiClient.get<ApiResponse<any>>(`/offers/${id}`)
      const unwrapped = unwrapResponse(data, true)
      return unwrapped ? mapOfferFromBackend(unwrapped) : null
    } catch (error: any) {
      if (error.response?.status === 404 || error.response?.data?.success === false) {
        return null
      }
      throw error
    }
  },

  getByElevatorId: async (elevatorId: number): Promise<Offer[]> => {
    try {
      const { data } = await apiClient.get<ApiResponse<any[]>>(`/offers/elevator/${elevatorId}`)
      const unwrapped = unwrapArrayResponse(data, true)
      return Array.isArray(unwrapped) ? unwrapped.map(mapOfferFromBackend) : []
    } catch (error: any) {
      if (error.response?.status === 404 || error.response?.data?.success === false) {
        return []
      }
      throw error
    }
  },

  create: async (offer: CreateOfferRequest): Promise<Offer | null> => {
    try {
      const subtotal = offer.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
      const discountAmount = offer.discountAmount || 0
      const vatRate = offer.vatRate || 20.0
      const afterDiscount = subtotal - discountAmount
      const vatAmount = afterDiscount * (vatRate / 100)
      const totalAmount = afterDiscount + vatAmount

      const backendRequest = {
        elevatorId: offer.elevatorId,
        date: offer.date,
        vatRate: vatRate,
        discountAmount: discountAmount,
        subtotal: subtotal,
        totalAmount: totalAmount,
        status: offer.status || 'PENDING',
        items: offer.items,
      }

      const { data } = await apiClient.post<ApiResponse<any>>('/offers', backendRequest)
      const unwrapped = unwrapResponse(data, true)
      return unwrapped ? mapOfferFromBackend(unwrapped) : null
    } catch (error: any) {
      if (error.response?.status === 404 || error.response?.data?.success === false) {
        return null
      }
      throw error
    }
  },

  update: async (id: number, offer: UpdateOfferRequest): Promise<Offer | null> => {
    try {
      const backendRequest: any = {}
      if (offer.elevatorId !== undefined) backendRequest.elevatorId = offer.elevatorId
      if (offer.date !== undefined) backendRequest.date = offer.date
      if (offer.vatRate !== undefined) backendRequest.vatRate = offer.vatRate
      if (offer.discountAmount !== undefined) backendRequest.discountAmount = offer.discountAmount
      if (offer.status !== undefined) backendRequest.status = offer.status
      if (offer.items !== undefined) {
        backendRequest.items = offer.items
        const subtotal = offer.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
        const discountAmount = offer.discountAmount || 0
        const vatRate = offer.vatRate || 20.0
        const afterDiscount = subtotal - discountAmount
        const vatAmount = afterDiscount * (vatRate / 100)
        backendRequest.subtotal = subtotal
        backendRequest.totalAmount = afterDiscount + vatAmount
      }

      const { data } = await apiClient.put<ApiResponse<any>>(`/offers/${id}`, backendRequest)
      const unwrapped = unwrapResponse(data, true)
      return unwrapped ? mapOfferFromBackend(unwrapped) : null
    } catch (error: any) {
      if (error.response?.status === 404 || error.response?.data?.success === false) {
        return null
      }
      throw error
    }
  },

  delete: async (id: number): Promise<void> => {
    try {
      await apiClient.delete(`/offers/${id}`)
    } catch (error: any) {
      if (error.response?.status === 404 || error.response?.data?.success === false) {
        return
      }
      throw error
    }
  },

  exportPdf: async (id: number): Promise<Blob | null> => {
    try {
      const { data } = await apiClient.get(`/offers/${id}/export`, {
        responseType: 'blob',
      })
      return data
    } catch (error: any) {
      if (error.response?.status === 404 || error.response?.data?.success === false) {
        return null
      }
      throw error
    }
  },
}

