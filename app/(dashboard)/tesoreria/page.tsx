import { getPendingBankMovements } from "@/lib/actions/tesoreria"
import { createClient } from "@/lib/supabase/server"
import { BankStatementImporter } from "@/components/tesoreria/BankStatementImporter"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CreditCard, ArrowUpRight, ArrowDownLeft, Link as LinkIcon } from "lucide-react"
import Link from "next/link"

export default async function TesoreriaPage() {
    let movements: any[] = []
    let totalPositivo = 0
    let totalNegativo = 0

    try {
        const data = await getPendingBankMovements()
        movements = Array.isArray(data) ? data : []

        // Estadísticas básicas manuales
        totalPositivo = movements.filter(m => m.importe > 0).reduce((acc, m) => acc + (Number(m.importe) || 0), 0)
        totalNegativo = movements.filter(m => m.importe < 0).reduce((acc, m) => acc + (Number(m.importe) || 0), 0)
    } catch (error) {
        console.error("Error loading Tesoreria data:", error)
        // Fallback to empty state
    }

    return (
        <div className="space-y-6 pb-20">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Tesorería y Conciliación</h1>
                <p className="text-muted-foreground">Gestiona tus movimientos bancarios y concilia facturas.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-blue-50/50 border-blue-100">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-blue-600">Total Pendiente (Ingresos)</CardDescription>
                        <CardTitle className="text-2xl text-blue-900">{formatCurrency(totalPositivo)}</CardTitle>
                    </CardHeader>
                </Card>
                <Card className="bg-amber-50/50 border-amber-100">
                    <CardHeader className="pb-2">
                        <CardDescription className="text-amber-600">Total Pendiente (Gastos)</CardDescription>
                        <CardTitle className="text-2xl text-amber-900">{formatCurrency(Math.abs(totalNegativo))}</CardTitle>
                    </CardHeader>
                </Card>
                <Card className="bg-slate-50/50 border-slate-100">
                    <CardHeader className="pb-2">
                        <CardDescription>Movimientos sin Conciliar</CardDescription>
                        <CardTitle className="text-2xl">{movements.length}</CardTitle>
                    </CardHeader>
                </Card>
            </div>

            <Tabs defaultValue="movimientos" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="movimientos">Reconciliación</TabsTrigger>
                    <TabsTrigger value="importar">Importar Extracto</TabsTrigger>
                </TabsList>

                <TabsContent value="movimientos" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Movimientos Bancarios Pendientes</CardTitle>
                            <CardDescription>Facturas encontradas con el mismo importe aparecerán aquí.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {movements.length === 0 ? (
                                    <div className="py-12 text-center">
                                        <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-20" />
                                        <p className="text-muted-foreground">No hay movimientos pendientes de conciliación.</p>
                                        <p className="text-xs text-muted-foreground mt-1">Importa un extracto para comenzar.</p>
                                    </div>
                                ) : (
                                    movements.map((move: any) => (
                                        <div key={move.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors gap-4">
                                            <div className="flex gap-4 items-center">
                                                <div className={`p-2 rounded-full ${move.importe > 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                                                    {move.importe > 0 ? <ArrowUpRight className="h-4 w-4 text-green-600" /> : <ArrowDownLeft className="h-4 w-4 text-red-600" />}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-sm leading-none mb-1">{move.descripcion}</p>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-muted-foreground">{formatDate(move.fecha)}</span>
                                                        {move.referencia && <Badge variant="outline" className="text-[10px] py-0">{move.referencia}</Badge>}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-6">
                                                <div className="text-right">
                                                    <p className={`font-bold tabular-nums ${move.importe > 0 ? 'text-green-600' : 'text-slate-900'}`}>
                                                        {formatCurrency(move.importe)}
                                                    </p>
                                                </div>
                                                <Button size="sm" variant="outline" className="gap-2" asChild>
                                                    <Link href={`/tesoreria/conciliar/${move.id}`}>
                                                        <LinkIcon className="h-3 w-3" /> Conciliar
                                                    </Link>
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
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
