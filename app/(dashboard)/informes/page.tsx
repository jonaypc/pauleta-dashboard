import { Suspense } from "react"
import { Metadata } from "next"
import { DateRangeFilter } from "@/components/informes/DateRangeFilter"
import { SalesChart } from "@/components/informes/SalesChart"
import { ExportButton } from "@/components/informes/ExportButton"
import { TopCustomersTable } from "@/components/informes/TopCustomersTable"
import { TopProductsTable, TopProduct } from "@/components/informes/TopProductsTable"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendingUp, Users, Package, CreditCard, AlertTriangle, Calendar, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { formatCurrency } from "@/lib/utils"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"

export const metadata: Metadata = {
    title: "Informes y Estadísticas",
    description: "Análisis detallado de facturación y productos",
}

async function getAnalyticsData(from: string, to: string) {
    const supabase = await createClient()
    const now = new Date()

    // Calcular período anterior (misma duración)
    const fromDate = new Date(from)
    const toDate = new Date(to)
    const duracionDias = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24))
    const periodoAnteriorTo = new Date(fromDate.getTime() - 1000 * 60 * 60 * 24).toISOString().split('T')[0]
    const periodoAnteriorFrom = new Date(fromDate.getTime() - duracionDias * 1000 * 60 * 60 * 24).toISOString().split('T')[0]

    // 1. Facturas con Clientes y Líneas (para poder sacar top productos también)
    const { data: facturas } = await supabase
        .from('facturas')
        .select(`
            id, numero, fecha, total, base_imponible, igic, estado, created_at, notas,
            cliente:clientes(nombre, id),
            lineas:lineas_factura(cantidad, subtotal, descripcion, producto_id, igic)
        `)
        .gte('fecha', from)
        .lte('fecha', to)
        .neq('estado', 'anulada')
        .order('fecha', { ascending: true })

    // Facturas del período anterior para comparativa
    const { data: facturasAnterior } = await supabase
        .from('facturas')
        .select('total')
        .gte('fecha', periodoAnteriorFrom)
        .lte('fecha', periodoAnteriorTo)
        .neq('estado', 'anulada')

    const totalFacturadoAnterior = facturasAnterior?.reduce((sum, f) => sum + (f.total || 0), 0) || 0
    const totalFacturado = facturas?.reduce((sum, f) => sum + (f.total || 0), 0) || 0
    const variacionFacturacion = totalFacturadoAnterior > 0
        ? ((totalFacturado - totalFacturadoAnterior) / totalFacturadoAnterior) * 100
        : 0

    // 2. Cobros
    const { data: cobros } = await supabase
        .from('cobros')
        .select('importe')
        .gte('fecha', from)
        .lte('fecha', to)

    const totalCobrado = cobros?.reduce((sum, c) => sum + (c.importe || 0), 0) || 0
    const ticketMedio = facturas?.length ? totalFacturado / facturas.length : 0
    // @ts-ignore
    const clientesUnicos = new Set(facturas?.map(f => f.cliente?.id).filter(Boolean)).size

    // 3. Agrupación por Mes/Día para Gráfico
    const chartDataMap: Record<string, number> = {}
    facturas?.forEach(f => {
        const date = parseISO(f.fecha)
        const key = format(date, "d MMM", { locale: es })
        chartDataMap[key] = (chartDataMap[key] || 0) + (f.total || 0)
    })
    const chartData = Object.entries(chartDataMap).map(([name, total]) => ({ name, total }))

    // 4. Top Clientes
    const clientesMap: Record<string, { id: string, nombre: string, total: number, count: number }> = {}
    facturas?.forEach(f => {
        // @ts-ignore
        const cId = f.cliente?.id
        // @ts-ignore
        const cNombre = f.cliente?.nombre || 'Desconocido'
        if (cId) {
            if (!clientesMap[cId]) clientesMap[cId] = { id: cId, nombre: cNombre, total: 0, count: 0 }
            clientesMap[cId].total += (f.total || 0)
            clientesMap[cId].count += 1
        }
    })
    const topClientes = Object.values(clientesMap)
        .sort((a, b) => b.total - a.total)
        .slice(0, 10)

    // 5. Top Productos
    const productosMap: Record<string, TopProduct> = {}
    facturas?.forEach(f => {
        f.lineas?.forEach((l: any) => {
            // Usamos descripción como clave si no hay producto_id, o producto_id si existe
            const key = l.producto_id || l.descripcion
            const name = l.descripcion
            if (!productosMap[key]) productosMap[key] = { id: key, nombre: name, cantidad: 0, total: 0 }
            productosMap[key].cantidad += (l.cantidad || 0)
            productosMap[key].total += (l.subtotal || 0) // subtotal sin impuestos suele ser mejor para ranking ventas
        })
    })
    const topProductos = Object.values(productosMap)
        .sort((a, b) => b.total - a.total)
        .slice(0, 10)

    return {
        totalFacturado,
        totalCobrado,
        ticketMedio,
        clientesUnicos,
        numFacturas: facturas?.length || 0,
        chartData,
        rawFacturas: facturas || [],
        topClientes,
        topProductos
    }
}

export default async function InformesPage({
    searchParams,
}: {
    searchParams: { from?: string; to?: string }
}) {
    const now = new Date()
    const from = searchParams.from || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const to = searchParams.to || now.toISOString().split('T')[0]

    const data = await getAnalyticsData(from, to)

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Informes</h1>
                    <p className="text-muted-foreground">
                        Análisis de rendimiento del {from} al {to}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" asChild className="hidden sm:flex bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100">
                        <Link href="/informes/financiero">
                            <TrendingUp className="mr-2 h-4 w-4" />
                            Rentabilidad
                        </Link>
                    </Button>
                    <Suspense fallback={<div className="w-[300px] h-10 bg-muted animate-pulse rounded-md" />}>
                        <DateRangeFilter />
                    </Suspense>
                    <ExportButton data={data.rawFacturas} />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Facturación Total</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(data.totalFacturado)}</div>
                        <div className="text-xs text-muted-foreground">{data.numFacturas} facturas emitidas</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Cobrado</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(data.totalCobrado)}</div>
                        <div className="text-xs text-muted-foreground">Ingresos reales en periodo</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ticket Medio</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(data.ticketMedio)}</div>
                        <div className="text-xs text-muted-foreground">Promedio por factura</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Clientes Activos</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.clientesUnicos}</div>
                        <div className="text-xs text-muted-foreground">Con compras en este periodo</div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="ventas" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="ventas">Ventas</TabsTrigger>
                    <TabsTrigger value="clientes">Top Clientes</TabsTrigger>
                    <TabsTrigger value="productos">Top Productos</TabsTrigger>
                </TabsList>

                <TabsContent value="ventas" className="space-y-4">
                    <div className="grid gap-1 md:grid-cols-1">
                        <Card className="col-span-1">
                            <CardHeader>
                                <CardTitle>Evolución de Ventas</CardTitle>
                            </CardHeader>
                            <CardContent className="pl-2">
                                <SalesChart data={data.chartData} />
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="clientes">
                    <Card>
                        <CardHeader>
                            <CardTitle>Mejores Clientes</CardTitle>
                            <CardDescription>Clientes ordenados por volumen de facturación en el periodo seleccionado</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <TopCustomersTable data={data.topClientes} />
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="productos">
                    <Card>
                        <CardHeader>
                            <CardTitle>Productos Más Vendidos</CardTitle>
                            <CardDescription>Productos ordenados por volumen de ventas (subtotal) en el periodo seleccionado</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <TopProductsTable data={data.topProductos} />
                        </CardContent>
                    </Card>
                </TabsContent>

            </Tabs>
        </div>
    )
}
