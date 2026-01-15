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
    const token = tokenStorage.getAccessToken()
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        setUser({
          id: payload.userId || payload.sub || 0,
          username: payload.username || payload.sub || '',
          role: payload.role || 'PERSONEL',
        })
      } catch (error) {
        tokenStorage.clearTokens()
      }
    }
    setIsLoading(false)
  }, [])

  const login = async (credentials: LoginRequest) => {
    try {
      const response: any = await authService.login(credentials)
      
      if (!response) {
        throw new Error('Sunucudan yanıt alınamadı')
      }

      let accessToken = response.accessToken || response.token || response.access_token || response['accessToken']
      let refreshToken = response.refreshToken || response.refresh_token || response.refreshToken || accessToken
      let user = response.user || response.userInfo || response.userData || response

      if (!accessToken && response.data) {
        accessToken = response.data.accessToken || response.data.token
        refreshToken = response.data.refreshToken || response.data.refresh_token || accessToken
        user = response.data.user || response.data
      }

      if (!accessToken && (response as any).body) {
        const body = (response as any).body
        accessToken = body.accessToken || body.token
        refreshToken = body.refreshToken || body.refresh_token || accessToken
        user = body.user || body
      }

      if (!accessToken) {
        throw new Error('Token alınamadı')
      }

      let username = user?.username || user?.userName || user?.name
      let role = user?.role || 'PERSONEL'
      let userId = user?.id || user?.userId || 0

      if (!username && accessToken) {
        try {
          const payload = JSON.parse(atob(accessToken.split('.')[1]))
          username = payload.username || payload.sub || credentials.username
          role = payload.role || 'PERSONEL'
          userId = payload.userId || payload.sub || 0
        } catch (parseError) {
          username = credentials.username
          role = 'PERSONEL'
          userId = 0
        }
      }

      if (!username) {
        throw new Error('Kullanıcı adı alınamadı')
      }

      tokenStorage.setTokens(accessToken, refreshToken || accessToken)
      
      const userRole: 'PATRON' | 'PERSONEL' = 
        (typeof role === 'string' && role.toUpperCase() === 'PATRON') ? 'PATRON' : 'PERSONEL'
      
      const userData: User = {
        id: userId,
        username: username,
        role: userRole,
      }
      
      setUser(userData)
    } catch (error) {
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
    if (user.role === 'PATRON') return true
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

