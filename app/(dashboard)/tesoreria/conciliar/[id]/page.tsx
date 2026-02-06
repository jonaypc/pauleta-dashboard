import { getReconciliationSuggestions } from "@/lib/actions/tesoreria"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDate } from "@/lib/utils"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { ReconciliationSelector } from "@/components/tesoreria/ReconciliationSelector"

interface PageProps {
    params: { id: string }
}

export default async function ConciliarDetallePage({ params }: PageProps) {
    let movement: any = null
    let suggestions: any[] = []

    try {
        const result = await getReconciliationSuggestions(params.id)
        movement = result.movement
        suggestions = result.suggestions
    } catch (error) {
        console.error("Error loading reconciliation details:", error)
        redirect("/tesoreria")
    }

    if (!movement || movement.estado === 'conciliado') {
        redirect("/tesoreria")
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-20 px-4 md:px-0">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/tesoreria">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Conciliar Movimiento</h1>
                    <p className="text-muted-foreground">Vincular transacción bancaria con factura(s) o gasto.</p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Columna Izquierda: Información del Movimiento */}
                <Card className="md:col-span-1 border-blue-200 bg-blue-50/10">
                    <CardHeader>
                        <CardTitle className="text-sm uppercase text-muted-foreground tracking-wider">Movimientos</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className={`text-2xl font-bold tabular-nums ${movement.importe < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {formatCurrency(movement.importe)}
                            </p>
                            <p className="text-xs text-muted-foreground">{formatDate(movement.fecha)}</p>
                        </div>
                        <div className="pt-2 border-t border-blue-100">
                            <p className="text-sm font-medium">{movement.descripcion}</p>
                            {movement.referencia && (
                                <p className="text-xs text-muted-foreground mt-1">Ref: {movement.referencia}</p>
                            )}
                        </div>
                        <Badge variant="outline" className="bg-blue-100/50 text-blue-700 border-blue-200">
                            PENDIENTE
                        </Badge>
                    </CardContent>
                </Card>

                {/* Columna Derecha: Selector de Reconciliación */}
                <div className="md:col-span-2">
                    <ReconciliationSelector
                        movementId={params.id}
                        movementImporte={movement.importe}
                        suggestions={suggestions}
                    />
                </div>
            </div>
        </div>
    )
}
