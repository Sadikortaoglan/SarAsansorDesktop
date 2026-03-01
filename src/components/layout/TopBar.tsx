import { useAuth } from '@/contexts/AuthContext'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { LogOut, Menu, UserRound } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { menuItems } from './Sidebar'
import './TopBar.css'

interface TopBarProps {
  onMenuClick?: () => void
}

const subtitleByTitle: Record<string, string> = {
  Dashboard: 'Operasyon özetini ve güncel metrikleri takip edin.',
  'Ana Sayfa': 'Operasyon özetini ve güncel metrikleri takip edin.',
  Asansörler: 'Asansör kayıtlarını görüntüleyin ve yönetin.',
  Denetimler: 'Denetim kayıtlarını inceleyin ve güncelleyin.',
  'Revizyon Teklifleri': 'Teklif süreçlerini düzenli ve hızlı yönetin.',
}

function resolveCurrentPage(pathname: string) {
  const allItems = menuItems.flatMap((item) => [item, ...(item.children || [])])

  let current = allItems.find((item) => item.href === pathname)
  if (current) return current

  current = allItems
    .filter((item) => item.href && pathname.startsWith(`${item.href}/`))
    .sort((a, b) => (b.href?.length || 0) - (a.href?.length || 0))[0]

  return current || null
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const { user, logout } = useAuth()
  const location = useLocation()

  const currentPage = resolveCurrentPage(location.pathname)
  const pageTitle = currentPage?.title || 'Yönetim Paneli'
  const pageSubtitle = subtitleByTitle[pageTitle] || 'Kayıtları görüntüleyin, filtreleyin ve yönetim aksiyonlarını uygulayın.'

  return (
    <header className="topbar">
      <div className="topbar__left">
        <Button
          variant="ghost"
          size="icon"
          className="topbar__menu-button"
          onClick={onMenuClick}
          aria-label="Menu"
        >
          <Menu className="topbar__menu-icon" />
        </Button>
        <div className="topbar__text">
          <h1 className="topbar__title">{pageTitle}</h1>
          <p className="topbar__subtitle">{pageSubtitle}</p>
        </div>
      </div>

      <div className="topbar__right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="topbar__action-button" type="button">
              <UserRound className="topbar__action-icon" />
              <span className="topbar__action-label">{user?.username || 'Profil'}</span>
              <Avatar className="topbar__avatar">
                <AvatarFallback className="topbar__avatar-fallback">
                  {user?.username?.substring(0, 2).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">{user?.username}</p>
                <p className="text-xs leading-none text-muted-foreground">{user?.role}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Çıkış Yap</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
