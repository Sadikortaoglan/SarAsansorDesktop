import apiClient from '@/lib/api'
import { resolveAuthApiBaseUrl } from '@/lib/api-base-url'
import { unwrapResponse, type ApiResponse } from '@/lib/api-response'
import { normalizeRole, type AppRole } from '@/lib/roles'

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponseData {
  accessToken: string
  refreshToken: string
  tokenType?: string
  userId: number
  username: string
  role: string
  userType?: string
  b2bUnitId?: number | null
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  tokenType?: string
  user: {
    id: number
    username: string
    role: AppRole
    userType?: string
    b2bUnitId?: number | null
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
      const authBaseUrl = resolveAuthApiBaseUrl()
      const response = await apiClient.post<ApiResponse<LoginResponseData>>('/auth/login', credentials, {
        baseURL: authBaseUrl,
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      const responseData = unwrapResponse(response.data)
      
      const loginResponse: LoginResponse = {
        accessToken: responseData.accessToken,
        refreshToken: responseData.refreshToken,
        tokenType: responseData.tokenType,
        user: {
          id: responseData.userId,
          username: responseData.username,
          role: normalizeRole(responseData.role),
          userType: responseData.userType,
          b2bUnitId: responseData.b2bUnitId,
        },
      }
      
      return loginResponse
    } catch (error: any) {
      throw error
    }
  },

  refreshToken: async (refreshToken: string): Promise<RefreshTokenResponse> => {
    const authBaseUrl = resolveAuthApiBaseUrl()
    const { data } = await apiClient.post<ApiResponse<RefreshTokenResponse>>(
      '/auth/refresh',
      { refreshToken },
      { baseURL: authBaseUrl }
    )
    return unwrapResponse(data)
  },

  logout: () => {
  },
}
