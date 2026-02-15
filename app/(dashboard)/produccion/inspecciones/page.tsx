import { getInspecciones, getEstadisticasInspecciones } from "@/lib/actions/inspecciones"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Plus, ClipboardCheck, CheckCircle, XCircle, AlertCircle, Clock } from "lucide-react"

export const metadata = {
    title: "Inspecciones de Calidad",
}

function formatDate(date: string): string {
    return new Date(date).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    })
}

const RESULTADO_COLORS: Record<string, string> = {
    aprobado: "bg-green-100 text-green-700 border-green-200",
    rechazado: "bg-red-100 text-red-700 border-red-200",
    condicional: "bg-amber-100 text-amber-700 border-amber-200",
    en_revision: "bg-blue-100 text-blue-700 border-blue-200",
}

const RESULTADO_LABELS: Record<string, string> = {
    aprobado: "Aprobado",
    rechazado: "Rechazado",
    condicional: "Condicional",
    en_revision: "En Revisión",
}

const TIPO_LABELS: Record<string, string> = {
    materia_prima: "Materia Prima",
    proceso: "Proceso",
    producto_terminado: "Producto Terminado",
}

export default async function InspeccionesPage() {
    const [inspeccionesResult, statsResult] = await Promise.all([
        getInspecciones(),
        getEstadisticasInspecciones(),
    ])

    if (inspeccionesResult.error) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-bold">Inspecciones de Calidad</h1>
                <Card className="border-destructive">
                    <CardContent className="pt-6">
                        <p className="text-destructive">Error: {inspeccionesResult.error}</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const inspecciones = inspeccionesResult.data || []
    const stats = statsResult.data || {
        total: 0,
        aprobadas: 0,
        rechazadas: 0,
        condicionales: 0,
        enRevision: 0,
        porcentajeAprobado: 0,
        porTipo: { materia_prima: 0, proceso: 0, producto_terminado: 0 },
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <ClipboardCheck className="h-7 w-7 text-primary" />
                        Inspecciones de Calidad
                    </h1>
                    <p className="text-muted-foreground">
                        Registro y seguimiento de controles de calidad
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button asChild>
                        <Link href="/produccion/inspecciones/nueva">
                            <Plus className="mr-2 h-4 w-4" />
                            Nueva Inspección
                        </Link>
                    </Button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Inspecciones</CardTitle>
                        <ClipboardCheck className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total}</div>
                        <p className="text-xs text-muted-foreground">
                            {stats.enRevision} en revisión
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Aprobadas</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{stats.aprobadas}</div>
                        <p className="text-xs text-muted-foreground">
                            {stats.porcentajeAprobado.toFixed(1)}% del total
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Rechazadas</CardTitle>
                        <XCircle className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{stats.rechazadas}</div>
                        <p className="text-xs text-muted-foreground">
                            Control de calidad
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Condicionales</CardTitle>
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600">{stats.condicionales}</div>
                        <p className="text-xs text-muted-foreground">
                            Requieren seguimiento
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Lista de Inspecciones */}
            <Card>
                <CardHeader>
                    <CardTitle>Historial de Inspecciones</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted/50">
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                                        Fecha
                                    </th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                                        Tipo
                                    </th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                                        Referencia
                                    </th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                                        Inspector
                                    </th>
                                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                                        Inspeccionado
                                    </th>
                                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                                        Aprobado
                                    </th>
                                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                                        Resultado
                                    </th>
                                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {inspecciones.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-12 text-center">
                                            <ClipboardCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                            <h3 className="text-lg font-semibold mb-2">No hay inspecciones registradas</h3>
                                            <p className="text-muted-foreground mb-4">
                                                Crea la primera inspección de calidad
                                            </p>
                                            <Button asChild>
                                                <Link href="/produccion/inspecciones/nueva">
                                                    <Plus className="mr-2 h-4 w-4" />
                                                    Crear Primera Inspección
                                                </Link>
                                            </Button>
                                        </td>
                                    </tr>
                                ) : (
                                    inspecciones.map((inspeccion: any) => (
                                        <tr
                                            key={inspeccion.id}
                                            className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors"
                                        >
                                            <td className="px-4 py-3 text-muted-foreground">
                                                {formatDate(inspeccion.fecha)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge variant="outline" className="text-xs">
                                                    {TIPO_LABELS[inspeccion.tipo] || inspeccion.tipo}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3">
                                                {inspeccion.orden_produccion && (
                                                    <Link
                                                        href={`/produccion/ordenes/${inspeccion.orden_produccion.id}`}
                                                        className="text-primary hover:underline text-xs"
                                                    >
                                                        {inspeccion.orden_produccion.numero}
                                                    </Link>
                                                )}
                                                {inspeccion.lote_produccion && (
                                                    <Link
                                                        href={`/produccion/lotes/${inspeccion.lote_produccion.id}`}
                                                        className="text-primary hover:underline text-xs"
                                                    >
                                                        {inspeccion.lote_produccion.numero_lote}
                                                    </Link>
                                                )}
                                                {!inspeccion.orden_produccion && !inspeccion.lote_produccion && "-"}
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                {inspeccion.inspector || "-"}
                                            </td>
                                            <td className="px-4 py-3 text-center tabular-nums">
                                                {inspeccion.cantidad_inspeccionada || "-"}
                                            </td>
                                            <td className="px-4 py-3 text-center tabular-nums">
                                                <span className="text-green-600 font-medium">
                                                    {inspeccion.cantidad_aprobada || "-"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <Badge className={`text-xs ${RESULTADO_COLORS[inspeccion.resultado] || ""}`}>
                                                    {RESULTADO_LABELS[inspeccion.resultado] || inspeccion.resultado}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <Button variant="ghost" size="sm" asChild>
                                                    <Link href={`/produccion/inspecciones/${inspeccion.id}`}>
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
