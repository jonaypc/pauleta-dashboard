import { getOrdenesCompra, getEstadisticasOrdenesCompra } from "@/lib/actions/ordenes-compra"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Plus, ShoppingCart, CheckCircle, Clock, Package, DollarSign } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

export const metadata = {
    title: "Órdenes de Compra",
}

function formatDate(date: string): string {
    return new Date(date).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    })
}

const ESTADO_COLORS: Record<string, string> = {
    borrador: "bg-gray-100 text-gray-700 border-gray-200",
    enviada: "bg-blue-100 text-blue-700 border-blue-200",
    confirmada: "bg-purple-100 text-purple-700 border-purple-200",
    recibida_parcial: "bg-amber-100 text-amber-700 border-amber-200",
    recibida: "bg-green-100 text-green-700 border-green-200",
    cancelada: "bg-red-100 text-red-700 border-red-200",
}

const ESTADO_LABELS: Record<string, string> = {
    borrador: "Borrador",
    enviada: "Enviada",
    confirmada: "Confirmada",
    recibida_parcial: "Recibida Parcial",
    recibida: "Recibida",
    cancelada: "Cancelada",
}

export default async function OrdenesCompraPage() {
    const [ordenesResult, statsResult] = await Promise.all([
        getOrdenesCompra(),
        getEstadisticasOrdenesCompra(),
    ])

    if (ordenesResult.error) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-bold">Órdenes de Compra</h1>
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
        borradores: 0,
        enviadas: 0,
        confirmadas: 0,
        recibidas: 0,
        pendientes: 0,
        totalGastado: 0,
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <ShoppingCart className="h-7 w-7 text-primary" />
                        Órdenes de Compra
                    </h1>
                    <p className="text-muted-foreground">
                        Gestión de compras de materias primas
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button asChild>
                        <Link href="/produccion/ordenes-compra/nueva">
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
                        <ShoppingCart className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total}</div>
                        <p className="text-xs text-muted-foreground">
                            {stats.pendientes} pendientes
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
                        <Clock className="h-4 w-4 text-amber-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600">{stats.pendientes}</div>
                        <p className="text-xs text-muted-foreground">
                            Por recibir
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Recibidas</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{stats.recibidas}</div>
                        <p className="text-xs text-muted-foreground">
                            Órdenes completadas
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Gastado</CardTitle>
                        <DollarSign className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(stats.totalGastado)}</div>
                        <p className="text-xs text-muted-foreground">
                            En compras
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
                                        Proveedor
                                    </th>
                                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                                        Fecha
                                    </th>
                                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                                        Entrega Esperada
                                    </th>
                                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                                        Total
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
                                        <td colSpan={7} className="px-4 py-12 text-center">
                                            <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                            <h3 className="text-lg font-semibold mb-2">No hay órdenes de compra</h3>
                                            <p className="text-muted-foreground mb-4">
                                                Crea tu primera orden para comprar materias primas
                                            </p>
                                            <Button asChild>
                                                <Link href="/produccion/ordenes-compra/nueva">
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
                                                    href={`/produccion/ordenes-compra/${orden.id}`}
                                                    className="font-mono text-sm font-medium text-primary hover:underline"
                                                >
                                                    {orden.numero}
                                                </Link>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-medium">
                                                    {orden.proveedor?.nombre || "Sin proveedor"}
                                                </div>
                                                {orden.proveedor?.cif && (
                                                    <div className="text-xs text-muted-foreground">
                                                        {orden.proveedor.cif}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center text-muted-foreground">
                                                {formatDate(orden.fecha)}
                                            </td>
                                            <td className="px-4 py-3 text-center text-muted-foreground">
                                                {orden.fecha_entrega_esperada
                                                    ? formatDate(orden.fecha_entrega_esperada)
                                                    : "-"}
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium tabular-nums">
                                                {formatCurrency(orden.total)}
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
                                                    <Link href={`/produccion/ordenes-compra/${orden.id}`}>
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
