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

// Debugging simplified layout
export function DashboardLayout({ children, user }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="border border-red-500 p-4 mb-4">
        <h2 className="text-red-500 font-bold">Debug Layout Active</h2>
        <p>If you see this, Sidebar/Header were the issue.</p>
        <p>User: {user?.email}</p>
      </div>
      {children}
    </div>
  )
}
