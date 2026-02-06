"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  Receipt,
  Calendar,
  BarChart3,
  Settings,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
} from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"

const navigation = [
  {
    name: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    name: "Clientes",
    href: "/clientes",
    icon: Users,
  },
  {
    name: "Productos",
    href: "/productos",
    icon: Package,
  },
  {
    name: "Facturas",
    href: "/facturas",
    icon: FileText,
  },
  {
    name: "Cobros",
    href: "/cobros",
    icon: CreditCard,
  },
  {
    name: "Tesorería",
    href: "/tesoreria",
    icon: CreditCard,
  },
  {
    name: "Gastos",
    href: "/gastos",
    icon: Receipt,
  },
  {
    name: "Pagos Fijos",
    href: "/pagos-fijos",
    icon: Calendar,
  },
  {
    name: "Informes",
    href: "/informes",
    icon: BarChart3,
  },
  {
    name: "Relación Facturas",
    href: "/informes/relacion-facturas",
    icon: ClipboardList,
  },
  {
    name: "Configuración",
    href: "/configuracion",
    icon: Settings,
  },
]

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r bg-card transition-all duration-300",
        collapsed ? "w-[70px]" : "w-64",
        className
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white overflow-hidden border">
            <Image
              src="/logo.png"
              alt="Pauleta Logo"
              width={36}
              height={36}
              className="h-full w-full object-contain"
              unoptimized
            />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-lg font-bold text-foreground">Pauleta</span>
              <span className="text-[10px] text-muted-foreground -mt-1">Canaria S.L.</span>
            </div>
          )}
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 p-3">
        {navigation.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href))

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all hover:bg-accent",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? item.name : undefined}
            >
              {item.icon && <item.icon className={cn("h-5 w-5 flex-shrink-0", isActive && "text-primary")} />}
              {!collapsed && <span>{item.name}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="absolute bottom-0 left-0 right-0 border-t p-4">
          <div className="rounded-lg bg-gradient-to-br from-primary/10 to-pauleta-green/10 p-3">
            <p className="text-xs font-medium text-foreground">Versión 1.0</p>
            <p className="text-[10px] text-muted-foreground">
              © 2025 Pauleta Canaria
            </p>
          </div>
        </div>
      )}
    </aside>
  )
}
