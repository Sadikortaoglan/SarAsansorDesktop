import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  LayoutDashboard,
  Building2,
  Wrench,
  AlertTriangle,
  Package,
  FileText,
  Users,
  LogOut,
  AlertCircle,
  ClipboardCheck,
  Receipt,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export const menuItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['PATRON', 'PERSONEL'] as const,
  },
  {
    title: 'Asansörler',
    href: '/elevators',
    icon: Building2,
    roles: ['PATRON', 'PERSONEL'] as const,
  },
  {
    title: 'Bakımlar',
    href: '/maintenances',
    icon: Wrench,
    roles: ['PATRON', 'PERSONEL'] as const,
  },
  {
    title: 'Uyarılar',
    href: '/warnings',
    icon: AlertTriangle,
    roles: ['PATRON', 'PERSONEL'] as const,
  },
  {
    title: 'Stok',
    href: '/parts',
    icon: Package,
    roles: ['PATRON', 'PERSONEL'] as const,
  },
  {
    title: 'Teklifler',
    href: '/offers',
    icon: FileText,
    roles: ['PATRON', 'PERSONEL'] as const,
  },
  {
    title: 'Arıza İşlemleri',
    href: '/faults',
    icon: AlertCircle,
    roles: ['PATRON', 'PERSONEL'] as const,
  },
  {
    title: 'Denetimler',
    href: '/inspections',
    icon: ClipboardCheck,
    roles: ['PATRON', 'PERSONEL'] as const,
  },
  {
    title: 'Tahsilat Fişleri',
    href: '/payments',
    icon: Receipt,
    roles: ['PATRON', 'PERSONEL'] as const,
  },
  {
    title: 'Kullanıcılar',
    href: '/users',
    icon: Users,
    roles: ['PATRON'] as const,
  },
]

interface NavigationContentProps {
  onNavigate?: () => void
  className?: string
}

export function NavigationContent({ onNavigate, className }: NavigationContentProps) {
  const { hasRole, logout } = useAuth()
  const location = useLocation()

  const visibleItems = menuItems.filter((item) =>
    item.roles.some((role) => hasRole(role))
  )

  const handleNavClick = () => {
    if (onNavigate) {
      onNavigate()
    }
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
        {visibleItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.href
          return (
            <NavLink
              key={item.href}
              to={item.href}
              onClick={handleNavClick}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors min-h-[44px]',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {item.title}
            </NavLink>
          )
        })}
      </nav>
      <div className="border-t p-4">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 min-h-[44px]"
          onClick={logout}
        >
          <LogOut className="h-5 w-5" />
          Çıkış Yap
        </Button>
      </div>
    </div>
  )
}

export function Sidebar() {
  return (
    <aside className="hidden lg:flex h-screen w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center border-b px-6 flex-shrink-0">
        <h1 className="text-xl font-bold text-primary">Sara Asansör</h1>
      </div>
      <NavigationContent />
    </aside>
  )
}
