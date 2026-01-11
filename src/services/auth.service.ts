import apiClient from '@/lib/api'
import { unwrapResponse, type ApiResponse } from '@/lib/api-response'

export interface LoginRequest {
  username: string
  password: string
}

// Backend login response formatı: { success: true, data: { accessToken, refreshToken, userId, username, role } }
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
      console.log('🔵 Login request:', { url: '/auth/login', credentials: { ...credentials, password: '***' } })
      const response = await apiClient.post<ApiResponse<LoginResponseData>>('/auth/login', credentials, {
        headers: {
          'Content-Type': 'application/json',
        },
      })
      console.log('✅ Login response FULL:', response)
      console.log('✅ Login response.data:', response.data)
      
      // Backend formatı: { success: true, data: { accessToken, refreshToken, userId, username, role } }
      const responseData = unwrapResponse(response.data)
      
      // Frontend formatına dönüştür
      const loginResponse: LoginResponse = {
        accessToken: responseData.accessToken,
        refreshToken: responseData.refreshToken,
        user: {
          id: responseData.userId,
          username: responseData.username,
          role: responseData.role,
        },
      }
      
      console.log('✅ Login response parsed:', loginResponse)
      return loginResponse
    } catch (error: any) {
      console.error('❌ Login error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers,
        config: error.config,
      })
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
    // Token'ları temizle, backend'e logout isteği göndermeye gerek yok
    // Çünkü stateless JWT kullanıyoruz
  },
}

