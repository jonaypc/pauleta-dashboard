import { createClient } from "@/lib/supabase/server"
import { StatsCards } from "@/components/dashboard/StatsCards"
import { RecentInvoices } from "@/components/dashboard/RecentInvoices"
import { UpcomingPayments } from "@/components/dashboard/UpcomingPayments"
import { TopClientes } from "@/components/dashboard/TopClientes"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Plus, FileText } from "lucide-react"

export const revalidate = 60 // Revalidar cada 60 segundos

async function getDashboardData() {
  const supabase = await createClient()
  
  const now = new Date()
  const primerDiaMes = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const primerDiaMesAnterior = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
  const ultimoDiaMesAnterior = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]

  // Facturación del mes actual
  const { data: facturasMes } = await supabase
    .from('facturas')
    .select('total')
    .gte('fecha', primerDiaMes)
    .neq('estado', 'anulada')

  const facturacionMes = facturasMes?.reduce((sum, f) => sum + (f.total || 0), 0) || 0

  // Facturación del mes anterior
  const { data: facturasMesAnterior } = await supabase
    .from('facturas')
    .select('total')
    .gte('fecha', primerDiaMesAnterior)
    .lte('fecha', ultimoDiaMesAnterior)
    .neq('estado', 'anulada')

  const facturacionMesAnterior = facturasMesAnterior?.reduce((sum, f) => sum + (f.total || 0), 0) || 0

  // Cobros pendientes (facturas emitidas no cobradas)
  const { data: facturasPendientes } = await supabase
    .from('facturas')
    .select('total')
    .eq('estado', 'emitida')

  const cobrosPendientes = facturasPendientes?.reduce((sum, f) => sum + (f.total || 0), 0) || 0

  // Número de facturas emitidas este mes
  const { count: facturasEmitidas } = await supabase
    .from('facturas')
    .select('*', { count: 'exact', head: true })
    .gte('fecha', primerDiaMes)
    .neq('estado', 'anulada')

  // Total de clientes activos
  const { count: totalClientes } = await supabase
    .from('clientes')
    .select('*', { count: 'exact', head: true })
    .eq('activo', true)

  // Últimas 5 facturas
  const { data: ultimasFacturas } = await supabase
    .from('facturas')
    .select(`
      *,
      cliente:clientes(nombre)
    `)
    .order('created_at', { ascending: false })
    .limit(5)

  // Pagos fijos activos
  const { data: pagosFijos } = await supabase
    .from('pagos_fijos')
    .select('*')
    .eq('activo', true)
    .order('dia_inicio', { ascending: true })

  // Top 5 clientes por facturación
  const { data: topClientes } = await supabase
    .from('facturas')
    .select(`
      cliente_id,
      total,
      cliente:clientes(nombre)
    `)
    .neq('estado', 'anulada')

  // Agrupar por cliente
  const clienteStats = topClientes?.reduce((acc, factura) => {
    if (!factura.cliente_id) return acc
    if (!acc[factura.cliente_id]) {
      acc[factura.cliente_id] = {
        cliente_id: factura.cliente_id,
        nombre: factura.cliente?.nombre || 'Sin nombre',
        total_facturado: 0,
        num_facturas: 0,
      }
    }
    acc[factura.cliente_id].total_facturado += factura.total || 0
    acc[factura.cliente_id].num_facturas += 1
    return acc
  }, {} as Record<string, { cliente_id: string; nombre: string; total_facturado: number; num_facturas: number }>)

  const topClientesList = Object.values(clienteStats || {})
    .sort((a, b) => b.total_facturado - a.total_facturado)
    .slice(0, 5)

  return {
    facturacionMes,
    facturacionMesAnterior,
    cobrosPendientes,
    facturasEmitidas: facturasEmitidas || 0,
    totalClientes: totalClientes || 0,
    ultimasFacturas: ultimasFacturas || [],
    pagosFijos: pagosFijos || [],
    topClientes: topClientesList,
  }
}

export default async function DashboardPage() {
  const data = await getDashboardData()

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Stats Cards */}
      <StatsCards
        facturacionMes={data.facturacionMes}
        facturacionMesAnterior={data.facturacionMesAnterior}
        cobrosPendientes={data.cobrosPendientes}
        facturasEmitidas={data.facturasEmitidas}
        totalClientes={data.totalClientes}
      />

      {/* Grid de contenido */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Columna izquierda */}
        <div className="space-y-6">
          <RecentInvoices facturas={data.ultimasFacturas} />
        </div>

        {/* Columna derecha */}
        <div className="space-y-6">
          <UpcomingPayments pagos={data.pagosFijos} />
          <TopClientes clientes={data.topClientes} />
        </div>
      </div>
    </div>
  )
}
