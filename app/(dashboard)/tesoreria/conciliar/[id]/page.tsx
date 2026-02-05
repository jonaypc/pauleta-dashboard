import { getReconciliationSuggestions, reconcileMovement } from "@/lib/actions/tesoreria"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDate } from "@/lib/utils"
import { ArrowLeft, CheckCircle2, AlertCircle, FileText, User, ShoppingBag } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"

interface PageProps {
    params: { id: string }
}

export default async function ConciliarDetallePage({ params }: PageProps) {
    const { movement, suggestions } = await getReconciliationSuggestions(params.id)

    if (movement.estado === 'conciliado') {
        redirect("/tesoreria")
    }

    async function handleConciliar(matchType: 'gasto' | 'factura', matchId: string) {
        'use server'
        await reconcileMovement(params.id, matchType, matchId)
        redirect("/tesoreria")
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-20">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/tesoreria">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Conciliar Movimiento</h1>
                    <p className="text-muted-foreground">Vincular transacción bancaria con factura o gasto.</p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Columna Izquierda: Información del Movimiento */}
                <Card className="md:col-span-1 border-blue-200 bg-blue-50/30">
                    <CardHeader>
                        <CardTitle className="text-sm uppercase text-muted-foreground tracking-wider">Movimiento Bancario</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="text-2xl font-bold tabular-nums">
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

                {/* Columna Derecha: Sugerencias */}
                <div className="md:col-span-2 space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        {suggestions.length > 0 ? (
                            <><CheckCircle2 className="h-5 w-5 text-green-500" /> Coincidencias encontradas ({suggestions.length})</>
                        ) : (
                            <><AlertCircle className="h-5 w-5 text-amber-500" /> No se encontraron coincidencias exactas</>
                        )}
                    </h3>

                    {suggestions.length > 0 ? (
                        <div className="grid gap-4">
                            {suggestions.map((s) => (
                                <Card key={s.id} className="hover:border-primary transition-colors border-dashed">
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div className="flex gap-4 items-center">
                                            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                                {s.type === 'gasto' ? <ShoppingBag className="h-5 w-5 text-amber-600" /> : <FileText className="h-5 w-5 text-blue-600" />}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold">{s.entity}</span>
                                                    <Badge variant="secondary" className="text-[10px] py-0">
                                                        {s.type === 'gasto' ? 'COMPRA' : 'VENTA'}
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    {s.reference || "Sin número"} • {formatDate(s.date)}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6">
                                            <div className="text-right">
                                                <p className="font-bold tabular-nums">{formatCurrency(s.amount)}</p>
                                                <p className="text-[10px] text-green-600 font-medium">COINCIDENCIA TOTAL</p>
                                            </div>

                                            <form action={handleConciliar.bind(null, s.type, s.id)}>
                                                <Button size="sm">Conciliar</Button>
                                            </form>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <Card className="bg-muted/20 border-dashed">
                            <CardContent className="p-12 text-center text-muted-foreground">
                                <p>No hay facturas o gastos pendientes con el importe exacto de **{formatCurrency(Math.abs(movement.importe))}** en fechas próximas.</p>
                                <div className="mt-4 flex flex-wrap justify-center gap-2">
                                    <Button variant="outline" size="sm" asChild>
                                        <Link href={movement.importe < 0 ? "/gastos/nuevo" : "/facturas/nueva"}>
                                            Crear {movement.importe < 0 ? 'Gasto' : 'Factura'}
                                        </Link>
                                    </Button>
                                    <Button variant="ghost" size="sm" asChild>
                                        <Link href="/tesoreria">Volver</Link>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    )
}
