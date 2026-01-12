import apiClient from '@/lib/api'
import { unwrapResponse, unwrapArrayResponse, type ApiResponse } from '@/lib/api-response'

// Backend field isimleri: ad, birimFiyat, stok
export interface Part {
  id: number
  name: string // Backend'den ad olarak geliyor
  stockLevel: number // Backend'den stok olarak geliyor
  unitPrice: number // Backend'den birimFiyat olarak geliyor
  description?: string
}

export interface CreatePartRequest {
  name: string
  stockLevel: number
  unitPrice: number
  description?: string
}

export interface UpdatePartRequest extends Partial<CreatePartRequest> {}

// Backend'den gelen formatı frontend formatına çevir
// YENİ BACKEND FIELD İSİMLERİ (eski field'lar KULLANILMIYOR):
// name, unitPrice, stock
function mapPartFromBackend(backend: any): Part {
  return {
    id: backend.id,
    name: backend.name || '',
    stockLevel: backend.stock || 0,
    unitPrice: backend.unitPrice || 0,
    description: backend.description,
  }
}

// Frontend formatını backend formatına çevir
// Backend'de description field'ı yok - sadece name, unitPrice, stock gönderilmeli
function mapPartToBackend(part: CreatePartRequest | UpdatePartRequest): any {
  return {
    name: part.name,
    unitPrice: part.unitPrice,
    stock: part.stockLevel,
    // description field'ı backend'de yok, gönderilmiyor
  }
}

export const partService = {
  getAll: async (): Promise<Part[]> => {
    const { data } = await apiClient.get<ApiResponse<any[]>>('/parts')
    const unwrapped = unwrapArrayResponse(data)
    return unwrapped.map(mapPartFromBackend)
  },

  getById: async (id: number): Promise<Part> => {
    const { data } = await apiClient.get<ApiResponse<any>>(`/parts/${id}`)
    const unwrapped = unwrapResponse(data)
    return mapPartFromBackend(unwrapped)
  },

  create: async (part: CreatePartRequest): Promise<Part> => {
    const backendRequest = mapPartToBackend(part)
    const { data } = await apiClient.post<ApiResponse<any>>('/parts', backendRequest)
    const unwrapped = unwrapResponse(data)
    return mapPartFromBackend(unwrapped)
  },

  update: async (id: number, part: UpdatePartRequest): Promise<Part> => {
    const backendRequest = mapPartToBackend(part)
    const { data } = await apiClient.put<ApiResponse<any>>(`/parts/${id}`, backendRequest)
    const unwrapped = unwrapResponse(data)
    return mapPartFromBackend(unwrapped)
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/parts/${id}`)
  },
}

