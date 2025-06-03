"use client";
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-provider";
import { cn } from "@/lib/utils";
import { useMobile } from "@/hooks/use-mobile";
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
  Heart,
  Activity,
  Zap,
} from "lucide-react";
import { ThemeToggle } from "./ui/ThemeToggle";

export function Sidebar() {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const [open, setOpen] = useState(false);
  const isMobile = useMobile();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Cerrar sidebar cuando se hace clic fuera (móvil)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const sidebar = document.getElementById("mobile-sidebar");
      const toggleButton = document.getElementById("sidebar-toggle");
      const target = event.target as Node;
      if (
        sidebar &&
        open &&
        !sidebar.contains(target) &&
        toggleButton &&
        !toggleButton.contains(target)
      ) {
        setOpen(false);
      }
    };

    if (isMobile) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isMobile, open]);

  const toggleSidebar = () => setOpen(!open);

  // Menú por rol
  const sidebarItems =
    user?.role === "CAREGIVER"
      ? [
          {
            title: "Panel Principal",
            href: "/dashboard/caregiver",
            icon: <Home className="h-5 w-5" />,
          },
          {
            title: "Configuración",
            href: "/dashboard/settings",
            icon: <Settings className="h-5 w-5" />,
          },
        ]
      : [
          {
            title: "Panel Principal",
            href: "/dashboard",
            icon: <Home className="h-5 w-5" />,
          },
          {
            title: "Perfil",
            href: "/dashboard/profile",
            icon: <User className="h-5 w-5" />,
          },
          {
            title: "Calendario",
            href: "/dashboard/calendar",
            icon: <Calendar className="h-5 w-5" />,
          },
          {
            title: "Medicamentos",
            href: "/dashboard/medications",
            icon: <Pill className="h-5 w-5" />,
          },
          {
            title: "Citas",
            href: "/dashboard/appointments",
            icon: <Calendar className="h-5 w-5" />,
          },
          {
            title: "Tratamientos",
            href: "/dashboard/treatments",
            icon: <ClipboardList className="h-5 w-5" />,
          },
          {
            title: "Configuración",
            href: "/dashboard/settings",
            icon: <Settings className="h-5 w-5" />,
          },
        ];

  return (
    <>
      {isMobile && (
        <div className="flex h-16 items-center border-b border-white/10 px-4 bg-white/80 backdrop-blur-sm">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="text-slate-600"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="ml-3 flex items-center">
            <div className="mr-2 relative">
              <div className="flex items-center justify-center h-6 rounded-full shadow-lg">
                <img
                  src="/img/logo-cur.webp"
                  alt="Logo-curabyte"
                  className="flex w-9 h-9 rounded-lg"
                />
              </div>
            </div>
            <span className="text-lg font-bold bg-gradient-medical bg-clip-text text-transparent">
              RecuerdaMed
            </span>
          </div>
        </div>
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col sidebar-gradient border-r border-white/10 transition-transform duration-300 md:static md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header del sidebar */}
        <div className="flex h-16 items-center border-b border-white/10 px-6">
          <div className="flex items-center">
           <div className="mr-2 relative">
              <div className="flex items-center justify-center h-6 rounded-full shadow-lg">
                <img
                  src="/img/logo-cur.webp"
                  alt="Logo-curabyte"
                  className="flex w-9 h-9 rounded-lg"
                />
              </div>
            </div>
            <div>
              <span className="text-lg font-bold text-white">RecuerdaMed</span>
              <p className="text-xs text-slate-300">Salud inteligente</p>
            </div>
          </div>
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto text-white hover:bg-white/10"
              onClick={toggleSidebar}
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Navegación */}
        <nav className="flex-1 overflow-auto p-4">
          <ul className="space-y-2">
            {sidebarItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start h-12 px-4 text-left transition-all duration-200",
                      isActive
                        ? "bg-white/20 text-white shadow-inner-light backdrop-blur-sm"
                        : "text-slate-300 hover:bg-white/10 hover:text-white"
                    )}
                    asChild
                  >
                    <Link href={item.href} className="flex items-center">
                      <div
                        className={cn(
                          "mr-3 p-2 rounded-lg transition-all duration-200",
                          isActive
                            ? "bg-white/20 text-white"
                            : "bg-white/10 text-slate-300 group-hover:bg-white/20"
                        )}
                      >
                        {item.icon}
                      </div>
                      <span className="font-medium">{item.title}</span>
                      {isActive && (
                        <div className="ml-auto">
                          <Activity className="h-4 w-4 animate-pulse-soft" />
                        </div>
                      )}
                    </Link>
                  </Button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer del sidebar */}
        <div className="border-t border-white/10 p-4">
          <Button
            variant="ghost"
            className="w-full justify-start h-12 px-4 text-red-300 hover:bg-red-500/20 hover:text-red-200 transition-all duration-200"
            onClick={logout}
          >
            <div className="mr-3 p-2 rounded-lg bg-red-500/20">
              <LogOut className="h-4 w-4" />
            </div>
            <span className="font-medium">Cerrar Sesión</span>
          </Button>
        </div>
      </aside>

      {open && isMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={toggleSidebar}
        />
      )}
    </>
  );
}
