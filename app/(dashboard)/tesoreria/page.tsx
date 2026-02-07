import { getPendingBankMovements } from "@/lib/actions/tesoreria"
import { createClient } from "@/lib/supabase/server"
import { BankStatementImporter } from "@/components/tesoreria/BankStatementImporter"
import { MovementsList } from "@/components/tesoreria/MovementsList"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"

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
