"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth-provider'
import { cn } from '@/lib/utils'
import { useMobile } from '@/hooks/use-mobile'
import {
  Calendar,
  ClipboardList,
  Home,
  LogOut,
  Menu,
  Pill,
  Settings,
  User,
  X,
  FileText
} from 'lucide-react'
import { ThemeToggle } from './ui/ThemeToggle'

export function Sidebar() {
  const pathname = usePathname()
  const { logout, user } = useAuth()
  const [open, setOpen] = useState(false)
  const isMobile = useMobile()

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // Cerrar sidebar cuando se hace clic fuera (móvil)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const sidebar = document.getElementById('mobile-sidebar')
      const toggleButton = document.getElementById('sidebar-toggle')
      const target = event.target as Node
      if (
        sidebar &&
        open &&
        !sidebar.contains(target) &&
        toggleButton &&
        !toggleButton.contains(target)
      ) {
        setOpen(false)
      }
    }

    if (isMobile) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isMobile, open])

  const toggleSidebar = () => setOpen(!open)

  // Menú por rol
  const sidebarItems =
    user?.role === 'CAREGIVER'
      ? [
          { title: 'Panel Principal', href: '/dashboard/caregiver', icon: <Home className="h-5 w-5" /> },
          {
            title: 'Calendario',
            href: '/dashboard/caregiver/calendar',
            icon: <Calendar className="h-5 w-5" />,
            show: user?.permissions?.viewMedications || user?.permissions?.viewAppointments
          },
          {
            title: 'Medicamentos',
            href: '/dashboard/caregiver/medications',
            icon: <Pill className="h-5 w-5" />,
            show: user?.permissions?.viewMedications
          },
          {
            title: 'Citas',
            href: '/dashboard/caregiver/appointments',
            icon: <Calendar className="h-5 w-5" />,
            show: user?.permissions?.viewAppointments
          },
          {
            title: 'Tratamientos',
            href: '/dashboard/caregiver/treatments',
            icon: <ClipboardList className="h-5 w-5" />,
            show: user?.permissions?.viewTreatments
          },
          { title: 'Configuración', href: '/dashboard/settings', icon: <Settings className="h-5 w-5" /> }
        ]
      : [
          { title: 'Panel Principal', href: '/dashboard', icon: <Home className="h-5 w-5" /> },
          { title: 'Perfil', href: '/dashboard/profile', icon: <User className="h-5 w-5" /> },
          { title: 'Calendario', href: '/dashboard/calendar', icon: <Calendar className="h-5 w-5" /> },
          { title: 'Medicamentos', href: '/dashboard/medications', icon: <Pill className="h-5 w-5" /> },
          { title: 'Citas', href: '/dashboard/appointments', icon: <Calendar className="h-5 w-5" /> },
          { title: 'Tratamientos', href: '/dashboard/treatments', icon: <ClipboardList className="h-5 w-5" /> },
          { title: 'Configuración', href: '/dashboard/settings', icon: <Settings className="h-5 w-5" /> }
        ]

  return (
    <>
      {isMobile && (
        <div className="sticky top-0 z-40 flex h-14 items-center border-b bg-background px-4">
          <Button variant="ghost" size="icon" onClick={toggleSidebar} id="sidebar-toggle" aria-label="Abrir menú">
            <Menu className="h-5 w-5" />
          </Button>
          <span className="ml-2 text-lg font-semibold">Agenda Médica</span>
        </div>
      )}

      <aside
        id="mobile-sidebar"
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[80%] max-w-[280px] flex-col border-r bg-background transition-transform duration-300 md:static md:w-64 md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-14 items-center border-b px-4">
          <span className="text-lg font-semibold">Agenda Médica</span>
          {isMobile && (
            <Button variant="ghost" size="icon" className="ml-auto" onClick={toggleSidebar} aria-label="Cerrar menú">
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
        <nav className="flex-1 overflow-auto p-2">
          <ul className="space-y-1">
              <ThemeToggle />

            {sidebarItems
              .filter((i) => i.show !== false)
              .map((item) => (
                <li key={item.href}>
                  <Button variant={pathname === item.href ? 'secondary' : 'ghost'} className="w-full justify-start" asChild>
                    <Link href={item.href}>
                      {item.icon}
                      <span className="ml-2">{item.title}</span>
                    </Link>
                  </Button>
                </li>
              ))}
          </ul>
        </nav>
        <div className="border-t p-2">
          <Button variant="ghost" className="w-full justify-start text-destructive" onClick={logout}>
            <LogOut className="mr-2 h-5 w-5" />
            Cerrar Sesión
          </Button>
        </div>
      </aside>

      {open && isMobile && <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm" onClick={toggleSidebar} />}
    </>
  )
}