'use client'

import { useEffect, useState } from 'react'
import { InformeProduccionFacturas } from '@/lib/actions/informes-produccion'
import { Button } from '@/components/ui/button'
import { Printer, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function InformeProduccionPrintPage() {
  const [informe, setInforme] = useState<InformeProduccionFacturas | null>(null)
  const router = useRouter()

  useEffect(() => {
    const data = sessionStorage.getItem('informe_produccion')
    if (data) {
      setInforme(JSON.parse(data))
    }
  }, [])

  const handlePrint = () => {
    window.print()
  }

  const handleBack = () => {
    router.back()
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  if (!informe) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Cargando informe...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Botones de acción - solo en pantalla */}
      <div className="print:hidden fixed top-4 right-4 flex gap-2 z-10">
        <Button onClick={handleBack} variant="outline" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <Button onClick={handlePrint} size="sm">
          <Printer className="h-4 w-4 mr-2" />
          Imprimir
        </Button>
      </div>

      {/* Contenido para imprimir */}
      <div className="max-w-4xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8 border-b-2 border-gray-900 pb-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            INFORME DE PRODUCCIÓN
          </h1>
          <div className="flex justify-between text-sm text-gray-600">
            <div>
              <p className="font-semibold">Pauleta Canaria S.L.</p>
              <p>CIF: B70853163</p>
            </div>
            <div className="text-right">
              <p className="font-semibold">Fecha de generación:</p>
              <p>{formatDate(informe.fecha_generacion)}</p>
            </div>
          </div>
        </div>

        {/* Facturas origen */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-3 text-gray-900">
            Facturas Origen ({informe.facturas.length})
          </h2>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-3 gap-2 text-sm">
              {informe.facturas.map((factura, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="font-mono font-medium">{factura.numero}</span>
                  <span className="text-gray-500">•</span>
                  <span className="text-gray-600 truncate">{factura.cliente}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabla de productos */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-3 text-gray-900">
            Productos a Producir
          </h2>
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-900 text-white">
                <th className="border border-gray-300 px-4 py-3 text-left">
                  Producto
                </th>
                <th className="border border-gray-300 px-4 py-3 text-center">
                  Cantidad Total
                </th>
                <th className="border border-gray-300 px-4 py-3 text-left">
                  Unidad
                </th>
                <th className="border border-gray-300 px-4 py-3 text-left">
                  Clientes
                </th>
              </tr>
            </thead>
            <tbody>
              {informe.productos.map((producto, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border border-gray-300 px-4 py-3">
                    <div className="font-semibold">{producto.nombre}</div>
                    {producto.descripcion !== producto.nombre && (
                      <div className="text-xs text-gray-600">
                        {producto.descripcion}
                      </div>
                    )}
                  </td>
                  <td className="border border-gray-300 px-4 py-3 text-center font-bold text-lg">
                    {producto.cantidad_total}
                  </td>
                  <td className="border border-gray-300 px-4 py-3">
                    {producto.unidad}
                  </td>
                  <td className="border border-gray-300 px-4 py-3">
                    <div className="text-sm text-gray-600">
                      {producto.clientes.slice(0, 3).join(', ')}
                      {producto.clientes.length > 3 && ` +${producto.clientes.length - 3} más`}
                    </div>
                  </td>
                </tr>
              ))}
              {/* Fila de total */}
              <tr className="bg-gray-900 text-white font-bold">
                <td className="border border-gray-300 px-4 py-3">
                  TOTAL
                </td>
                <td className="border border-gray-300 px-4 py-3 text-center text-xl">
                  {informe.total_productos}
                </td>
                <td className="border border-gray-300 px-4 py-3" colSpan={2}>
                  {informe.productos.length} productos diferentes
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Notas */}
        <div className="bg-gray-50 p-4 rounded-lg mt-8">
          <h3 className="font-semibold text-gray-900 mb-2">Notas:</h3>
          <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
            <li>Verificar stock de materias primas antes de iniciar producción</li>
            <li>Revisar fechas de entrega con cada cliente</li>
            <li>Coordinar con el equipo de producción las prioridades</li>
          </ul>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-4 border-t border-gray-300 text-xs text-gray-500 text-center">
          <p>Documento generado automáticamente por Pauleta Dashboard</p>
          <p>{formatDate(informe.fecha_generacion)} • Pauleta Canaria S.L.</p>
        </div>
      </div>

      {/* Estilos de impresión */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 1.5cm;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  )
}
