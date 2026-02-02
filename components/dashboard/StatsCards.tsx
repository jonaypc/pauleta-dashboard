"use client"

import { 
  TrendingUp, 
  TrendingDown, 
  Euro, 
  FileText, 
  Clock, 
  Users 
} from "lucide-react"
import { cn, formatCurrency, calculatePercentageChange } from "@/lib/utils"

interface StatCardProps {
  title: string
  value: string | number
  description?: string
  icon: React.ReactNode
  trend?: {
    value: number
    label: string
  }
  color?: "blue" | "green" | "yellow" | "red"
}

function StatCard({ title, value, description, icon, trend, color = "blue" }: StatCardProps) {
  const colorClasses = {
    blue: "text-primary",
    green: "text-pauleta-green",
    yellow: "text-pauleta-yellow",
    red: "text-pauleta-red",
  }

  const bgClasses = {
    blue: "bg-primary/10",
    green: "bg-pauleta-green/10",
    yellow: "bg-pauleta-yellow/10",
    red: "bg-pauleta-red/10",
  }

  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        <div className={cn("rounded-lg p-2.5", bgClasses[color])}>
          <div className={cn("h-5 w-5", colorClasses[color])}>
            {icon}
          </div>
        </div>
      </div>
      
      {trend && (
        <div className="mt-4 flex items-center gap-1.5">
          {trend.value >= 0 ? (
            <TrendingUp className="h-4 w-4 text-pauleta-green" />
          ) : (
            <TrendingDown className="h-4 w-4 text-pauleta-red" />
          )}
          <span
            className={cn(
              "text-sm font-medium",
              trend.value >= 0 ? "text-pauleta-green" : "text-pauleta-red"
            )}
          >
            {trend.value >= 0 ? "+" : ""}
            {trend.value}%
          </span>
          <span className="text-sm text-muted-foreground">{trend.label}</span>
        </div>
      )}
    </div>
  )
}

interface StatsCardsProps {
  facturacionMes: number
  facturacionMesAnterior: number
  cobrosPendientes: number
  facturasEmitidas: number
  totalClientes: number
}

export function StatsCards({
  facturacionMes,
  facturacionMesAnterior,
  cobrosPendientes,
  facturasEmitidas,
  totalClientes,
}: StatsCardsProps) {
  const porcentajeCambio = calculatePercentageChange(facturacionMes, facturacionMesAnterior)

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Facturación del mes"
        value={formatCurrency(facturacionMes)}
        icon={<Euro className="h-5 w-5" />}
        color="green"
        trend={{
          value: porcentajeCambio,
          label: "vs mes anterior",
        }}
      />
      <StatCard
        title="Pendiente de cobro"
        value={formatCurrency(cobrosPendientes)}
        description="Facturas emitidas sin cobrar"
        icon={<Clock className="h-5 w-5" />}
        color="yellow"
      />
      <StatCard
        title="Facturas este mes"
        value={facturasEmitidas}
        description="Facturas emitidas"
        icon={<FileText className="h-5 w-5" />}
        color="blue"
      />
      <StatCard
        title="Clientes activos"
        value={totalClientes}
        description="Clientes con facturas"
        icon={<Users className="h-5 w-5" />}
        color="blue"
      />
    </div>
  )
}
