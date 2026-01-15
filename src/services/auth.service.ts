import apiClient from '@/lib/api'
import { unwrapResponse, type ApiResponse } from '@/lib/api-response'

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponseData {
  accessToken: string
  refreshToken: string
  userId: number
  username: string
  role: 'PATRON' | 'PERSONEL'
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  user: {
    id: number
    username: string
    role: 'PATRON' | 'PERSONEL'
  }
}

export interface RefreshTokenRequest {
  refreshToken: string
}

export interface RefreshTokenResponse {
  accessToken: string
  refreshToken: string
}

export const authService = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    try {
      const response = await apiClient.post<ApiResponse<LoginResponseData>>('/auth/login', credentials, {
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      const responseData = unwrapResponse(response.data)
      
      const loginResponse: LoginResponse = {
        accessToken: responseData.accessToken,
        refreshToken: responseData.refreshToken,
        user: {
          id: responseData.userId,
          username: responseData.username,
          role: responseData.role,
        },
      }
      
      return loginResponse
    } catch (error: any) {
      throw error
    }
  },

  refreshToken: async (refreshToken: string): Promise<RefreshTokenResponse> => {
    const { data } = await apiClient.post<ApiResponse<RefreshTokenResponse>>(
      '/auth/refresh',
      { refreshToken }
    )
    return unwrapResponse(data)
  },

  logout: () => {
  },
}

