"use client"

import { formatCurrency } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, AlertTriangle } from "lucide-react"
import type { PagoFijo } from "@/types"

interface UpcomingPaymentsProps {
  pagos: PagoFijo[]
}

export function UpcomingPayments({ pagos }: UpcomingPaymentsProps) {
  const hoy = new Date().getDate()

  // Filtrar pagos que están próximos (dentro de los próximos 7 días)
  const pagosProximos = pagos.filter((pago) => {
    if (!pago.activo) return false
    const diasRestantes = pago.dia_inicio - hoy
    return diasRestantes >= 0 && diasRestantes <= 7
  })

  // Pagos que ya pasaron pero aún estamos en el rango
  const pagosActivos = pagos.filter((pago) => {
    if (!pago.activo) return false
    return hoy >= pago.dia_inicio && hoy <= pago.dia_fin
  })

  const todosLosPagos = [...pagosActivos, ...pagosProximos]
    .filter((pago, index, self) => 
      index === self.findIndex((p) => p.id === pago.id)
    )
    .slice(0, 5)

  if (todosLosPagos.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pagos próximos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-muted p-3">
              <Calendar className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="mt-3 text-sm font-medium">Sin pagos próximos</p>
            <p className="text-xs text-muted-foreground">
              No hay pagos programados para los próximos 7 días
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Pagos próximos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {todosLosPagos.map((pago) => {
            const diasRestantes = pago.dia_inicio - hoy
            const esHoy = diasRestantes === 0 || (hoy >= pago.dia_inicio && hoy <= pago.dia_fin)
            const esUrgente = diasRestantes <= 2

            return (
              <div
                key={pago.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                      esHoy
                        ? "bg-pauleta-red/10"
                        : esUrgente
                        ? "bg-pauleta-yellow/10"
                        : "bg-muted"
                    }`}
                  >
                    {esUrgente ? (
                      <AlertTriangle
                        className={`h-5 w-5 ${
                          esHoy ? "text-pauleta-red" : "text-pauleta-yellow"
                        }`}
                      />
                    ) : (
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{pago.concepto}</p>
                    <p className="text-xs text-muted-foreground">
                      Días {pago.dia_inicio} - {pago.dia_fin}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-semibold">
                      {pago.variable ? "Variable" : formatCurrency(pago.importe)}
                    </p>
                    {esHoy ? (
                      <Badge variant="destructive" className="text-[10px]">
                        HOY
                      </Badge>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        En {diasRestantes} día{diasRestantes !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
