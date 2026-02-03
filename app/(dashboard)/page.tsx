import { createClient } from "@/lib/supabase/server"
import { StatsCards } from "@/components/dashboard/StatsCards"
import { RecentInvoices } from "@/components/dashboard/RecentInvoices"
import { UpcomingPayments } from "@/components/dashboard/UpcomingPayments"
import { TopClientes } from "@/components/dashboard/TopClientes"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Plus } from "lucide-react"

export const revalidate = 60

async function getDashboardData() {
  const supabase = await createClient()

  const now = new Date()
  const primerDiaMes = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const primerDiaMesAnterior = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
  const ultimoDiaMesAnterior = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]

  try {
    const { data: facturasMes } = await supabase
      .from('facturas')
      .select('total')
      .gte('fecha', primerDiaMes)
      .neq('estado', 'anulada')

    const facturacionMes = facturasMes?.reduce((sum, f) => sum + (f.total || 0), 0) || 0

    const { data: facturasMesAnterior } = await supabase
      .from('facturas')
      .select('total')
      .gte('fecha', primerDiaMesAnterior)
      .lte('fecha', ultimoDiaMesAnterior)
      .neq('estado', 'anulada')

    const facturacionMesAnterior = facturasMesAnterior?.reduce((sum, f) => sum + (f.total || 0), 0) || 0

    const { data: facturasPendientes } = await supabase
      .from('facturas')
      .select('total')
      .eq('estado', 'emitida')

    const cobrosPendientes = facturasPendientes?.reduce((sum, f) => sum + (f.total || 0), 0) || 0

    // Cobros realizados este mes
    const { data: cobrosMesData } = await supabase
      .from('cobros')
      .select('importe')
      .gte('fecha', primerDiaMes)

    const cobrosMes = cobrosMesData?.reduce((sum, c) => sum + (c.importe || 0), 0) || 0

    const { count: facturasEmitidas } = await supabase
      .from('facturas')
      .select('*', { count: 'exact', head: true })
      .gte('fecha', primerDiaMes)
      .neq('estado', 'anulada')

    const { count: totalClientes } = await supabase
      .from('clientes')
      .select('*', { count: 'exact', head: true })
      .eq('activo', true)

    const { data: ultimasFacturas } = await supabase
      .from('facturas')
      .select(`
        id,
        numero,
        fecha,
        total,
        estado,
        cliente_id,
        clientes (nombre)
      `)
      .order('created_at', { ascending: false })
      .limit(5)

    const facturasFormateadas = ultimasFacturas?.map(f => {
      const clientesData = f.clientes as unknown
      let clienteNombre = 'Sin nombre'
      if (Array.isArray(clientesData) && clientesData[0]?.nombre) {
        clienteNombre = clientesData[0].nombre
      } else if (clientesData && typeof clientesData === 'object' && 'nombre' in clientesData) {
        clienteNombre = (clientesData as { nombre: string }).nombre
      }
      return {
        id: f.id,
        numero: f.numero,
        fecha: f.fecha,
        total: f.total,
        estado: f.estado,
        cliente_id: f.cliente_id,
        cliente: { nombre: clienteNombre }
      }
    }) || []

    const { data: pagosFijos } = await supabase
      .from('pagos_fijos')
      .select('*')
      .eq('activo', true)
      .order('dia_inicio', { ascending: true })

    const { data: facturasClientes } = await supabase
      .from('facturas')
      .select(`
        cliente_id,
        total,
        clientes (nombre)
      `)
      .neq('estado', 'anulada')

    const clienteStats: Record<string, { cliente_id: string; nombre: string; total_facturado: number; num_facturas: number }> = {}

    facturasClientes?.forEach(factura => {
      if (!factura.cliente_id) return
      const clientesData = factura.clientes as unknown
      let clienteNombre = 'Sin nombre'
      if (Array.isArray(clientesData) && clientesData[0]?.nombre) {
        clienteNombre = clientesData[0].nombre
      } else if (clientesData && typeof clientesData === 'object' && 'nombre' in clientesData) {
        clienteNombre = (clientesData as { nombre: string }).nombre
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

    return {
      facturacionMes,
      facturacionMesAnterior,
      cobrosPendientes,
      cobrosMes,
      facturasEmitidas: facturasEmitidas || 0,
      totalClientes: totalClientes || 0,
      ultimasFacturas: facturasFormateadas,
      pagosFijos: pagosFijos || [],
      topClientes: topClientesList,
    }
  } catch (error) {
    console.error('CRITICAL ERROR IN GETDASHBOARDDATA:', error)
    throw error // Re-throw to be caught by error.tsx
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

      <StatsCards
        facturacionMes={data.facturacionMes}
        facturacionMesAnterior={data.facturacionMesAnterior}
        cobrosPendientes={data.cobrosPendientes}
        cobrosMes={data.cobrosMes}
        facturasEmitidas={data.facturasEmitidas}
        totalClientes={data.totalClientes}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <RecentInvoices facturas={data.ultimasFacturas} />
        </div>
        <div className="space-y-6">
          <UpcomingPayments pagos={data.pagosFijos} />
          <TopClientes clientes={data.topClientes} />
        </div>
      </div>
    </div>
  )
}
