"use client"

import { useState } from "react"
import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { cn } from "@/lib/utils"

interface DashboardLayoutProps {
  children: React.ReactNode
  user?: {
    email?: string
    nombre?: string
  }
}

export function DashboardLayout({ children, user }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="pauleta-app min-h-screen bg-background">
      {/* Sidebar para desktop */}
      <Sidebar className="hidden lg:flex" />

      {/* Sidebar móvil con overlay */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <Sidebar className="lg:hidden z-50" onNavigate={() => setSidebarOpen(false)} />
        </>
      )}

      {/* Main content */}
      <div className="lg:pl-64">
        <Header user={user} onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
