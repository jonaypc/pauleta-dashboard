import { getInformesProduccion } from '@/lib/actions/informes-produccion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { FileText, Eye, Trash2, Calendar, Package } from 'lucide-react'
import { EliminarInformeButton } from '@/components/produccion/EliminarInformeButton'

export const metadata = {
  title: 'Histórico de Informes de Producción',
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

export default async function InformesProduccionPage() {
  const result = await getInformesProduccion()

  if (result.error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Informes de Producción</h1>
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">Error: {result.error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const informes = result.data || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-7 w-7 text-primary" />
            Histórico de Informes de Producción
          </h1>
          <p className="text-muted-foreground">
            Consulta informes generados desde facturas
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/facturas">
            Generar Nuevo Informe
          </Link>
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Informes</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{informes.length}</div>
            <p className="text-xs text-muted-foreground">
              Informes generados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Este Mes</CardTitle>
            <Calendar className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {informes.filter((i: any) => {
                const fecha = new Date(i.fecha_generacion)
                const hoy = new Date()
                return fecha.getMonth() === hoy.getMonth() &&
                       fecha.getFullYear() === hoy.getFullYear()
              }).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Informes del mes actual
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Productos Totales</CardTitle>
            <Package className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(informes.reduce((sum: number, i: any) => sum + (i.cantidad_total || 0), 0))}
            </div>
            <p className="text-xs text-muted-foreground">
              Unidades consolidadas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Informes */}
      <Card>
        <CardHeader>
          <CardTitle>Listado de Informes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Número
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Fecha Generación
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                    Facturas
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                    Productos
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    Cantidad Total
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {informes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No hay informes generados</h3>
                      <p className="text-muted-foreground mb-4">
                        Ve a Facturas y selecciona algunas para generar tu primer informe
                      </p>
                      <Button asChild>
                        <Link href="/facturas">
                          Ir a Facturas
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ) : (
                  informes.map((informe: any) => (
                    <tr
                      key={informe.id}
                      className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-mono text-sm font-medium text-primary">
                          {informe.numero}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(informe.fecha_generacion)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="outline" className="text-xs">
                          {informe.num_facturas} fact.
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="outline" className="text-xs">
                          {informe.num_productos} prod.
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">
                        {formatNumber(informe.cantidad_total)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/produccion/informes/${informe.id}`}>
                              <Eye className="h-4 w-4 mr-1" />
                              Ver
                            </Link>
                          </Button>
                          <EliminarInformeButton informeId={informe.id} />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
