import { useState, useEffect } from 'react'
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
  FileCheck,
  ChevronRight,
  ListChecks,
  PlusCircle,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

type MenuItem = {
  title: string
  href?: string
  icon: React.ComponentType<{ className?: string }>
  roles: readonly ('PATRON' | 'PERSONEL')[]
  children?: MenuItem[]
}

export const menuItems: MenuItem[] = [
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
    title: 'Revizyon Teklifleri',
    icon: FileCheck,
    roles: ['PATRON', 'PERSONEL'] as const,
    children: [
      {
        title: 'Teklif Listesi',
        href: '/revision-offers',
        icon: ListChecks,
        roles: ['PATRON', 'PERSONEL'] as const,
      },
      {
        title: 'Satışa Dönüştürülenler',
        href: '/revision-offers/converted',
        icon: PlusCircle,
        roles: ['PATRON', 'PERSONEL'] as const,
      },
      {
        title: 'Teklif Oluştur',
        href: '/revision-offers',
        icon: PlusCircle,
        roles: ['PATRON', 'PERSONEL'] as const,
      },
      {
        title: 'Revizyon Standartları',
        href: '/revision-standards',
        icon: Settings,
        roles: ['PATRON', 'PERSONEL'] as const,
      },
    ],
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

const STORAGE_KEY = 'sidebar-expanded-menu'

export function NavigationContent({ onNavigate, className }: NavigationContentProps) {
  const { hasRole, logout } = useAuth()
  const location = useLocation()
  const [expandedMenu, setExpandedMenu] = useState<string | null>(() => {
    // Load from localStorage on mount
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved || null
    }
    return null
  })

  // Auto-expand menu if current route matches a child
  useEffect(() => {
    const currentPath = location.pathname
    menuItems.forEach((item) => {
      if (item.children) {
        const hasActiveChild = item.children.some((child) => child.href === currentPath)
        if (hasActiveChild && expandedMenu !== item.title) {
          setExpandedMenu(item.title)
          localStorage.setItem(STORAGE_KEY, item.title)
        }
      }
    })
  }, [location.pathname, expandedMenu])

  const visibleItems = menuItems.filter((item) =>
    item.roles.some((role) => hasRole(role))
  )

  const handleNavClick = () => {
    if (onNavigate) {
      onNavigate()
    }
  }

  const toggleMenu = (menuTitle: string) => {
    const newExpanded = expandedMenu === menuTitle ? null : menuTitle
    setExpandedMenu(newExpanded)
    localStorage.setItem(STORAGE_KEY, newExpanded || '')
  }

  const isChildActive = (children: MenuItem[]) => {
    return children.some((child) => child.href === location.pathname)
  }

  const renderMenuItem = (item: MenuItem, level: number = 0) => {
    const Icon = item.icon
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedMenu === item.title
    const isActive = item.href ? location.pathname === item.href : false
    const hasActiveChild = hasChildren && isChildActive(item.children!)

    // Filter children by role
    const visibleChildren = hasChildren
      ? item.children!.filter((child) => child.roles.some((role) => hasRole(role)))
      : []

    if (hasChildren && visibleChildren.length === 0) {
      return null // Don't render parent if no visible children
    }

    if (hasChildren) {
      return (
        <div key={item.title}>
          <button
            onClick={() => toggleMenu(item.title)}
            className={cn(
              'flex items-center justify-between w-full rounded-lg px-3 py-3 text-sm font-medium transition-colors min-h-[44px]',
              hasActiveChild
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
            style={{ paddingLeft: `${12 + level * 16}px` }}
          >
            <div className="flex items-center gap-3 flex-1">
              <Icon className="h-5 w-5 flex-shrink-0" />
              {item.title}
            </div>
            <ChevronRight
              className={cn(
                'h-4 w-4 flex-shrink-0 transition-transform duration-200',
                isExpanded && 'rotate-90'
              )}
            />
          </button>
          {isExpanded && visibleChildren.length > 0 && (
            <div className="mt-1 space-y-1 overflow-hidden animate-in slide-in-from-top-2 duration-200">
              {visibleChildren.map((child) => renderMenuItem(child, level + 1))}
            </div>
          )}
        </div>
      )
    }

    return (
      <NavLink
        key={item.href}
        to={item.href!}
        onClick={handleNavClick}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors min-h-[44px]',
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        )}
        style={{ paddingLeft: `${12 + level * 16}px` }}
      >
        <Icon className="h-5 w-5 flex-shrink-0" />
        {item.title}
      </NavLink>
    )
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
        {visibleItems.map((item) => renderMenuItem(item))}
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
