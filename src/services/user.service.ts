import apiClient from '@/lib/api'
import { unwrapResponse, unwrapArrayResponse, type ApiResponse } from '@/lib/api-response'

export interface User {
  id: number
  username: string
  role: 'PATRON' | 'PERSONEL'
  enabled?: boolean
  active?: boolean
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

function mapUserFromBackend(backend: any): User {
  const isActive = backend.active ?? backend.enabled ?? true
  return {
    id: backend.id,
    username: backend.username || '',
    role: backend.role || 'PERSONEL',
    enabled: isActive,
    active: isActive,
  }
}

export const userService = {
  getAll: async (): Promise<User[]> => {
    try {
      const { data } = await apiClient.get<ApiResponse<any[]>>('/users')
      const unwrapped = unwrapArrayResponse(data, true)
      return Array.isArray(unwrapped) ? unwrapped.map(mapUserFromBackend) : []
    } catch (error: any) {
      if (error.response?.status === 404 || error.response?.data?.success === false) {
        return []
      }
      throw error
    }
  },

  getById: async (id: number): Promise<User> => {
    const { data } = await apiClient.get<ApiResponse<any>>(`/users/${id}`)
    const unwrapped = unwrapResponse(data)
    return mapUserFromBackend(unwrapped)
  },

  create: async (user: CreateUserRequest): Promise<User> => {
    const { data } = await apiClient.post<ApiResponse<any>>('/users', user)
    const unwrapped = unwrapResponse(data)
    return mapUserFromBackend(unwrapped)
  },

  update: async (id: number, user: UpdateUserRequest): Promise<User> => {
    const backendRequest: any = {}
    if (user.username !== undefined) backendRequest.username = user.username
    if (user.password !== undefined && user.password.trim()) {
      backendRequest.password = user.password.trim()
    }
    if (user.role !== undefined) backendRequest.role = user.role
    if (user.enabled !== undefined) {
      backendRequest.enabled = user.enabled
      backendRequest.active = user.enabled
    }
    
    const { data } = await apiClient.put<ApiResponse<any>>(`/users/${id}`, backendRequest)
    const unwrapped = unwrapResponse(data)
    return mapUserFromBackend(unwrapped)
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/users/${id}`)
  },
}

