"use client"

import { formatCurrency, formatDate } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, AlertTriangle, FileText, ExternalLink } from "lucide-react"
import Link from "next/link"

interface GastoPendiente {
  id: string
  fecha: string
  importe: number
  proveedor: { nombre: string } | null
  numero: string | null
}

interface UnpaidExpensesProps {
  gastos: GastoPendiente[]
}

export function UnpaidExpenses({ gastos }: UnpaidExpensesProps) {
  if (gastos.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Gastos Pendientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-green-100 p-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <p className="mt-3 text-sm font-medium">Todo pagado</p>
            <p className="text-xs text-muted-foreground">
              No tienes gastos pendientes de pago
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Gastos Pendientes</CardTitle>
          <Badge variant="outline" className="text-amber-600 bg-amber-50">
            {gastos.length} pendiente{gastos.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {gastos.map((gasto) => (
            <div
              key={gasto.id}
              className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium">{gasto.proveedor?.nombre || "Proveedor desconocido"}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(gasto.fecha)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-bold text-amber-700">
                    {formatCurrency(gasto.importe)}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {gasto.numero || "S/N"}
                  </p>
                </div>
                <Link href={`/gastos/${gasto.id}`} className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function CheckCircle({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}
