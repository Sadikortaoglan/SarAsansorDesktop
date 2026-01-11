import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireRole?: 'PATRON' | 'PERSONEL'
}

export function ProtectedRoute({ children, requireRole }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, hasRole } = useAuth()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Yükleniyor...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (requireRole && !hasRole(requireRole)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg text-red-600">Bu sayfaya erişim yetkiniz yok.</div>
      </div>
    )
  }

  return <>{children}</>
}

