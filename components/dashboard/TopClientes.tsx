"use client"

import Link from "next/link"
import { formatCurrency } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight, Users, Building2 } from "lucide-react"
import type { TopCliente } from "@/types"

interface TopClientesProps {
  clientes: TopCliente[]
}

export function TopClientes({ clientes }: TopClientesProps) {
  if (clientes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Top clientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-muted p-3">
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="mt-3 text-sm font-medium">Sin datos aún</p>
            <p className="text-xs text-muted-foreground">
              Los clientes aparecerán aquí según facturen
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Calcular el máximo para las barras de progreso
  const maxFacturado = Math.max(...clientes.map((c) => c.total_facturado))

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Top clientes</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/clientes" className="gap-1">
            Ver todos
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {clientes.map((cliente, index) => {
            const porcentaje = (cliente.total_facturado / maxFacturado) * 100

            return (
              <div key={cliente.cliente_id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium line-clamp-1">
                        {cliente.nombre}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {cliente.num_facturas} factura
                        {cliente.num_facturas !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold">
                    {formatCurrency(cliente.total_facturado)}
                  </p>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-pauleta-green transition-all duration-500"
                    style={{ width: `${porcentaje}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
