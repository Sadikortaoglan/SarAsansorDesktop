import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'

// Development'ta proxy kullan, production'da direkt URL
// import.meta.env.DEV yerine daha güvenilir kontrol
const isDevelopment = import.meta.env.MODE === 'development' || import.meta.env.DEV
const API_BASE_URL = isDevelopment 
  ? '/api'  // Vite proxy kullan - http://localhost:5173/api -> http://localhost:8081/api
  : import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081/api'  // Production URL

console.log('🔵 API Configuration:', {
  mode: import.meta.env.MODE,
  isDev: import.meta.env.DEV,
  isDevelopment,
  API_BASE_URL,
  env: import.meta.env,
})

// Token yönetimi
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

// Axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: false, // CORS için
  timeout: 30000, // 30 saniye timeout
})

// Request interceptor - Token ekle
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Login ve refresh endpoint'lerinde token ekleme
    const url = config.url || ''
    const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/refresh')
    
    if (isAuthEndpoint) {
      console.log('Auth request - no token added:', url)
      // Auth endpoint'lerinde Authorization header'ını temizle
      if (config.headers) {
        delete config.headers.Authorization
      }
      return config
    }
    
    const token = tokenStorage.getAccessToken()
    
    // Token kontrolü ve header ekleme
    if (token) {
      if (!config.headers) {
        config.headers = {} as any
      }
      // Authorization header'ını her zaman Bearer prefix ile ekle
      config.headers.Authorization = `Bearer ${token.trim()}`
      console.log('✅ Authorization header added:', {
        url: config.url,
        method: config.method,
        tokenPreview: token.substring(0, 20) + '...',
      })
    } else {
      console.warn('⚠️ No token found for request:', {
        url: config.url,
        method: config.method,
      })
      // Token yoksa header'ı temizle (403 hatası önlemek için)
      if (config.headers) {
        delete config.headers.Authorization
      }
    }
    
    // Detailed request logging
    console.log('🔵 Request:', {
      url: config.url,
      method: config.method?.toUpperCase(),
      headers: {
        'Content-Type': config.headers?.['Content-Type'],
        'Authorization': config.headers?.Authorization ? 'Bearer ***' : 'missing',
      },
      hasToken: !!token,
      data: config.data ? (typeof config.data === 'string' ? config.data : JSON.stringify(config.data)) : undefined,
    })
    
    return config
  },
  (error: AxiosError) => Promise.reject(error)
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
    // Detailed response logging
    console.log('✅ Response:', {
      url: response.config.url,
      method: response.config.method?.toUpperCase(),
      status: response.status,
      statusText: response.statusText,
      data: response.data ? (typeof response.data === 'object' ? JSON.stringify(response.data).substring(0, 200) + '...' : response.data) : undefined,
    })
    return response
  },
  async (error: AxiosError) => {
    // Full error logging - Request + Response
    const errorDetails = {
      url: error.config?.url,
      method: error.config?.method?.toUpperCase(),
      status: error.response?.status,
      statusText: error.response?.statusText,
      requestHeaders: error.config?.headers,
      requestData: error.config?.data,
      responseHeaders: error.response?.headers,
      responseData: error.response?.data,
      message: error.message,
      hasToken: !!tokenStorage.getAccessToken(),
    }

    // 400 Bad Request - Wrong field names
    if (error.response?.status === 400) {
      console.error('❌ 400 Bad Request Error (Wrong field names):', errorDetails)
    }
    
    // 403 Forbidden - Token missing or role mismatch
    if (error.response?.status === 403) {
      console.error('❌ 403 Forbidden Error (Token missing or role mismatch):', errorDetails)
    }
    
    // 500 Internal Server Error - Null / parsing issue
    if (error.response?.status === 500) {
      console.error('❌ 500 Internal Server Error (Null / parsing issue):', errorDetails)
    }
    
    // Other errors
    if (error.response && ![400, 403, 500].includes(error.response.status)) {
      console.error(`❌ ${error.response.status} Error:`, errorDetails)
    }
    
    // Login errors (extra logging)
    if (error.config?.url?.includes('/auth/login')) {
      console.error('❌ Login Error:', errorDetails)
    }

    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            if (originalRequest.headers && token) {
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
        window.location.href = '/login'
        return Promise.reject(error)
      }

      try {
        // Refresh token için direkt axios kullan (interceptor'dan kaçınmak için)
        const refreshUrl = isDevelopment 
          ? '/api/auth/refresh'  // Proxy kullan
          : `${API_BASE_URL}/auth/refresh`  // Direkt URL
        
        const response = await axios.post(refreshUrl, { refreshToken }, {
          headers: {
            'Content-Type': 'application/json',
          },
        })
        
        // Backend response formatı: { success: true, data: { accessToken, refreshToken } }
        let accessToken: string
        let newRefreshToken: string
        
        if (response.data && typeof response.data === 'object') {
          if ('success' in response.data && response.data.success && response.data.data) {
            // ApiResponse formatı
            accessToken = response.data.data.accessToken
            newRefreshToken = response.data.data.refreshToken || refreshToken
          } else if ('accessToken' in response.data) {
            // Direkt format
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
        
        tokenStorage.setTokens(accessToken, newRefreshToken)
        console.log('✅ Token refreshed successfully')

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`
        }

        processQueue(null, accessToken)
        isRefreshing = false
        return apiClient(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError as AxiosError, null)
        tokenStorage.clearTokens()
        window.location.href = '/login'
        isRefreshing = false
        return Promise.reject(refreshError)
      }
    }

    // 403 Forbidden - Token missing or role mismatch
    if (error.response?.status === 403) {
      // Token yoksa, login sayfasına yönlendir
      if (!tokenStorage.getAccessToken()) {
        console.warn('⚠️ No token found, redirecting to login')
        tokenStorage.clearTokens()
        window.location.href = '/login'
      } else {
        console.warn('⚠️ Token exists but 403 - possible role mismatch or expired token')
      }
    }

    return Promise.reject(error)
  }
)

export default apiClient

