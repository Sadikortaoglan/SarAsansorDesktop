import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { MainLayout } from './components/layout/MainLayout'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Toaster } from './components/ui/toaster'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { ElevatorsPage } from './pages/ElevatorsPage'
import { ElevatorDetailPage } from './pages/ElevatorDetailPage'
import { MaintenancesPage } from './pages/MaintenancesPage'
import { WarningsPage } from './pages/WarningsPage'
import { PartsPage } from './pages/PartsPage'
import { OffersPage } from './pages/OffersPage'
import { FaultsPage } from './pages/FaultsPage'
import { InspectionsPage } from './pages/InspectionsPage'
import { PaymentsPage } from './pages/PaymentsPage'
import { UsersPage } from './pages/UsersPage'
import { RevisionOffersPage } from './pages/RevisionOffersPage'
import { RevisionOffersConvertedPage } from './pages/RevisionOffersConvertedPage'
import { RevisionStandardsPage } from './pages/RevisionStandardsPage'

function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Yükleniyor...</div>
      </div>
    )
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated && !isLoading ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <LoginPage />
          )
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="elevators" element={<ElevatorsPage />} />
        <Route path="elevators/:id" element={<ElevatorDetailPage />} />
        <Route path="maintenances" element={<MaintenancesPage />} />
        <Route path="warnings" element={<WarningsPage />} />
        <Route path="parts" element={<PartsPage />} />
        <Route path="offers" element={<OffersPage />} />
        <Route path="revision-offers" element={<RevisionOffersPage />} />
        <Route path="revision-offers/converted" element={<RevisionOffersConvertedPage />} />
        <Route path="revision-standards" element={<RevisionStandardsPage />} />
        <Route path="faults" element={<FaultsPage />} />
        <Route path="inspections" element={<InspectionsPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route
          path="users"
          element={
            <ProtectedRoute requireRole="PATRON">
              <UsersPage />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppRoutes />
        <Toaster />
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App

