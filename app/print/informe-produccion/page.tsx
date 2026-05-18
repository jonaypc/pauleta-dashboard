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
      <div className="max-w-full mx-auto p-6 print:p-4">
        {/* Header */}
        <div className="mb-4 border-b-2 border-gray-900 pb-2">
          <h1 className="text-2xl font-bold text-gray-900 mb-1 print:text-xl">
            INFORME DE PRODUCCIÓN
          </h1>
          <div className="flex justify-between text-xs text-gray-600">
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
        <div className="mb-3">
          <h2 className="text-base font-bold mb-2 text-gray-900 print:text-sm">
            Facturas Origen ({informe.facturas.length})
          </h2>
          <div className="bg-gray-50 p-2 rounded print:p-1">
            <div className="grid grid-cols-4 gap-1 text-xs print:grid-cols-5">
              {informe.facturas.map((factura, idx) => (
                <div key={idx} className="flex items-center gap-1 truncate">
                  <span className="font-mono font-medium text-xs">{factura.numero}</span>
                  <span className="text-gray-500">•</span>
                  <span className="text-gray-600 truncate text-xs">{factura.cliente}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabla de productos */}
        <div className="mb-3">
          <h2 className="text-base font-bold mb-2 text-gray-900 print:text-sm">
            Productos a Producir
          </h2>
          <table className="w-full border-collapse border border-gray-300 text-xs">
            <thead>
              <tr className="bg-gray-900 text-white">
                <th className="border border-gray-300 px-2 py-1 text-left print:px-1 print:py-1">
                  Producto
                </th>
                <th className="border border-gray-300 px-2 py-1 text-center print:px-1 print:py-1">
                  Cantidad
                </th>
                <th className="border border-gray-300 px-2 py-1 text-left print:px-1 print:py-1">
                  Unidad
                </th>
                <th className="border border-gray-300 px-2 py-1 text-left print:px-1 print:py-1">
                  Clientes
                </th>
              </tr>
            </thead>
            <tbody>
              {informe.productos.map((producto, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border border-gray-300 px-2 py-1 print:px-1 print:py-1">
                    <div className="font-semibold text-xs">{producto.nombre}</div>
                    {producto.descripcion !== producto.nombre && (
                      <div className="text-[10px] text-gray-600">
                        {producto.descripcion}
                      </div>
                    )}
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-center font-bold text-sm print:px-1 print:py-1">
                    {producto.cantidad_total}
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-xs print:px-1 print:py-1">
                    {producto.unidad}
                  </td>
                  <td className="border border-gray-300 px-2 py-1 print:px-1 print:py-1">
                    <div className="text-[10px] text-gray-600">
                      {producto.clientes.slice(0, 3).join(', ')}
                      {producto.clientes.length > 3 && ` +${producto.clientes.length - 3}`}
                    </div>
                  </td>
                </tr>
              ))}
              {/* Fila de total */}
              <tr className="bg-gray-900 text-white font-bold">
                <td className="border border-gray-300 px-2 py-1 text-xs print:px-1 print:py-1">
                  TOTAL
                </td>
                <td className="border border-gray-300 px-2 py-1 text-center text-base print:px-1 print:py-1">
                  {informe.total_productos}
                </td>
                <td className="border border-gray-300 px-2 py-1 text-xs print:px-1 print:py-1" colSpan={2}>
                  {informe.productos.length} productos diferentes
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Notas */}
        <div className="bg-gray-50 p-2 rounded mt-3 print:p-1">
          <h3 className="font-semibold text-gray-900 mb-1 text-xs">Notas:</h3>
          <ul className="text-[10px] text-gray-700 space-y-0.5 list-disc list-inside">
            <li>Verificar stock de materias primas antes de iniciar producción</li>
            <li>Revisar fechas de entrega con cada cliente</li>
            <li>Coordinar con el equipo de producción las prioridades</li>
          </ul>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-2 border-t border-gray-300 text-[10px] text-gray-500 text-center">
          <p>Documento generado automáticamente por Pauleta Dashboard</p>
          <p>{formatDate(informe.fecha_generacion)} • Pauleta Canaria S.L.</p>
        </div>
      </div>

      {/* Estilos de impresión */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 1cm;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
            margin: 0 !important;
            padding: 0 !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Ocultar botones en impresión */
          button {
            display: none !important;
          }
          /* Asegurar que la tabla no se corte */
          table {
            page-break-inside: avoid;
          }
          tr {
            page-break-inside: avoid;
          }
          /* Reducir espacios en impresión */
          .print\\:p-4 {
            padding: 0.5rem !important;
          }
          .print\\:p-1 {
            padding: 0.25rem !important;
          }
          .print\\:px-1 {
            padding-left: 0.25rem !important;
            padding-right: 0.25rem !important;
          }
          .print\\:py-1 {
            padding-top: 0.25rem !important;
            padding-bottom: 0.25rem !important;
          }
          .print\\:text-xl {
            font-size: 1.25rem !important;
          }
          .print\\:text-sm {
            font-size: 0.875rem !important;
          }
          .print\\:grid-cols-5 {
            grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
          }
        }
      `}</style>
    </div>
  )
}
