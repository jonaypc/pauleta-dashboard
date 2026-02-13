import { getPendingBankMovements, getTreasuryStats, getCashFlowProjection } from "@/lib/actions/tesoreria"
import { createClient } from "@/lib/supabase/server"
import { BankStatementImporter } from "@/components/tesoreria/BankStatementImporter"
import { MovementsList } from "@/components/tesoreria/MovementsList"
import { CashFlowChart } from "@/components/tesoreria/CashFlowChart"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import { Wallet, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Activity } from "lucide-react"

export default async function TesoreriaPage() {
    let movements: any[] = []
    let totalPositivo = 0
    let totalNegativo = 0
    let treasuryStats = {
        saldoActual: 0,
        ingresosPendientes: 0,
        gastosPendientes: 0,
        proyeccion30dias: 0,
        movimientosSinConciliar: 0,
        ultimaActualizacion: new Date().toISOString()
    }
    let cashFlowData: any[] = []

    try {
        const data = await getPendingBankMovements()
        movements = Array.isArray(data) ? data : []

        // Estadísticas básicas manuales
        totalPositivo = movements.filter(m => m.importe > 0).reduce((acc, m) => acc + (Number(m.importe) || 0), 0)
        totalNegativo = movements.filter(m => m.importe < 0).reduce((acc, m) => acc + (Number(m.importe) || 0), 0)

        // Obtener estadísticas de tesorería
        treasuryStats = await getTreasuryStats()

        // Obtener datos de flujo de caja
        cashFlowData = await getCashFlowProjection(6)
    } catch (error) {
        console.error("Error loading Tesoreria data:", error)
        // Fallback to empty state
    }

    const liquidezSaludable = treasuryStats.saldoActual > treasuryStats.gastosPendientes
    const proyeccionPositiva = treasuryStats.proyeccion30dias > 0

    return (
        <div className="space-y-6 pb-20">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Tesorería y Conciliación</h1>
                <p className="text-muted-foreground">Gestiona tus movimientos bancarios y concilia facturas.</p>
            </div>

            {/* KPIs Principales de Tesorería */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Liquidez Actual */}
                <Card className={`${liquidezSaludable ? 'bg-green-50/50 border-green-200' : 'bg-amber-50/50 border-amber-200'}`}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Liquidez Actual</CardTitle>
                        <Wallet className={`h-4 w-4 ${liquidezSaludable ? 'text-green-600' : 'text-amber-600'}`} />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${liquidezSaludable ? 'text-green-700' : 'text-amber-700'}`}>
                            {formatCurrency(treasuryStats.saldoActual)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {liquidezSaludable ? (
                                <span className="flex items-center gap-1 text-green-600">
                                    <CheckCircle2 className="h-3 w-3" /> Posición saludable
                                </span>
                            ) : (
                                <span className="flex items-center gap-1 text-amber-600">
                                    <AlertTriangle className="h-3 w-3" /> Requiere atención
                                </span>
                            )}
                        </p>
                    </CardContent>
                </Card>

                {/* Por Cobrar */}
                <Card className="bg-blue-50/50 border-blue-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Por Cobrar</CardTitle>
                        <TrendingUp className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-700">
                            {formatCurrency(treasuryStats.ingresosPendientes)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Facturas emitidas pendientes
                        </p>
                    </CardContent>
                </Card>

                {/* Por Pagar */}
                <Card className="bg-red-50/50 border-red-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Por Pagar</CardTitle>
                        <TrendingDown className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-700">
                            {formatCurrency(treasuryStats.gastosPendientes)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Gastos pendientes de pago
                        </p>
                    </CardContent>
                </Card>

                {/* Proyección 30 días */}
                <Card className={`${proyeccionPositiva ? 'bg-slate-50/50 border-slate-200' : 'bg-amber-50/50 border-amber-200'}`}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Proyección 30d</CardTitle>
                        {proyeccionPositiva ? (
                            <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : (
                            <TrendingDown className="h-4 w-4 text-amber-600" />
                        )}
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${proyeccionPositiva ? 'text-slate-900' : 'text-amber-700'}`}>
                            {formatCurrency(treasuryStats.proyeccion30dias)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Liquidez estimada
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Gráfico de Flujo de Caja */}
            {cashFlowData.length > 0 && (
                <CashFlowChart data={cashFlowData} />
            )}

            {/* Movimientos sin conciliar */}
            {movements.length > 0 && (
                <Card className="bg-amber-50/30 border-amber-200">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Activity className="h-5 w-5 text-amber-600" />
                                <CardTitle className="text-base">Movimientos Pendientes de Conciliar</CardTitle>
                            </div>
                            <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">
                                {movements.length} pendientes
                            </Badge>
                        </div>
                        <CardDescription>
                            Estos movimientos bancarios necesitan ser vinculados con facturas o gastos
                        </CardDescription>
                    </CardHeader>
                </Card>
            )}

            <Tabs defaultValue="movimientos" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="movimientos">
                        Reconciliación
                        {movements.length > 0 && (
                            <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px]">
                                {movements.length}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="importar">Importar Extracto</TabsTrigger>
                </TabsList>

                <TabsContent value="movimientos" className="mt-6">
                    <MovementsList initialMovements={movements} />
                </TabsContent>

                <TabsContent value="importar" className="mt-6">
                    <div className="max-w-xl mx-auto">
                        <BankStatementImporter />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
