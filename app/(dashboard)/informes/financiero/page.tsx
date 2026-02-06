import { createClient } from "@/lib/supabase/server"
import { startOfYear, endOfMonth, eachMonthOfInterval, format, parseISO, isSameMonth } from "date-fns"
import { es } from "date-fns/locale"
import { DateRangeFilter } from "@/components/informes/DateRangeFilter"
import { FinancialSummary } from "@/components/dashboard/FinancialSummary"
import { ComparisonChart } from "@/components/dashboard/ComparisonChart"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Download, FileText } from "lucide-react"
import Link from "next/link"

export const dynamic = 'force-dynamic'

interface PageProps {
    searchParams: {
        from?: string
        to?: string
    }
}

export default async function FinancialReportsPage({ searchParams }: PageProps) {
    const supabase = await createClient()
    const now = new Date()

    // Default range: Start of Year to Today
    const fromStr = searchParams.from || startOfYear(now).toISOString().split('T')[0]
    const toStr = searchParams.to || now.toISOString().split('T')[0]

    const fromDate = new Date(fromStr)
    const toDate = new Date(toStr)

    // Ensure valid dates
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        return <div className="p-8 text-red-500">Error: Fechas inválidas.</div>
    }

    // 1. Fetch Invoices (Ingresos)
    const { data: facturas } = await supabase
        .from('facturas')
        .select('fecha, total')
        .gte('fecha', fromStr)
        .lte('fecha', toStr)
        .neq('estado', 'anulada')

    // 2. Fetch Expenses (Gastos Variables)
    const { data: gastos } = await supabase
        .from('gastos')
        .select('fecha, importe')
        .gte('fecha', fromStr)
        .lte('fecha', toStr)

    // 3. Fetch Fixed Payments (Gastos Fijos Recurrentes)
    const { data: pagosFijos } = await supabase
        .from('pagos_fijos')
        .select('importe')
        .eq('activo', true)

    const totalFijoMensual = pagosFijos?.reduce((sum, p) => sum + (p.importe || 0), 0) || 0

    // 4. Aggregate by Month
    // Generate all months in range
    const monthsInterval = eachMonthOfInterval({
        start: fromDate,
        end: toDate
    })

    const comparativaMensual = monthsInterval.map(monthDate => {
        // Filter invoices in this month
        const ingresosMes = facturas?.filter(f =>
            f.fecha && isSameMonth(parseISO(f.fecha), monthDate)
        ).reduce((sum, f) => sum + (f.total || 0), 0) || 0

        // Filter expenses in this month
        const gastosVariablesMes = gastos?.filter(g =>
            g.fecha && isSameMonth(parseISO(g.fecha), monthDate)
        ).reduce((sum, g) => sum + (g.importe || 0), 0) || 0

        // Fixed expenses are added to every full month in range
        // For simplicity, we add it to every month shown
        const totalGastosMes = gastosVariablesMes + totalFijoMensual

        return {
            mes: format(monthDate, 'MMM yyyy', { locale: es }), // e.g. "ene 2024"
            ingresos: ingresosMes,
            gastos: totalGastosMes
        }
    })

    // Calculate totals for summary
    const totalIngresos = comparativaMensual.reduce((sum, m) => sum + m.ingresos, 0)
    const totalGastos = comparativaMensual.reduce((sum, m) => sum + m.gastos, 0)

    // Breakdown for summary component
    // Note: gastosFijos here is total over the period, not monthly
    const totalGastosFijosPeriodo = totalFijoMensual * monthsInterval.length
    const totalGastosVariablesPeriodo = totalGastos - totalGastosFijosPeriodo

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-20">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/informes">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Informe Financiero</h1>
                        <p className="text-muted-foreground">Analítica detallada de ingresos y gastos.</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <DateRangeFilter />
                    <Button variant="outline" size="icon">
                        <Download className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Resumen Global del Periodo */}
            <FinancialSummary
                ingresos={totalIngresos}
                gastosFijos={totalGastosFijosPeriodo}
                gastosVariables={totalGastosVariablesPeriodo}
                mes="Periodo Seleccionado"
            />

            {/* Gráfico Comparativo */}
            <ComparisonChart data={comparativaMensual} />

            {/* Tabla Detallada (Opcional, pero útil) */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-500" />
                        Desglose Mensual
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/50">
                                    <th className="h-10 px-4 text-left font-medium">Mes</th>
                                    <th className="h-10 px-4 text-right font-medium text-blue-600">Ingresos</th>
                                    <th className="h-10 px-4 text-right font-medium text-red-600">Gastos</th>
                                    <th className="h-10 px-4 text-right font-medium">Resultado</th>
                                    <th className="h-10 px-4 text-right font-medium text-muted-foreground">Margen</th>
                                </tr>
                            </thead>
                            <tbody>
                                {comparativaMensual.map((row) => {
                                    const resultado = row.ingresos - row.gastos
                                    const margen = row.ingresos > 0 ? (resultado / row.ingresos) * 100 : 0
                                    return (
                                        <tr key={row.mes} className="border-b last:border-0 hover:bg-slate-50">
                                            <td className="p-4 font-medium capitalize">{row.mes}</td>
                                            <td className="p-4 text-right">{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(row.ingresos)}</td>
                                            <td className="p-4 text-right">{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(row.gastos)}</td>
                                            <td className={`p-4 text-right font-medium ${resultado >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {resultado >= 0 ? '+' : ''}{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(resultado)}
                                            </td>
                                            <td className="p-4 text-right text-muted-foreground">{margen.toFixed(1)}%</td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
