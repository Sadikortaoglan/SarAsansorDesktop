import apiClient from '@/lib/api'
import { unwrapResponse, unwrapArrayResponse, type ApiResponse } from '@/lib/api-response'

export interface RevisionOfferPart {
  partId: number
  partName: string
  quantity: number
  unitPrice: number
  totalPrice: number
  description?: string
}

export interface RevisionOffer {
  id: number
  offerNo?: string
  elevatorId: number
  elevatorIdentityNumber?: string
  elevatorBuildingName?: string
  currentAccountId?: number
  currentAccountName?: string
  parts: RevisionOfferPart[]
  labor: number
  laborDescription?: string
  totalPrice: number
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'CONVERTED'
  createdAt: string
  convertedToSaleId?: number
  saleNo?: string
}

export interface CreateRevisionOfferRequest {
  elevatorId: number
  currentAccountId?: number
  parts: Omit<RevisionOfferPart, 'totalPrice'>[]
  labor: number
  laborDescription?: string
}

export interface UpdateRevisionOfferRequest extends Partial<CreateRevisionOfferRequest> {
  status?: RevisionOffer['status']
}

function mapRevisionOfferFromBackend(backend: any): RevisionOffer {
  return {
    id: backend.id,
    offerNo: backend.offerNo || backend.offer_no,
    elevatorId: backend.elevatorId || backend.elevator_id || 0,
    elevatorIdentityNumber: backend.elevatorIdentityNumber || backend.elevator_identity_number,
    elevatorBuildingName: backend.elevatorBuildingName || backend.elevator_building_name,
    currentAccountId: backend.currentAccountId || backend.current_account_id,
    currentAccountName: backend.currentAccountName || backend.current_account_name,
    parts: Array.isArray(backend.parts) ? backend.parts.map((p: any) => ({
      partId: p.partId || p.part_id || 0,
      partName: p.partName || p.part_name || '',
      quantity: p.quantity || 0,
      unitPrice: p.unitPrice || p.unit_price || 0,
      totalPrice: (p.quantity || 0) * (p.unitPrice || p.unit_price || 0),
      description: p.description,
    })) : [],
    labor: backend.labor || 0,
    laborDescription: backend.laborDescription || backend.labor_description,
    totalPrice: backend.totalPrice || backend.total_price || 0,
    status: (backend.status || 'DRAFT').toUpperCase() as RevisionOffer['status'],
    createdAt: backend.createdAt || backend.created_at || '',
    convertedToSaleId: backend.convertedToSaleId || backend.converted_to_sale_id,
    saleNo: backend.saleNo || backend.sale_no,
  }
}

export const revisionOfferService = {
  getAll: async (params?: { status?: string; converted?: boolean }): Promise<RevisionOffer[]> => {
    const { data } = await apiClient.get<ApiResponse<any[]>>('/revision-offers', { params })
    const unwrapped = unwrapArrayResponse(data)
    return Array.isArray(unwrapped) ? unwrapped.map(mapRevisionOfferFromBackend) : []
  },

  getById: async (id: number): Promise<RevisionOffer> => {
    const { data } = await apiClient.get<ApiResponse<any>>(`/revision-offers/${id}`)
    const unwrapped = unwrapResponse(data)
    return mapRevisionOfferFromBackend(unwrapped)
  },

  create: async (offer: CreateRevisionOfferRequest): Promise<RevisionOffer> => {
    const backendRequest: any = {
      elevatorId: offer.elevatorId,
      parts: offer.parts.map((p) => ({
        partId: p.partId,
        quantity: p.quantity,
        unitPrice: p.unitPrice,
        description: p.description,
      })),
      labor: offer.labor,
      laborDescription: offer.laborDescription,
    }
    if (offer.currentAccountId) {
      backendRequest.currentAccountId = offer.currentAccountId
    }

    const { data } = await apiClient.post<ApiResponse<any>>('/revision-offers', backendRequest)
    const unwrapped = unwrapResponse(data)
    return mapRevisionOfferFromBackend(unwrapped)
  },

  update: async (id: number, offer: UpdateRevisionOfferRequest): Promise<RevisionOffer> => {
    const backendRequest: any = {}
    if (offer.elevatorId !== undefined) backendRequest.elevatorId = offer.elevatorId
    if (offer.currentAccountId !== undefined) backendRequest.currentAccountId = offer.currentAccountId
    if (offer.parts !== undefined) {
      backendRequest.parts = offer.parts.map((p) => ({
        partId: p.partId,
        quantity: p.quantity,
        unitPrice: p.unitPrice,
        description: p.description,
      }))
    }
    if (offer.labor !== undefined) backendRequest.labor = offer.labor
    if (offer.laborDescription !== undefined) backendRequest.laborDescription = offer.laborDescription
    if (offer.status !== undefined) backendRequest.status = offer.status

    const { data } = await apiClient.put<ApiResponse<any>>(`/revision-offers/${id}`, backendRequest)
    const unwrapped = unwrapResponse(data)
    return mapRevisionOfferFromBackend(unwrapped)
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/revision-offers/${id}`)
  },

  convertToSale: async (id: number): Promise<RevisionOffer> => {
    const { data } = await apiClient.post<ApiResponse<any>>(`/revision-offers/${id}/convert-to-sale`)
    const unwrapped = unwrapResponse(data)
    return mapRevisionOfferFromBackend(unwrapped)
  },

  generatePDF: async (id: number): Promise<Blob> => {
    const { data } = await apiClient.get(`/revision-offers/${id}/pdf`, {
      responseType: 'blob',
    })
    return data
  },
}
