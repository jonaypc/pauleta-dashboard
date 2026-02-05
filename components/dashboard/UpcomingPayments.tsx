"use client"

import { formatCurrency } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, AlertTriangle, CheckCircle } from "lucide-react"
import type { PagoFijo } from "@/types"

// Extend PagoFijo locally if needed or rely on base type, but we need 'pagado' (calculated in parent or here?)
// We will receive a list of "PagosFijos" and we need to know if they are paid.
// Simplest: Parent passes a list of IDs that are paid this month.
interface UpcomingPaymentsProps {
  pagos: PagoFijo[]
  pagadosIds?: string[] // IDs de pagos fijos que ya tienen gasto asociado este mes
}

export function UpcomingPayments({ pagos, pagadosIds = [] }: UpcomingPaymentsProps) {
  const hoy = new Date().getDate()

  // Filtrar pagos que están próximos (dentro de los próximos 7 días)
  const pagosProximos = pagos.filter((pago) => {
    if (!pago.activo) return false
    const diasRestantes = pago.dia_inicio - hoy
    return diasRestantes >= 0 && diasRestantes <= 7
  })

  // Pagos que ya pasaron pero aún estamos en el rango (dia_inicio <= hoy <= dia_fin)
  const pagosActivos = pagos.filter((pago) => {
    if (!pago.activo) return false
    // Si ya pasó el día fin, ya no es "activo" para mostrar como alerta, salvo que no esté pagado?
    // Mostramos los que están en periodo de pago
    return hoy >= pago.dia_inicio && hoy <= pago.dia_fin
  })

  // Unir y eliminar duplicados
  let todosLosPagos = [...pagosActivos, ...pagosProximos]
    .filter((pago, index, self) =>
      index === self.findIndex((p) => p.id === pago.id)
    )

  // Opcional: Mostrar los ya pagados al final o con check?
  // Si está pagado, lo mostramos verde

  // Ordenar: No pagados urgentes primero
  todosLosPagos.sort((a, b) => {
    const aPaid = pagadosIds.includes(a.id)
    const bPaid = pagadosIds.includes(b.id)
    if (aPaid && !bPaid) return 1
    if (!aPaid && bPaid) return -1
    return (a.dia_inicio - hoy) - (b.dia_inicio - hoy)
  })

  todosLosPagos = todosLosPagos.slice(0, 5)

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
              No hay pagos pendientes para los próximos 7 días
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Pagos del mes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {todosLosPagos.map((pago) => {
            const diasRestantes = pago.dia_inicio - hoy
            const esHoy = diasRestantes === 0 || (hoy >= pago.dia_inicio && hoy <= pago.dia_fin)
            const esUrgente = diasRestantes <= 2
            const estaPagado = pagadosIds.includes(pago.id)

            return (
              <div
                key={pago.id}
                className={`flex items-center justify-between rounded-lg border p-3 ${estaPagado ? "bg-green-50 border-green-100" : ""
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${estaPagado
                        ? "bg-green-100 text-green-600"
                        : esHoy
                          ? "bg-red-50 text-red-600"
                          : esUrgente
                            ? "bg-yellow-50 text-yellow-600"
                            : "bg-muted text-muted-foreground"
                      }`}
                  >
                    {estaPagado ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : esUrgente ? (
                      <AlertTriangle className="h-5 w-5" />
                    ) : (
                      <Calendar className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${estaPagado ? "text-green-900" : ""}`}>{pago.concepto}</p>
                    <p className="text-xs text-muted-foreground">
                      {estaPagado ? "Pagado este mes" : `Vence el día ${pago.dia_fin}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-semibold">
                      {pago.variable ? "Variable" : formatCurrency(pago.importe)}
                    </p>
                    {!estaPagado && (
                      <>
                        {esHoy ? (
                          <Badge variant="destructive" className="text-[10px]">
                            HOY
                          </Badge>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            En {diasRestantes} día{diasRestantes !== 1 ? "s" : ""}
                          </p>
                        )}
                      </>
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
