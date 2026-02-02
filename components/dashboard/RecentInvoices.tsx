"use client"

import Link from "next/link"
import { formatCurrency, formatDate, estadoFacturaLabels } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, FileText } from "lucide-react"

interface FacturaResumen {
  id: string
  numero: string
  fecha: string
  total: number
  estado: string
  cliente: { nombre: string } | null
}

interface RecentInvoicesProps {
  facturas: FacturaResumen[]
}

export function RecentInvoices({ facturas }: RecentInvoicesProps) {
  if (facturas.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Últimas facturas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-muted p-3">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="mt-3 text-sm font-medium">No hay facturas aún</p>
            <p className="text-xs text-muted-foreground">
              Las facturas aparecerán aquí cuando las crees
            </p>
            <Button asChild className="mt-4" size="sm">
              <Link href="/facturas/nueva">Crear primera factura</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Últimas facturas</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/facturas" className="gap-1">
            Ver todas
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {facturas.map((factura) => (
            <Link
              key={factura.id}
              href={`/facturas/${factura.id}`}
              className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{factura.numero}</p>
                  <p className="text-xs text-muted-foreground">
                    {factura.cliente?.nombre || "Sin cliente"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-semibold">
                    {formatCurrency(factura.total)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(factura.fecha)}
                  </p>
                </div>
                <Badge
                  variant={factura.estado as "borrador" | "emitida" | "cobrada" | "anulada"}
                  dot
                >
                  {estadoFacturaLabels[factura.estado as keyof typeof estadoFacturaLabels] || factura.estado}
                </Badge>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}