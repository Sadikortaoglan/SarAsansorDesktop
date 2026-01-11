import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { authService, type LoginRequest } from '@/services/auth.service'
import { tokenStorage } from '@/lib/api'

interface User {
  id: number
  username: string
  role: 'PATRON' | 'PERSONEL'
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials: LoginRequest) => Promise<void>
  logout: () => void
  hasRole: (role: 'PATRON' | 'PERSONEL') => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Token varsa, user bilgisini localStorage'dan al
    const token = tokenStorage.getAccessToken()
    if (token) {
      try {
        // JWT token'dan user bilgisini parse et (basit decode)
        const payload = JSON.parse(atob(token.split('.')[1]))
        setUser({
          id: payload.userId || payload.sub || 0,
          username: payload.username || payload.sub || '',
          role: payload.role || 'PERSONEL',
        })
      } catch (error) {
        console.error('Token parse error:', error)
        tokenStorage.clearTokens()
      }
    }
    setIsLoading(false)
  }, [])

  const login = async (credentials: LoginRequest) => {
    try {
      console.log('🔵 AuthContext: Login başlatılıyor...')
      const response: any = await authService.login(credentials)
      
      console.log('🔵 AuthContext: Raw response:', response)
      console.log('🔵 AuthContext: Response type:', typeof response)
      console.log('🔵 AuthContext: Response keys:', Object.keys(response || {}))
      
      // Backend response formatını kontrol et
      if (!response) {
        console.error('❌ AuthContext: Response boş!')
        throw new Error('Sunucudan yanıt alınamadı')
      }

      // Farklı response formatlarını destekle - daha esnek kontrol
      let accessToken = response.accessToken || response.token || response.access_token || response['accessToken']
      let refreshToken = response.refreshToken || response.refresh_token || response.refreshToken || accessToken
      let user = response.user || response.userInfo || response.userData || response

      // Eğer direkt token ve user ayrı ayrı geliyorsa
      if (!accessToken && response.data) {
        accessToken = response.data.accessToken || response.data.token
        refreshToken = response.data.refreshToken || response.data.refresh_token || accessToken
        user = response.data.user || response.data
      }

      // Nested structure kontrolü
      if (!accessToken && (response as any).body) {
        const body = (response as any).body
        accessToken = body.accessToken || body.token
        refreshToken = body.refreshToken || body.refresh_token || accessToken
        user = body.user || body
      }

      console.log('🔵 AuthContext: Extracted tokens:', {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        hasUser: !!user,
        accessTokenPreview: accessToken ? accessToken.substring(0, 50) + '...' : 'null',
        responseStructure: JSON.stringify(response, null, 2),
      })

      if (!accessToken) {
        console.error('❌ AuthContext: Token bulunamadı!')
        console.error('❌ Full Response Object:', response)
        console.error('❌ Response Type:', typeof response)
        console.error('❌ Response Keys:', Object.keys(response || {}))
        console.error('❌ Response JSON:', JSON.stringify(response, null, 2))
        throw new Error('Token alınamadı. Backend response formatını kontrol edin. Browser Console\'da detaylı logları kontrol edin.')
      }

      // User bilgilerini kontrol et
      let username = user?.username || user?.userName || user?.name
      let role = user?.role || 'PERSONEL'
      let userId = user?.id || user?.userId || 0

      // Eğer user objesi yoksa, token'dan parse etmeyi dene
      if (!username && accessToken) {
        try {
          const payload = JSON.parse(atob(accessToken.split('.')[1]))
          username = payload.username || payload.sub || credentials.username
          role = payload.role || 'PERSONEL'
          userId = payload.userId || payload.sub || 0
          console.log('🔵 AuthContext: Token\'dan parse edildi:', { username, role, userId })
        } catch (parseError) {
          console.warn('⚠️ AuthContext: Token parse edilemedi, default kullanılıyor')
          username = credentials.username
          role = 'PERSONEL'
          userId = 0
        }
      }

      if (!username) {
        console.error('❌ AuthContext: Username bulunamadı!')
        throw new Error('Kullanıcı adı alınamadı. Response: ' + JSON.stringify(response))
      }

      tokenStorage.setTokens(accessToken, refreshToken || accessToken)
      
      const userRole: 'PATRON' | 'PERSONEL' = 
        (typeof role === 'string' && role.toUpperCase() === 'PATRON') ? 'PATRON' : 'PERSONEL'
      
      const userData: User = {
        id: userId,
        username: username,
        role: userRole,
      }
      
      console.log('✅ AuthContext: Login başarılı! User data:', userData)
      setUser(userData)
    } catch (error) {
      console.error('❌ AuthContext: Login error:', error)
      throw error
    }
  }

  const logout = () => {
    tokenStorage.clearTokens()
    setUser(null)
    authService.logout()
  }

  const hasRole = (role: 'PATRON' | 'PERSONEL'): boolean => {
    if (!user) return false
    if (user.role === 'PATRON') return true // PATRON her şeyi görebilir
    return user.role === role
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

