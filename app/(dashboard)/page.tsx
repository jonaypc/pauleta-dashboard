import { createClient } from "@/lib/supabase/server"
import { StatsCards } from "@/components/dashboard/StatsCards"
import { RecentInvoices } from "@/components/dashboard/RecentInvoices"
import { UpcomingPayments } from "@/components/dashboard/UpcomingPayments"
import { TopClientes } from "@/components/dashboard/TopClientes"
import { FinancialSummary } from "@/components/dashboard/FinancialSummary"
import { ComparisonChart } from "@/components/dashboard/ComparisonChart"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { Plus, TrendingUp, Package, Clock, FileText } from "lucide-react"

export const dynamic = 'force-dynamic'

async function getDashboardData() {
  // Default safe data
  const defaultData = {
    facturacionMes: 0,
    facturacionMesAnterior: 0,
    cobrosPendientes: 0,
    cobrosMes: 0,
    facturasEmitidas: 0,
    totalClientes: 0,
    ultimasFacturas: [],
    pagosFijos: [],
    topClientes: [],
    numFacturasPendientes: 0,
    diasPromedioPendiente: 0,
    ventasPorMes: [],
    topProductosMes: [],
    nombreMes: new Date().toLocaleDateString('es-ES', { month: 'long' }),
    totalGastosFijos: 0,
    totalGastosVariables: 0,
  }

  try {
    const supabase = await createClient()

    const now = new Date()
    const primerDiaMes = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const primerDiaMesAnterior = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
    const ultimoDiaMesAnterior = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]
    const hace6Meses = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().split('T')[0]
    const nombreMes = now.toLocaleDateString('es-ES', { month: 'long' })
    console.log('Fetching facturasMes...')
    const { data: facturasMes } = await supabase
      .from('facturas')
      .select('total')
      .gte('fecha', primerDiaMes)
      .neq('estado', 'anulada')

    const facturacionMes = facturasMes?.reduce((sum, f) => sum + (f.total || 0), 0) || 0

    console.log('Fetching facturasMesAnterior...')
    const { data: facturasMesAnterior } = await supabase
      .from('facturas')
      .select('total')
      .gte('fecha', primerDiaMesAnterior)
      .lte('fecha', ultimoDiaMesAnterior)
      .neq('estado', 'anulada')

    const facturacionMesAnterior = facturasMesAnterior?.reduce((sum, f) => sum + (f.total || 0), 0) || 0

    console.log('Fetching facturasPendientes...')
    const { data: facturasPendientes } = await supabase
      .from('facturas')
      .select('total, fecha')
      .eq('estado', 'emitida')

    const cobrosPendientes = facturasPendientes?.reduce((sum, f) => sum + (f.total || 0), 0) || 0
    const numFacturasPendientes = facturasPendientes?.length || 0

    // Calcular días promedio de antigüedad de facturas pendientes
    const facturasValidas = facturasPendientes?.filter(f => f.fecha && !isNaN(new Date(f.fecha).getTime())) || []
    const diasPromedioPendienteTotal = facturasValidas.length
      ? facturasValidas.reduce((sum, f) => {
        const dias = Math.floor((now.getTime() - new Date(f.fecha).getTime()) / (1000 * 60 * 60 * 24))
        return sum + Math.max(0, dias)
      }, 0) / facturasValidas.length
      : 0

    const diasPromedioPendiente = isNaN(diasPromedioPendienteTotal) ? 0 : Math.round(diasPromedioPendienteTotal)

    console.log('Fetching cobrosMesData...')
    const { data: cobrosMesData } = await supabase
      .from('cobros')
      .select('importe')
      .gte('fecha', primerDiaMes)

    const cobrosMes = cobrosMesData?.reduce((sum, c) => sum + (c.importe || 0), 0) || 0

    console.log('Fetching facturasEmitidas count...')
    const { count: facturasEmitidasCount } = await supabase
      .from('facturas')
      .select('*', { count: 'exact', head: true })
      .gte('fecha', primerDiaMes)
      .neq('estado', 'anulada')

    console.log('Fetching totalClientes count...')
    const { count: totalClientesCount } = await supabase
      .from('clientes')
      .select('*', { count: 'exact', head: true })
      .eq('activo', true)

    console.log('Fetching facturas6Meses...')
    const { data: facturas6Meses } = await supabase
      .from('facturas')
      .select('fecha, total')
      .gte('fecha', hace6Meses)
      .neq('estado', 'anulada')

    console.log('Fetching gastos6Meses...')
    const { data: gastos6Meses } = await supabase
      .from('gastos')
      .select('fecha, importe')
      .gte('fecha', hace6Meses)

    console.log('Fetching pagosFijos...')
    const { data: pagosFijos } = await supabase
      .from('pagos_fijos')
      .select('*')
      .eq('activo', true)

    const totalGastosFijos = pagosFijos?.reduce((sum, p) => sum + (p.importe || 0), 0) || 0

    const comparativaMensual: { mes: string; ingresos: number; gastos: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const fecha = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const mesKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`
      const nombreMesGraph = fecha.toLocaleDateString('es-ES', { month: 'short' })

      const ingresos = (facturas6Meses || [])
        .filter(f => f.fecha && typeof f.fecha === 'string' && f.fecha.startsWith(mesKey))
        .reduce((sum, f) => sum + (f.total || 0), 0) || 0

      const gastosVariables = (gastos6Meses || [])
        .filter(g => g.fecha && typeof g.fecha === 'string' && g.fecha.startsWith(mesKey))
        .reduce((sum, g) => sum + (g.importe || 0), 0) || 0

      comparativaMensual.push({
        mes: nombreMesGraph,
        ingresos,
        gastos: gastosVariables + totalGastosFijos
      })
    }

    console.log('Fetching lineasMes...')
    const { data: lineasMes } = await supabase
      .from('lineas_factura')
      .select(`
        cantidad, descripcion,
        factura:facturas!inner(fecha, estado)
      `)
      .gte('factura.fecha', primerDiaMes)
      .neq('factura.estado', 'anulada')

    const productosVendidos: Record<string, { nombre: string; cantidad: number }> = {}
    lineasMes?.forEach((l: any) => {
      const key = l.descripcion || "Sin descripción"
      if (!productosVendidos[key]) {
        productosVendidos[key] = { nombre: key, cantidad: 0 }
      }
      productosVendidos[key].cantidad += Number(l.cantidad || 0)
    })
    const topProductosMes = Object.values(productosVendidos)
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5)

    console.log('Fetching ultimasFacturas...')
    const { data: ultimasFacturas } = await supabase
      .from('facturas')
      .select(`
        id,
        numero,
        fecha,
        total,
        estado,
        cliente_id,
        clientes (nombre, persona_contacto)
      `)
      .order('created_at', { ascending: false })
      .limit(5)

    const facturasFormateadas = ultimasFacturas?.map(f => {
      const clienteData = f.clientes as any
      let clienteNombre = 'Sin nombre'
      let clienteContacto = undefined

      if (clienteData) {
        if (Array.isArray(clienteData) && clienteData[0]) {
          clienteNombre = clienteData[0].nombre
          clienteContacto = clienteData[0].persona_contacto
        } else if (typeof clienteData === 'object') {
          clienteNombre = clienteData.nombre
          clienteContacto = clienteData.persona_contacto
        }
      }

      return {
        id: f.id,
        numero: f.numero,
        fecha: f.fecha,
        total: f.total,
        estado: f.estado,
        cliente_id: f.cliente_id,
        cliente: {
          nombre: clienteNombre,
          persona_contacto: clienteContacto
        }
      }
    }) || []

    const totalGastosVariables = (gastos6Meses || [])
      .filter(g => g.fecha && typeof g.fecha === 'string' && g.fecha.startsWith(primerDiaMes.slice(0, 7)))
      .reduce((sum, g) => sum + (g.importe || 0), 0) || 0

    console.log('Fetching facturasClientes for topClientes...')
    const { data: facturasClientes } = await supabase
      .from('facturas')
      .select(`
        cliente_id,
        total,
        clientes (nombre, persona_contacto)
      `)
      .neq('estado', 'anulada')

    const clienteStats: Record<string, { cliente_id: string; nombre: string; total_facturado: number; num_facturas: number }> = {}

    facturasClientes?.forEach(factura => {
      if (!factura.cliente_id) return
      const clienteData = factura.clientes as any
      let clienteNombre = 'Sin nombre'

      if (clienteData) {
        if (Array.isArray(clienteData) && clienteData[0]) {
          clienteNombre = clienteData[0].persona_contacto || clienteData[0].nombre
        } else if (typeof clienteData === 'object') {
          clienteNombre = clienteData.persona_contacto || clienteData.nombre
        }
      }

      if (!clienteStats[factura.cliente_id]) {
        clienteStats[factura.cliente_id] = {
          cliente_id: factura.cliente_id,
          nombre: clienteNombre,
          total_facturado: 0,
          num_facturas: 0,
        }
      }
      clienteStats[factura.cliente_id].total_facturado += factura.total || 0
      clienteStats[factura.cliente_id].num_facturas += 1
    })
    const topClientesList = Object.values(clienteStats)
      .sort((a, b) => b.total_facturado - a.total_facturado)
      .slice(0, 5)

    const result = {
      facturacionMes,
      facturacionMesAnterior,
      cobrosPendientes,
      cobrosMes,
      facturasEmitidas: facturasEmitidasCount || 0,
      totalClientes: totalClientesCount || 0,
      ultimasFacturas: facturasFormateadas,
      pagosFijos: pagosFijos || [],
      topClientes: topClientesList,
      numFacturasPendientes,
      diasPromedioPendiente,
      comparativaMensual,
      topProductosMes,
      nombreMes,
      totalGastosFijos,
      totalGastosVariables,
    }

    // Sanitizar números para evitar errores de serialización (NaN/Infinity)
    const sanitizeNumber = (n: any) => {
      const num = Number(n)
      return (typeof num === 'number' && isFinite(num)) ? num : 0
    }

    return {
      ...result,
      facturacionMes: sanitizeNumber(result.facturacionMes),
      facturacionMesAnterior: sanitizeNumber(result.facturacionMesAnterior),
      cobrosPendientes: sanitizeNumber(result.cobrosPendientes),
      cobrosMes: sanitizeNumber(result.cobrosMes),
      numFacturasPendientes: sanitizeNumber(result.numFacturasPendientes),
      diasPromedioPendiente: sanitizeNumber(result.diasPromedioPendiente),
      totalGastosFijos: sanitizeNumber(result.totalGastosFijos),
      totalGastosVariables: sanitizeNumber(result.totalGastosVariables),
      comparativaMensual: result.comparativaMensual.map((v: any) => ({
        ...v,
        ingresos: sanitizeNumber(v.ingresos),
        gastos: sanitizeNumber(v.gastos)
      })),
      topClientes: result.topClientes.map(c => ({
        ...c,
        total_facturado: sanitizeNumber(c.total_facturado)
      })),
      topProductosMes: result.topProductosMes.map(p => ({
        ...p,
        cantidad: sanitizeNumber(p.cantidad)
      })),
      ultimasFacturas: result.ultimasFacturas.map(f => ({
        ...f,
        total: sanitizeNumber(f.total)
      }))
    }
  } catch (error) {
    console.error('CRITICAL ERROR IN GETDASHBOARDDATA:', error)
    // Return safe defaults instead of crashing the whole tree
    return defaultData
  }
}

export default async function DashboardPage() {
  const data = await getDashboardData()

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
          <UpcomingPayments pagos={data.pagosFijos} />
          <TopClientes clientes={data.topClientes} />
        </div>
      </div>
    </div>
  )
}
