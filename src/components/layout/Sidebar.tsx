import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useQuery } from '@tanstack/react-query'
import { dashboardService } from '@/services/dashboard.service'
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
  Calendar,
  List,
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
        title: 'Bakım İşlemleri',
        icon: Wrench,
        roles: ['PATRON', 'PERSONEL'] as const,
        children: [
          {
            title: 'Bakım Planla',
            href: '/maintenances/plan',
            icon: Calendar,
            roles: ['PATRON', 'PERSONEL'] as const,
          },
          {
            title: 'Bakım Listesi',
            href: '/maintenances/list',
            icon: List,
            roles: ['PATRON', 'PERSONEL'] as const,
          },
          {
            title: 'Bakım Maddeleri Yönet',
            href: '/maintenances/items',
            icon: Settings,
            roles: ['PATRON', 'PERSONEL'] as const,
          },
        ],
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

  // Fetch counts for sidebar badges
  const { data: counts } = useQuery({
    queryKey: ['dashboard', 'counts'],
    queryFn: () => dashboardService.getCounts(),
    refetchInterval: 30000, // Refetch every 30 seconds
  })

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
      // Calculate total badge count for parent menu (sum of all children)
      const totalBadgeCount = counts
        ? visibleChildren.reduce((sum, child) => {
            if (!child.href) return sum
            if (child.href === '/maintenances/plan') return sum + (counts.maintenancePlansUpcoming || 0)
            if (child.href === '/maintenances/completed') return sum + (counts.maintenanceSessionsCompleted || 0)
            if (child.href === '/maintenances/upcoming') return sum + (counts.maintenancePlansUpcoming || 0)
            if (child.href === '/maintenances/items') return sum + (counts.maintenanceTemplates || 0)
            return sum
          }, 0)
        : 0

      return (
        <div key={item.title}>
          <button
            onClick={() => toggleMenu(item.title)}
            className={cn(
              'flex items-center justify-between w-full rounded-lg px-3 py-3 text-sm font-medium transition-all duration-200 min-h-[44px]',
              hasActiveChild
                ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-md border-l-4 border-teal-400'
                : 'text-muted-foreground hover:bg-gradient-to-r hover:from-indigo-50 hover:to-teal-50 hover:text-indigo-700'
            )}
            style={{ paddingLeft: `${12 + level * 16}px` }}
          >
            <div className="flex items-center gap-3 flex-1">
              <Icon className={cn('h-5 w-5 flex-shrink-0 transition-transform', hasActiveChild && 'scale-110')} />
              {item.title}
            </div>
            <div className="flex items-center gap-2">
              {totalBadgeCount > 0 && (
                <span
                  className={cn(
                    'flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold',
                    hasActiveChild
                      ? 'bg-white/20 text-white'
                      : 'bg-indigo-500 text-white'
                  )}
                >
                  {totalBadgeCount > 99 ? '99+' : totalBadgeCount}
                </span>
              )}
              <ChevronRight
                className={cn(
                  'h-4 w-4 flex-shrink-0 transition-transform duration-200',
                  isExpanded && 'rotate-90'
                )}
              />
            </div>
          </button>
          {isExpanded && visibleChildren.length > 0 && (
            <div className="mt-1 space-y-1 overflow-hidden animate-in slide-in-from-top-2 duration-200">
              {visibleChildren.map((child) => renderMenuItem(child, level + 1))}
            </div>
          )}
        </div>
      )
    }

    // Get badge count for specific menu items
    const getBadgeCount = (href: string): number | undefined => {
      if (!counts) return undefined
      if (href === '/maintenances/plan') return counts.maintenancePlansUpcoming
      if (href === '/maintenances/list') return (counts.maintenancePlansUpcoming || 0) + (counts.maintenanceSessionsCompleted || 0)
      if (href === '/maintenances/items') return counts.maintenanceTemplates
      if (href === '/warnings') return counts.warnings
      return undefined
    }

    const badgeCount = getBadgeCount(item.href!)

    return (
      <NavLink
        key={item.href}
        to={item.href!}
        onClick={handleNavClick}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all duration-200 min-h-[44px] relative',
          isActive
            ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-md border-l-4 border-teal-400'
            : 'text-muted-foreground hover:bg-gradient-to-r hover:from-indigo-50 hover:to-teal-50 hover:text-indigo-700'
        )}
        style={{ paddingLeft: `${12 + level * 16}px` }}
      >
        <Icon className={cn('h-5 w-5 flex-shrink-0 transition-transform', isActive && 'scale-110')} />
        <span className="flex-1">{item.title}</span>
        {badgeCount !== undefined && badgeCount > 0 && (
          <span
            className={cn(
              'flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold',
              isActive
                ? 'bg-white/20 text-white'
                : 'bg-indigo-500 text-white'
            )}
          >
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        )}
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
    <aside className="hidden lg:flex h-screen w-64 flex-col border-r bg-gradient-to-b from-white to-indigo-50/30 shadow-lg">
      <div className="flex h-16 items-center border-b border-indigo-200 bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 flex-shrink-0 shadow-md">
        <h1 className="text-xl font-bold text-white drop-shadow-sm">Sara Asansör</h1>
      </div>
      <NavigationContent />
    </aside>
  )
}
