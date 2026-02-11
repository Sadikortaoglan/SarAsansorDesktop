import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { handleApiError, ApiErrorType } from './api-error-handler'

const isDevelopment = import.meta.env.MODE === 'development' || import.meta.env.DEV
const API_BASE_URL = isDevelopment 
  ? '/api'
  : import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'

export const tokenStorage = {
  getAccessToken: () => localStorage.getItem('accessToken'),
  getRefreshToken: () => localStorage.getItem('refreshToken'),
  setTokens: (accessToken: string, refreshToken: string) => {
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
  },
  clearTokens: () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
  },
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: false,
  timeout: 30000,
})
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const url = config.url || ''
    const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/refresh')
    
    // Ensure headers object exists
    if (!config.headers) {
      config.headers = {} as any
    }
    
    // Set Content-Type (skip for FormData - browser sets it automatically)
    if (!(config.data instanceof FormData)) {
      config.headers['Content-Type'] = 'application/json'
    }
    config.headers['Accept'] = 'application/json'
    
    // Log request for maintenance-plans endpoint (for debugging)
    if (url.includes('/maintenance-plans') && config.method === 'post' && config.data) {
      console.log('🌐 AXIOS REQUEST - URL:', config.url)
      console.log('🌐 AXIOS REQUEST - Method:', config.method?.toUpperCase())
      console.log('🌐 AXIOS REQUEST - Headers:', JSON.stringify(config.headers, null, 2))
      console.log('🌐 AXIOS REQUEST - Body (raw):', JSON.stringify(config.data, null, 2))
      console.log('🌐 AXIOS REQUEST - Body (parsed):', config.data)
    }
    
    // Add Authorization header for protected endpoints
    if (!isAuthEndpoint) {
      let token = tokenStorage.getAccessToken()
      
      if (token) {
        // Clean token (remove 'Bearer ' prefix if present)
        const cleanToken = token.trim().startsWith('Bearer ') 
          ? token.trim().substring(7) 
          : token.trim()
        
        if (cleanToken) {
          config.headers.Authorization = `Bearer ${cleanToken}`
        } else {
          // Token is empty, clear storage and reject
          tokenStorage.clearTokens()
          return Promise.reject(new Error('Authentication required. Please login.'))
        }
      } else {
        // No token found, clear storage and reject
        tokenStorage.clearTokens()
        return Promise.reject(new Error('Authentication required. Please login.'))
      }
    } else {
      // Remove Authorization header for auth endpoints
      delete config.headers.Authorization
    }
    
    return config
  },
  (error: AxiosError) => {
    return Promise.reject(error)
  }
)

// Response interceptor - Token refresh
let isRefreshing = false
let failedQueue: Array<{
  resolve: (value?: unknown) => void
  reject: (reason?: unknown) => void
}> = []

const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

apiClient.interceptors.response.use(
  (response) => {
    return response
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean
    }

    const statusCode = error.response?.status
    const isAuthError = statusCode === 401 || statusCode === 403
    const isAuthEndpoint = originalRequest?.url?.includes('/auth/login') || originalRequest?.url?.includes('/auth/refresh')

    if (isAuthError && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            if (originalRequest?.headers && token) {
              originalRequest.headers.Authorization = `Bearer ${token}`
            }
            return apiClient(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      const refreshToken = tokenStorage.getRefreshToken()
      if (!refreshToken) {
        tokenStorage.clearTokens()
        alert('Oturum süreniz doldu. Lütfen tekrar giriş yapın.')
        window.location.href = '/login'
        isRefreshing = false
        return Promise.reject(error)
      }

      try {
        console.log('🔄 REFRESH TOKEN TRIGGERED', { statusCode, url: originalRequest?.url })

        const refreshUrl = isDevelopment 
          ? '/api/auth/refresh'
          : `${API_BASE_URL}/auth/refresh`
        
        const response = await axios.post(refreshUrl, { refreshToken }, {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        })
        
        let accessToken: string
        let newRefreshToken: string
        
        if (response.data && typeof response.data === 'object') {
          if ('success' in response.data && response.data.success && response.data.data) {
            accessToken = response.data.data.accessToken
            newRefreshToken = response.data.data.refreshToken || refreshToken
          } else if ('accessToken' in response.data) {
            accessToken = response.data.accessToken
            newRefreshToken = response.data.refreshToken || refreshToken
          } else {
            throw new Error('Invalid refresh token response format')
          }
        } else {
          throw new Error('Invalid refresh token response')
        }
        
        if (!accessToken) {
          throw new Error('Access token not received from refresh endpoint')
        }
        
        if (!newRefreshToken) {
          newRefreshToken = refreshToken
        }
        
        tokenStorage.setTokens(accessToken, newRefreshToken)
        console.log('✅ REFRESH TOKEN SUCCESS')

        if (originalRequest?.headers) {
          const cleanToken = accessToken.trim().startsWith('Bearer ') 
            ? accessToken.trim().substring(7) 
            : accessToken.trim()
          originalRequest.headers.Authorization = `Bearer ${cleanToken}`
        }

        processQueue(null, accessToken)
        isRefreshing = false
        return apiClient(originalRequest)
      } catch (refreshError: any) {
        console.error('❌ REFRESH TOKEN FAILED', refreshError)
        processQueue(refreshError as AxiosError, null)
        isRefreshing = false
        
        const refreshStatusCode = refreshError?.response?.status || refreshError?.status || 0
        
        if (refreshStatusCode === 400 || refreshStatusCode === 401 || refreshStatusCode === 403 || !refreshToken) {
          tokenStorage.clearTokens()
          
          alert('Oturum süreniz doldu. Lütfen tekrar giriş yapın.')
          
          window.location.href = '/login'
        }
        
        return Promise.reject(refreshError)
      }
    }

    // Use centralized error handler for non-auth errors
    const apiError = handleApiError(error)
    
    // Log error for debugging (except auth errors which are handled above)
    if (apiError.type !== ApiErrorType.AUTHENTICATION && apiError.type !== ApiErrorType.AUTHORIZATION) {
      console.error('API Error:', {
        type: apiError.type,
        message: apiError.message,
        statusCode: apiError.statusCode,
        url: originalRequest?.url,
      })
    }
    
    return Promise.reject(apiError)
  }
)

export default apiClient

