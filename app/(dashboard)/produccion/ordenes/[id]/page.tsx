import { getOrdenProduccionById } from "@/lib/actions/ordenes-produccion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import {
    ArrowLeft,
    Factory,
    Package,
    Calendar,
    User,
    Clock,
    AlertCircle,
    CheckCircle2,
} from "lucide-react"
import { EstadoOrdenProduccionButtons } from "@/components/produccion/EstadoOrdenProduccionButtons"
import { ActualizarCantidadProducida } from "@/components/produccion/ActualizarCantidadProducida"

export const metadata = {
    title: "Detalle de Orden de Producción",
}

function formatNumber(num: number): string {
    return new Intl.NumberFormat("es-ES", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(num)
}

function formatDate(date: string): string {
    return new Date(date).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    })
}

function formatDateTime(date: string): string {
    return new Date(date).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    })
}

const ESTADO_COLORS: Record<string, string> = {
    planificada: "bg-blue-100 text-blue-700 border-blue-200",
    en_proceso: "bg-amber-100 text-amber-700 border-amber-200",
    completada: "bg-green-100 text-green-700 border-green-200",
    cancelada: "bg-gray-100 text-gray-700 border-gray-200",
    pausada: "bg-purple-100 text-purple-700 border-purple-200",
}

const ESTADO_LABELS: Record<string, string> = {
    planificada: "Planificada",
    en_proceso: "En Proceso",
    completada: "Completada",
    cancelada: "Cancelada",
    pausada: "Pausada",
}

export default async function OrdenProduccionDetailPage({
    params,
}: {
    params: { id: string }
}) {
    const result = await getOrdenProduccionById(params.id)

    if (result.error) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" asChild>
                        <Link href="/produccion/ordenes">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <h1 className="text-2xl font-bold">Error</h1>
                </div>
                <Card className="border-destructive">
                    <CardContent className="pt-6">
                        <p className="text-destructive">Error: {result.error}</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const orden = result.data

    if (!orden) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" asChild>
                        <Link href="/produccion/ordenes">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <h1 className="text-2xl font-bold">Orden no encontrada</h1>
                </div>
            </div>
        )
    }

    const ingredientes = (orden.receta as any)?.ingredientes || []
    const lotes = (orden.lotes as any) || []
    const porcentajeCompletado = orden.cantidad_planificada > 0
        ? (orden.cantidad_producida / orden.cantidad_planificada) * 100
        : 0

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" asChild>
                        <Link href="/produccion/ordenes">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            <Factory className="h-7 w-7 text-primary" />
                            Orden {orden.numero}
                        </h1>
                        <p className="text-muted-foreground">
                            {(orden.producto as any)?.nombre}
                        </p>
                    </div>
                </div>
                <Badge className={`text-sm ${ESTADO_COLORS[orden.estado] || ""}`}>
                    {ESTADO_LABELS[orden.estado] || orden.estado}
                </Badge>
            </div>

            {/* Acciones */}
            <div className="flex gap-2 flex-wrap">
                <EstadoOrdenProduccionButtons
                    ordenId={orden.id}
                    estadoActual={orden.estado}
                />
                {orden.estado === "en_proceso" && (
                    <ActualizarCantidadProducida
                        ordenId={orden.id}
                        cantidadActual={orden.cantidad_producida}
                        cantidadPlanificada={orden.cantidad_planificada}
                    />
                )}
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Información General */}
                <Card>
                    <CardHeader>
                        <CardTitle>Información General</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-muted-foreground flex items-center gap-2">
                                    <Package className="h-4 w-4" />
                                    Producto
                                </p>
                                <p className="font-medium">{(orden.producto as any)?.nombre}</p>
                            </div>

                            <div>
                                <p className="text-sm text-muted-foreground flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    Fecha Planificada
                                </p>
                                <p className="font-medium">{formatDate(orden.fecha_planificada)}</p>
                            </div>

                            <div>
                                <p className="text-sm text-muted-foreground">Cantidad Planificada</p>
                                <p className="font-medium">{formatNumber(orden.cantidad_planificada)}</p>
                            </div>

                            <div>
                                <p className="text-sm text-muted-foreground">Cantidad Producida</p>
                                <p className="font-medium text-green-600">
                                    {formatNumber(orden.cantidad_producida)}
                                </p>
                            </div>

                            <div>
                                <p className="text-sm text-muted-foreground">Prioridad</p>
                                <Badge variant="outline">P{orden.prioridad}</Badge>
                            </div>

                            <div>
                                <p className="text-sm text-muted-foreground">Progreso</p>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-muted rounded-full h-2">
                                        <div
                                            className="bg-primary h-2 rounded-full transition-all"
                                            style={{ width: `${Math.min(porcentajeCompletado, 100)}%` }}
                                        />
                                    </div>
                                    <span className="text-sm font-medium">
                                        {porcentajeCompletado.toFixed(0)}%
                                    </span>
                                </div>
                            </div>

                            {orden.operario_responsable && (
                                <div>
                                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                                        <User className="h-4 w-4" />
                                        Operario
                                    </p>
                                    <p className="font-medium">{orden.operario_responsable}</p>
                                </div>
                            )}

                            {orden.turno && (
                                <div>
                                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                                        <Clock className="h-4 w-4" />
                                        Turno
                                    </p>
                                    <p className="font-medium capitalize">{orden.turno}</p>
                                </div>
                            )}
                        </div>

                        {orden.fecha_inicio && (
                            <div className="pt-4 border-t">
                                <p className="text-sm text-muted-foreground">Fecha Inicio</p>
                                <p className="font-medium">{formatDateTime(orden.fecha_inicio)}</p>
                            </div>
                        )}

                        {orden.fecha_fin && (
                            <div>
                                <p className="text-sm text-muted-foreground">Fecha Fin</p>
                                <p className="font-medium">{formatDateTime(orden.fecha_fin)}</p>
                            </div>
                        )}

                        {orden.notas && (
                            <div className="pt-4 border-t">
                                <p className="text-sm text-muted-foreground">Notas</p>
                                <p className="text-sm">{orden.notas}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Costos */}
                <Card>
                    <CardHeader>
                        <CardTitle>Costos de Producción</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="text-sm text-muted-foreground">Costo Materias Primas</p>
                            <p className="text-2xl font-bold">
                                {formatNumber(orden.costo_materias_primas || 0)} €
                            </p>
                        </div>

                        <div>
                            <p className="text-sm text-muted-foreground">Costo Mano de Obra</p>
                            <p className="text-2xl font-bold">
                                {formatNumber(orden.costo_mano_obra || 0)} €
                            </p>
                        </div>

                        <div className="pt-4 border-t">
                            <p className="text-sm text-muted-foreground">Costo Total</p>
                            <p className="text-3xl font-bold text-primary">
                                {formatNumber(orden.costo_total || 0)} €
                            </p>
                        </div>

                        {orden.cantidad_producida > 0 && (
                            <div>
                                <p className="text-sm text-muted-foreground">Costo por Unidad</p>
                                <p className="text-lg font-medium">
                                    {formatNumber((orden.costo_total || 0) / orden.cantidad_producida)} €/ud
                                </p>
                            </div>
                        )}

                        {orden.receta && (
                            <div className="pt-4 border-t">
                                <p className="text-sm text-muted-foreground">Receta Utilizada</p>
                                <p className="font-medium">
                                    {(orden.receta as any).nombre} v{(orden.receta as any).version}
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Ingredientes Necesarios */}
            {ingredientes.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Materias Primas Necesarias</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-muted/50">
                                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                                            Materia Prima
                                        </th>
                                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                                            Cantidad Necesaria
                                        </th>
                                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                                            Stock Actual
                                        </th>
                                        <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                                            Estado
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ingredientes.map((ing: any) => {
                                        const cantidadNecesaria = ing.cantidad *
                                            (orden.cantidad_planificada / ((orden.receta as any)?.rendimiento || 1))
                                        const stockActual = ing.materia_prima?.stock_actual || 0
                                        const suficiente = stockActual >= cantidadNecesaria

                                        return (
                                            <tr
                                                key={ing.id}
                                                className="border-b border-border last:border-b-0"
                                            >
                                                <td className="px-4 py-3">
                                                    <div className="font-medium">
                                                        {ing.materia_prima?.nombre}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {ing.materia_prima?.codigo}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-right tabular-nums">
                                                    {formatNumber(cantidadNecesaria)} {ing.unidad}
                                                </td>
                                                <td className="px-4 py-3 text-right tabular-nums">
                                                    <span className={suficiente ? "text-green-600" : "text-red-600"}>
                                                        {formatNumber(stockActual)} {ing.unidad}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {suficiente ? (
                                                        <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto" />
                                                    ) : (
                                                        <AlertCircle className="h-5 w-5 text-red-600 mx-auto" />
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Lotes Generados */}
            {lotes.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Lotes Generados</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-muted/50">
                                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                                            Número de Lote
                                        </th>
                                        <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                                            Fecha Producción
                                        </th>
                                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                                            Cantidad
                                        </th>
                                        <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                                            Estado
                                        </th>
                                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                                            Acciones
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lotes.map((lote: any) => (
                                        <tr
                                            key={lote.id}
                                            className="border-b border-border last:border-b-0"
                                        >
                                            <td className="px-4 py-3 font-mono font-medium">
                                                {lote.numero_lote}
                                            </td>
                                            <td className="px-4 py-3 text-center text-muted-foreground">
                                                {formatDate(lote.fecha_produccion)}
                                            </td>
                                            <td className="px-4 py-3 text-right tabular-nums">
                                                {formatNumber(lote.cantidad)}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <Badge variant="outline" className="text-xs capitalize">
                                                    {lote.estado}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <Button variant="ghost" size="sm" asChild>
                                                    <Link href={`/produccion/lotes/${lote.id}`}>
                                                        Ver
                                                    </Link>
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
