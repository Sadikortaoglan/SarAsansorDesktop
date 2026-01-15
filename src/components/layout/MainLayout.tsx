import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar, NavigationContent } from './Sidebar'
import { TopBar } from './TopBar'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useIsDesktop } from '@/hooks/useMediaQuery'

export function MainLayout() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const location = useLocation()
  const isDesktop = useIsDesktop()

  // Close drawer on route change
  useEffect(() => {
    setIsDrawerOpen(false)
  }, [location.pathname])

  // Close drawer when switching to desktop
  useEffect(() => {
    if (isDesktop) {
      setIsDrawerOpen(false)
    }
  }, [isDesktop])

  // Prevent body scroll when drawer is open on mobile
  useEffect(() => {
    if (isDrawerOpen && !isDesktop) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isDrawerOpen, isDesktop])

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden w-full lg:w-auto">
        <TopBar onMenuClick={() => setIsDrawerOpen(true)} />
        <main className="flex-1 overflow-y-auto bg-background p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
      
      {/* Mobile Drawer */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent side="left" className="w-[280px] p-0 sm:w-[300px]">
          <SheetHeader className="border-b px-6 py-4">
            <SheetTitle className="text-xl font-bold text-primary">Sara Asansör</SheetTitle>
          </SheetHeader>
          <NavigationContent onNavigate={() => setIsDrawerOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  )
}

