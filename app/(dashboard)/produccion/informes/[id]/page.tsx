import { getInformeProduccion } from '@/lib/actions/informes-produccion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { ArrowLeft, Printer, Calendar, Package, FileText } from 'lucide-react'
import { notFound } from 'next/navigation'

interface PageProps {
  params: { id: string }
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num)
}

export default async function InformeProduccionDetallePage({ params }: PageProps) {
  const result = await getInformeProduccion(params.id)

  if (result.error || !result.data) {
    notFound()
  }

  const informe = result.data

  const handlePrint = () => {
    // Guardar en sessionStorage para la página de impresión
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('informe_produccion', JSON.stringify(informe))
      window.open('/print/informe-produccion', '_blank')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/produccion/informes">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Volver
              </Link>
            </Button>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Informe {informe.numero}
          </h1>
          <p className="text-muted-foreground">
            Generado el {formatDate(informe.fecha_generacion)}
          </p>
        </div>
        <Button asChild>
          <Link href="/print/informe-produccion" onClick={(e) => {
            e.preventDefault()
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('informe_produccion', JSON.stringify(informe))
              window.open('/print/informe-produccion', '_blank')
            }
          }}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Link>
        </Button>
      </div>

      {/* Resumen */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Facturas</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{informe.facturas.length}</div>
            <p className="text-xs text-muted-foreground">
              Facturas origen
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Productos</CardTitle>
            <Package className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{informe.productos.length}</div>
            <p className="text-xs text-muted-foreground">
              Productos diferentes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cantidad Total</CardTitle>
            <Package className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(informe.total_productos)}</div>
            <p className="text-xs text-muted-foreground">
              Unidades totales
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Facturas Origen */}
      <Card>
        <CardHeader>
          <CardTitle>Facturas Origen ({informe.facturas.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {informe.facturas.map((factura, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                <span className="font-mono font-medium">{factura.numero}</span>
                <span className="text-gray-500">•</span>
                <span className="text-gray-600 truncate">{factura.cliente}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Productos */}
      <Card>
        <CardHeader>
          <CardTitle>Productos a Producir</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Producto
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                    Cantidad
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Unidad
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Clientes
                  </th>
                </tr>
              </thead>
              <tbody>
                {informe.productos.map((producto, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold">{producto.nombre}</div>
                      {producto.descripcion !== producto.nombre && (
                        <div className="text-xs text-muted-foreground">
                          {producto.descripcion}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant="secondary" className="font-bold text-base">
                        {formatNumber(producto.cantidad_total)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {producto.unidad}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-muted-foreground">
                        {producto.clientes.slice(0, 3).join(', ')}
                        {producto.clientes.length > 3 && ` +${producto.clientes.length - 3} más`}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
