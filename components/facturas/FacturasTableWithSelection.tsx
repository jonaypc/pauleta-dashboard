'use client'

import { useState, useEffect } from 'react'
import { FacturasTable } from './FacturasTable'
import { GenerarInformeProduccionButton } from './GenerarInformeProduccionButton'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Props {
  facturas: any[]
}

export function FacturasTableWithSelection({ facturas }: Props) {
  const [seleccionadas, setSeleccionadas] = useState<string[]>([])

  // Escuchar eventos de selección desde FacturasTable
  useEffect(() => {
    const handleSelectionChange = (e: CustomEvent) => {
      setSeleccionadas(Array.from(e.detail.selectedIds))
    }

    window.addEventListener('facturas-selection-change' as any, handleSelectionChange)
    return () => {
      window.removeEventListener('facturas-selection-change' as any, handleSelectionChange)
    }
  }, [])

  return (
    <div className="space-y-4">
      {/* Barra de acciones para informe de producción */}
      {seleccionadas.length > 0 && (
        <Card className="p-4 bg-green-50 border-green-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-green-900">
                {seleccionadas.length} factura(s) para informe de producción
              </span>
            </div>
            <GenerarInformeProduccionButton facturasSeleccionadas={seleccionadas} />
          </div>
        </Card>
      )}

      {/* Tabla original con todas sus funcionalidades */}
      <FacturasTable facturas={facturas} />
    </div>
  )
}
