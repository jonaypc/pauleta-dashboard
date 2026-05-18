'use client'

import { useState } from 'react'
import { FacturasTable } from './FacturasTable'
import { GenerarInformeProduccionButton } from './GenerarInformeProduccionButton'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'

interface Props {
  facturas: any[]
}

export function FacturasTableWithSelection({ facturas }: Props) {
  const [seleccionadas, setSeleccionadas] = useState<string[]>([])

  const toggleFactura = (id: string) => {
    setSeleccionadas(prev =>
      prev.includes(id)
        ? prev.filter(f => f !== id)
        : [...prev, id]
    )
  }

  const toggleTodas = () => {
    if (seleccionadas.length === facturas.length) {
      setSeleccionadas([])
    } else {
      setSeleccionadas(facturas.map(f => f.id))
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const getEstadoBadge = (estado: string) => {
    const colores: Record<string, string> = {
      borrador: 'bg-gray-100 text-gray-700',
      emitida: 'bg-blue-100 text-blue-700',
      cobrada: 'bg-green-100 text-green-700',
      anulada: 'bg-red-100 text-red-700',
    }
    return (
      <Badge className={colores[estado] || 'bg-gray-100'}>
        {estado.charAt(0).toUpperCase() + estado.slice(1)}
      </Badge>
    )
  }

  return (
    <div className="space-y-4">
      {/* Barra de acciones */}
      {seleccionadas.length > 0 && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">
                {seleccionadas.length} factura(s) seleccionada(s)
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSeleccionadas([])}
              >
                Limpiar selección
              </Button>
            </div>
            <GenerarInformeProduccionButton facturasSeleccionadas={seleccionadas} />
          </div>
        </Card>
      )}

      {/* Tabla */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left">
                  <Checkbox
                    checked={seleccionadas.length === facturas.length && facturas.length > 0}
                    onCheckedChange={toggleTodas}
                  />
                </th>
                <th className="px-4 py-3 text-left font-medium">Número</th>
                <th className="px-4 py-3 text-left font-medium">Cliente</th>
                <th className="px-4 py-3 text-left font-medium">Fecha</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
                <th className="px-4 py-3 text-center font-medium">Estado</th>
                <th className="px-4 py-3 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {facturas.map((factura) => (
                <tr
                  key={factura.id}
                  className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <Checkbox
                      checked={seleccionadas.includes(factura.id)}
                      onCheckedChange={() => toggleFactura(factura.id)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/facturas/${factura.id}`}
                      className="font-mono text-sm font-medium text-primary hover:underline"
                    >
                      {factura.numero}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{factura.cliente?.nombre}</div>
                    {factura.cliente?.persona_contacto && (
                      <div className="text-xs text-muted-foreground">
                        {factura.cliente.persona_contacto}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(factura.fecha)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">
                    {formatCurrency(factura.total)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {getEstadoBadge(factura.estado)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/facturas/${factura.id}`}>Ver</Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
