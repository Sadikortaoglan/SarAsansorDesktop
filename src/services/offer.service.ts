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
  customerName: string
  customerAddress?: string
  customerPhone?: string
  offerDate: string
  validUntil: string
  totalAmount: number
  items: OfferItem[]
}

export interface CreateOfferRequest {
  customerName: string
  customerAddress?: string
  customerPhone?: string
  validUntil: string
  items: {
    partId: number
    quantity: number
    unitPrice: number
  }[]
}

export interface UpdateOfferRequest extends Partial<CreateOfferRequest> {}

// Not: Postman collection'da Offers endpoint'leri yok, bu yüzden opsiyonel hale getirildi
export const offerService = {
  getAll: async (): Promise<Offer[]> => {
    try {
      const { data } = await apiClient.get<ApiResponse<Offer[]>>('/offers')
      return unwrapArrayResponse(data, true) // Opsiyonel endpoint
    } catch (error: any) {
      if (error.response?.status === 404 || error.response?.data?.success === false) {
        console.warn('Offers endpoint not available:', error.response?.data?.message)
        return []
      }
      throw error
    }
  },

  getById: async (id: number): Promise<Offer | null> => {
    try {
      const { data } = await apiClient.get<ApiResponse<Offer>>(`/offers/${id}`)
      return unwrapResponse(data, true) // Opsiyonel endpoint
    } catch (error: any) {
      if (error.response?.status === 404 || error.response?.data?.success === false) {
        console.warn('Offers getById endpoint not available:', error.response?.data?.message)
        return null
      }
      throw error
    }
  },

  create: async (offer: CreateOfferRequest): Promise<Offer | null> => {
    try {
      const { data } = await apiClient.post<ApiResponse<Offer>>('/offers', offer)
      return unwrapResponse(data, true) // Opsiyonel endpoint
    } catch (error: any) {
      if (error.response?.status === 404 || error.response?.data?.success === false) {
        console.warn('Offers create endpoint not available:', error.response?.data?.message)
        return null
      }
      throw error
    }
  },

  update: async (id: number, offer: UpdateOfferRequest): Promise<Offer | null> => {
    try {
      const { data } = await apiClient.put<ApiResponse<Offer>>(`/offers/${id}`, offer)
      return unwrapResponse(data, true) // Opsiyonel endpoint
    } catch (error: any) {
      if (error.response?.status === 404 || error.response?.data?.success === false) {
        console.warn('Offers update endpoint not available:', error.response?.data?.message)
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
        console.warn('Offers delete endpoint not available:', error.response?.data?.message)
        return // Opsiyonel endpoint, sessizce geç
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
        console.warn('Offers exportPdf endpoint not available:', error.response?.data?.message)
        return null
      }
      throw error
    }
  },
}

