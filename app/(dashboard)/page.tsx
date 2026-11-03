import { getDashboardData } from "@/lib/dashboard-data"
import { StatsCards } from "@/components/dashboard/StatsCards"
import { RecentInvoices } from "@/components/dashboard/RecentInvoices"
import { UnpaidExpenses } from "@/components/dashboard/UpcomingPayments"
import { TopClientes } from "@/components/dashboard/TopClientes"
import { FinancialSummary } from "@/components/dashboard/FinancialSummary"
import { ComparisonChart } from "@/components/dashboard/ComparisonChart"
import { TreasuryKPIs } from "@/components/dashboard/TreasuryKPIs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { Plus, TrendingUp, Package, Clock, FileText } from "lucide-react"
import { getTreasuryStats } from "@/lib/actions/tesoreria"

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const [data, treasuryStats] = await Promise.all([
    getDashboardData(),
    getTreasuryStats().catch(error => {
      console.error("Error loading treasury stats:", error)
      return {
        saldoActual: 0,
        ingresosPendientes: 0,
        gastosPendientes: 0,
        proyeccion30dias: 0,
        movimientosSinConciliar: 0,
        ultimaActualizacion: new Date().toISOString(),
      }
    }),
  ])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Resumen de la actividad de Pauleta Canaria
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/facturas/nueva">
              <Plus className="mr-2 h-4 w-4" />
              Nueva factura
            </Link>
          </Button>
        </div>
      </div>

      {/* Resumen Financiero (Ingresos vs Gastos) */}
      <FinancialSummary
        ingresos={data.facturacionMes}
        gastosFijos={data.totalGastosFijos}
        gastosVariables={data.totalGastosVariables}
        mes={data.nombreMes}
      />

      <StatsCards
        facturacionMes={data.facturacionMes}
        facturacionMesAnterior={data.facturacionMesAnterior}
        cobrosPendientes={data.cobrosPendientes}
        cobrosMes={data.cobrosMes}
        facturasEmitidas={data.facturasEmitidas}
        totalClientes={data.totalClientes}
      />

      {/* Métricas de Tesorería */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Tesorería y Liquidez</h2>
          <Button variant="outline" size="sm" asChild>
            <Link href="/tesoreria">Ver detalles</Link>
          </Button>
        </div>
        <TreasuryKPIs
          saldoActual={treasuryStats.saldoActual}
          ingresosPendientes={treasuryStats.ingresosPendientes}
          gastosPendientes={treasuryStats.gastosPendientes}
          proyeccion30dias={treasuryStats.proyeccion30dias}
          movimientosSinConciliar={treasuryStats.movimientosSinConciliar}
        />
      </div>

      {/* Nuevas tarjetas de métricas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Facturas Pendientes</CardTitle>
            <FileText className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.numFacturasPendientes}</div>
            <p className="text-xs text-muted-foreground">
              {data.diasPromedioPendiente > 0
                ? `~${data.diasPromedioPendiente} días de antigüedad media`
                : 'Sin facturas pendientes'}
            </p>
          </CardContent>
        </Card>

        {/* Comparativa Ventas vs Gastos - Gráfico Recharts */}
        <ComparisonChart data={data.comparativaMensual} />

        {/* Top producto del mes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Producto estrella</CardTitle>
            <Package className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {data.topProductosMes[0] ? (
              <>
                <div className="text-lg font-bold truncate">{data.topProductosMes[0].nombre}</div>
                <p className="text-xs text-muted-foreground">
                  {data.topProductosMes[0].cantidad} unidades este mes
                </p>
              </>
            ) : (
              <div className="text-muted-foreground text-sm">Sin ventas este mes</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <RecentInvoices facturas={data.ultimasFacturas} />

          {/* Top productos del mes */}
          {data.topProductosMes.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Productos más vendidos del mes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.topProductosMes.map((producto, index) => (
                    <div key={producto.nombre} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center ${index === 0 ? 'bg-yellow-100 text-yellow-700' :
                          index === 1 ? 'bg-gray-100 text-gray-700' :
                            index === 2 ? 'bg-orange-100 text-orange-700' :
                              'bg-muted text-muted-foreground'
                          }`}>
                          {index + 1}
                        </span>
                        <span className="text-sm font-medium truncate max-w-[200px]">{producto.nombre}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{producto.cantidad} uds</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        <div className="space-y-6">
          <UnpaidExpenses gastos={data.gastosPendientes as any} />
          <TopClientes clientes={data.topClientes} />
        </div>
      </div>
    </div>
  )
}
