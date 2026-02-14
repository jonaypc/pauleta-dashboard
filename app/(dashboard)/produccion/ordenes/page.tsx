import { getOrdenesProduccion, getEstadisticasOrdenes } from "@/lib/actions/ordenes-produccion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Plus, Factory, CheckCircle, Clock, XCircle, TrendingUp } from "lucide-react"

export const metadata = {
    title: "Órdenes de Producción",
}

function formatNumber(num: number): string {
    return new Intl.NumberFormat("es-ES", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(num)
}

function formatDate(date: string): string {
    return new Date(date).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
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

export default async function OrdenesProduccionPage() {
    const [ordenesResult, statsResult] = await Promise.all([
        getOrdenesProduccion(),
        getEstadisticasOrdenes(),
    ])

    if (ordenesResult.error) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-bold">Órdenes de Producción</h1>
                <Card className="border-destructive">
                    <CardContent className="pt-6">
                        <p className="text-destructive">Error: {ordenesResult.error}</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const ordenes = ordenesResult.data || []
    const stats = statsResult.data || {
        total: 0,
        planificadas: 0,
        enProceso: 0,
        completadas: 0,
        totalPlanificado: 0,
        totalProducido: 0,
        eficiencia: 0,
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Factory className="h-7 w-7 text-primary" />
                        Órdenes de Producción
                    </h1>
                    <p className="text-muted-foreground">
                        Planificación y seguimiento de producción
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button asChild>
                        <Link href="/produccion/ordenes/nueva">
                            <Plus className="mr-2 h-4 w-4" />
                            Nueva Orden
                        </Link>
                    </Button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Órdenes</CardTitle>
                        <Factory className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total}</div>
                        <p className="text-xs text-muted-foreground">
                            {stats.planificadas} planificadas
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">En Proceso</CardTitle>
                        <Clock className="h-4 w-4 text-amber-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600">{stats.enProceso}</div>
                        <p className="text-xs text-muted-foreground">
                            Órdenes activas
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Completadas</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{stats.completadas}</div>
                        <p className="text-xs text-muted-foreground">
                            Órdenes finalizadas
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Eficiencia</CardTitle>
                        <TrendingUp className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.eficiencia.toFixed(1)}%</div>
                        <p className="text-xs text-muted-foreground">
                            Producido vs planificado
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Lista de Órdenes */}
            <Card>
                <CardHeader>
                    <CardTitle>Listado de Órdenes</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted/50">
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                                        Número
                                    </th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                                        Producto
                                    </th>
                                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                                        Fecha
                                    </th>
                                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                                        Planificado
                                    </th>
                                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                                        Producido
                                    </th>
                                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                                        Prioridad
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
                                {ordenes.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-12 text-center">
                                            <Factory className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                            <h3 className="text-lg font-semibold mb-2">No hay órdenes de producción</h3>
                                            <p className="text-muted-foreground mb-4">
                                                Crea tu primera orden para comenzar a producir
                                            </p>
                                            <Button asChild>
                                                <Link href="/produccion/ordenes/nueva">
                                                    <Plus className="mr-2 h-4 w-4" />
                                                    Crear Primera Orden
                                                </Link>
                                            </Button>
                                        </td>
                                    </tr>
                                ) : (
                                    ordenes.map((orden: any) => (
                                        <tr
                                            key={orden.id}
                                            className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors"
                                        >
                                            <td className="px-4 py-3">
                                                <Link
                                                    href={`/produccion/ordenes/${orden.id}`}
                                                    className="font-mono text-sm font-medium text-primary hover:underline"
                                                >
                                                    {orden.numero}
                                                </Link>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-medium">
                                                    {orden.producto?.nombre || "Sin producto"}
                                                </div>
                                                {orden.receta && (
                                                    <div className="text-xs text-muted-foreground">
                                                        {orden.receta.nombre} (v{orden.receta.version})
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center text-muted-foreground">
                                                {formatDate(orden.fecha_planificada)}
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium tabular-nums">
                                                {formatNumber(orden.cantidad_planificada)}
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium tabular-nums">
                                                <span className={orden.cantidad_producida > 0 ? "text-green-600" : ""}>
                                                    {formatNumber(orden.cantidad_producida)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <Badge variant="outline" className="text-xs">
                                                    P{orden.prioridad}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <Badge
                                                    className={`text-xs ${ESTADO_COLORS[orden.estado] || ""}`}
                                                >
                                                    {ESTADO_LABELS[orden.estado] || orden.estado}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <Button variant="ghost" size="sm" asChild>
                                                    <Link href={`/produccion/ordenes/${orden.id}`}>
                                                        Ver
                                                    </Link>
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
