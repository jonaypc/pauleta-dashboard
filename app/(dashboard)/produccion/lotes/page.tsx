import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Package, Calendar, CheckCircle } from "lucide-react"

export const metadata = {
    title: "Lotes y Trazabilidad",
}

function formatDate(date: string): string {
    return new Date(date).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    })
}

function formatNumber(num: number): string {
    return new Intl.NumberFormat("es-ES", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(num)
}

function getDiasHastaCaducidad(fechaCaducidad: string): number {
    const hoy = new Date()
    const caducidad = new Date(fechaCaducidad)
    const diff = caducidad.getTime() - hoy.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

const ESTADO_COLORS: Record<string, string> = {
    disponible: "bg-green-100 text-green-700 border-green-200",
    reservado: "bg-blue-100 text-blue-700 border-blue-200",
    vendido: "bg-gray-100 text-gray-700 border-gray-200",
    caducado: "bg-red-100 text-red-700 border-red-200",
    retirado: "bg-orange-100 text-orange-700 border-orange-200",
    en_cuarentena: "bg-yellow-100 text-yellow-700 border-yellow-200",
}

const ESTADO_LABELS: Record<string, string> = {
    disponible: "Disponible",
    reservado: "Reservado",
    vendido: "Vendido",
    caducado: "Caducado",
    retirado: "Retirado",
    en_cuarentena: "En Cuarentena",
}

async function getLotes() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from("lotes_produccion")
        .select(`
            *,
            producto:productos(id, nombre),
            orden_produccion:ordenes_produccion(id, numero)
        `)
        .order("fecha_fabricacion", { ascending: false })

    if (error) {
        console.error("Error fetching lotes:", error)
        return []
    }

    return data
}

export default async function LotesPage() {
    const lotes = await getLotes()

    // Calcular estadísticas
    const lotesDisponibles = lotes.filter(l => l.estado === "disponible").length
    const lotesCaducando = lotes.filter(l => {
        const dias = getDiasHastaCaducidad(l.fecha_caducidad)
        return dias <= 30 && dias > 0 && l.estado === "disponible"
    }).length
    const lotesCaducados = lotes.filter(l => l.estado === "caducado").length
    const cantidadTotal = lotes.reduce((sum, l) => sum + (l.cantidad || 0), 0)

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Package className="h-7 w-7 text-primary" />
                        Lotes y Trazabilidad
                    </h1>
                    <p className="text-muted-foreground">
                        Control de caducidades y trazabilidad de producción
                    </p>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Lotes</CardTitle>
                        <Package className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{lotes.length}</div>
                        <p className="text-xs text-muted-foreground">
                            {formatNumber(cantidadTotal)} unidades
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Disponibles</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{lotesDisponibles}</div>
                        <p className="text-xs text-muted-foreground">
                            Lotes en stock
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Próximos a Caducar</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600">{lotesCaducando}</div>
                        <p className="text-xs text-muted-foreground">
                            En 30 días o menos
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Caducados</CardTitle>
                        <Calendar className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{lotesCaducados}</div>
                        <p className="text-xs text-muted-foreground">
                            Lotes vencidos
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Tabla de Lotes */}
            <Card>
                <CardHeader>
                    <CardTitle>Listado de Lotes</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted/50">
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                                        Número de Lote
                                    </th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                                        Producto
                                    </th>
                                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                                        Fabricación
                                    </th>
                                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                                        Caducidad
                                    </th>
                                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                                        Cantidad
                                    </th>
                                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                                        Días Restantes
                                    </th>
                                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                                        Estado
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {lotes.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-12 text-center">
                                            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                            <h3 className="text-lg font-semibold mb-2">No hay lotes registrados</h3>
                                            <p className="text-muted-foreground">
                                                Los lotes se crean automáticamente al completar órdenes de producción
                                            </p>
                                        </td>
                                    </tr>
                                ) : (
                                    lotes.map((lote: any) => {
                                        const diasRestantes = getDiasHastaCaducidad(lote.fecha_caducidad)
                                        const estaProximoACaducar = diasRestantes <= 30 && diasRestantes > 0
                                        const estaCaducado = diasRestantes <= 0

                                        return (
                                            <tr
                                                key={lote.id}
                                                className={`border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors ${estaCaducado ? "bg-red-50/50" : estaProximoACaducar ? "bg-amber-50/50" : ""
                                                    }`}
                                            >
                                                <td className="px-4 py-3">
                                                    <div className="font-mono text-sm font-medium">
                                                        {lote.numero_lote}
                                                    </div>
                                                    {lote.orden_produccion && (
                                                        <div className="text-xs text-muted-foreground">
                                                            Orden: {lote.orden_produccion.numero}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="font-medium">
                                                        {lote.producto?.nombre || "Sin producto"}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-center text-muted-foreground">
                                                    {formatDate(lote.fecha_fabricacion)}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={estaCaducado ? "text-red-600 font-semibold" : estaProximoACaducar ? "text-amber-600 font-semibold" : "text-muted-foreground"}>
                                                        {formatDate(lote.fecha_caducidad)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right font-medium tabular-nums">
                                                    {formatNumber(lote.cantidad)}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {estaCaducado ? (
                                                        <Badge className="bg-red-100 text-red-700 border-red-200">
                                                            Caducado
                                                        </Badge>
                                                    ) : estaProximoACaducar ? (
                                                        <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                                                            {diasRestantes} días
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-muted-foreground">
                                                            {diasRestantes} días
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <Badge className={`text-xs ${ESTADO_COLORS[lote.estado] || ""}`}>
                                                        {ESTADO_LABELS[lote.estado] || lote.estado}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
