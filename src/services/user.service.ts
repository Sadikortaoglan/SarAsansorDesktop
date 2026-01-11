import apiClient from '@/lib/api'
import { unwrapResponse, unwrapArrayResponse, type ApiResponse } from '@/lib/api-response'

export interface User {
  id: number
  username: string
  role: 'PATRON' | 'PERSONEL'
  enabled: boolean
}

export interface CreateUserRequest {
  username: string
  password: string
  role: 'PATRON' | 'PERSONEL'
}

export interface UpdateUserRequest {
  username?: string
  password?: string
  role?: 'PATRON' | 'PERSONEL'
  enabled?: boolean
}

export const userService = {
  getAll: async (): Promise<User[]> => {
    try {
      const { data } = await apiClient.get<ApiResponse<User[]>>('/users')
      return unwrapArrayResponse(data, true) // Opsiyonel endpoint - hata durumunda boş array döndür
    } catch (error: any) {
      // Backend'de endpoint yoksa boş array döndür
      if (error.response?.status === 404 || error.response?.data?.success === false) {
        console.warn('Users endpoint not available:', error.response?.data?.message)
        return []
      }
      throw error
    }
  },

  getById: async (id: number): Promise<User> => {
    const { data } = await apiClient.get<ApiResponse<User>>(`/users/${id}`)
    return unwrapResponse(data)
  },

  create: async (user: CreateUserRequest): Promise<User> => {
    const { data } = await apiClient.post<ApiResponse<User>>('/users', user)
    return unwrapResponse(data)
  },

  update: async (id: number, user: UpdateUserRequest): Promise<User> => {
    const { data } = await apiClient.put<ApiResponse<User>>(`/users/${id}`, user)
    return unwrapResponse(data)
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/users/${id}`)
  },
}

