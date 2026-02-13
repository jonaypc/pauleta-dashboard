import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Plus, Factory, Package, ShoppingCart, ClipboardCheck, AlertTriangle, TrendingUp } from "lucide-react"

export const metadata = {
    title: "Producción",
}

async function getProductionStats() {
    const supabase = await createClient()

    try {
        // Órdenes de producción activas
        const { count: ordenesActivas } = await supabase
            .from("ordenes_produccion")
            .select("*", { count: 'exact', head: true })
            .in("estado", ["planificada", "en_proceso"])

        // Materias primas con stock bajo
        const { data: materiasTodasActivas } = await supabase
            .from("materias_primas")
            .select("stock_actual, stock_minimo")
            .eq("activo", true)

        const materiasBajas = materiasTodasActivas?.filter(
            m => m.stock_actual <= m.stock_minimo
        ) || []

        // Lotes próximos a caducar (30 días)
        const fechaLimite = new Date()
        fechaLimite.setDate(fechaLimite.getDate() + 30)
        const { count: lotesCaducando } = await supabase
            .from("lotes_produccion")
            .select("*", { count: 'exact', head: true })
            .lte("fecha_caducidad", fechaLimite.toISOString().split('T')[0])
            .eq("estado", "disponible")

        // Órdenes de compra pendientes
        const { count: comprasPendientes } = await supabase
            .from("ordenes_compra")
            .select("*", { count: 'exact', head: true })
            .in("estado", ["borrador", "enviada", "confirmada"])

        // Total de materias primas
        const { count: totalMaterias } = await supabase
            .from("materias_primas")
            .select("*", { count: 'exact', head: true })
            .eq("activo", true)

        // Total de recetas
        const { count: totalRecetas } = await supabase
            .from("recetas")
            .select("*", { count: 'exact', head: true })
            .eq("activa", true)

        return {
            ordenesActivas: ordenesActivas || 0,
            materiasBajas: materiasBajas.length,
            lotesCaducando: lotesCaducando || 0,
            comprasPendientes: comprasPendientes || 0,
            totalMaterias: totalMaterias || 0,
            totalRecetas: totalRecetas || 0,
        }
    } catch (error) {
        console.error("Error loading production stats:", error)
        return {
            ordenesActivas: 0,
            materiasBajas: 0,
            lotesCaducando: 0,
            comprasPendientes: 0,
            totalMaterias: 0,
            totalRecetas: 0,
        }
    }
}

export default async function ProduccionPage() {
    const stats = await getProductionStats()

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Factory className="h-7 w-7 text-primary" />
                        Módulo de Producción
                    </h1>
                    <p className="text-muted-foreground">
                        Gestión completa de manufactura de paletas de fruta
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

            {/* Alertas */}
            {(stats.materiasBajas > 0 || stats.lotesCaducando > 0) && (
                <div className="grid gap-4 md:grid-cols-2">
                    {stats.materiasBajas > 0 && (
                        <Card className="border-amber-200 bg-amber-50/50">
                            <CardHeader className="pb-3">
                                <div className="flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                                    <CardTitle className="text-base">Stock Bajo</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    {stats.materiasBajas} materia(s) prima(s) por debajo del stock mínimo
                                </p>
                                <Button variant="link" className="px-0 h-auto mt-2" asChild>
                                    <Link href="/produccion/materias-primas">Ver detalles →</Link>
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {stats.lotesCaducando > 0 && (
                        <Card className="border-red-200 bg-red-50/50">
                            <CardHeader className="pb-3">
                                <div className="flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5 text-red-600" />
                                    <CardTitle className="text-base">Lotes Próximos a Caducar</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    {stats.lotesCaducando} lote(s) caducan en los próximos 30 días
                                </p>
                                <Button variant="link" className="px-0 h-auto mt-2" asChild>
                                    <Link href="/produccion/lotes">Ver lotes →</Link>
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* KPIs */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Órdenes Activas</CardTitle>
                        <Factory className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.ordenesActivas}</div>
                        <p className="text-xs text-muted-foreground">
                            En planificación o proceso
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Materias Primas</CardTitle>
                        <Package className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalMaterias}</div>
                        <p className="text-xs text-muted-foreground">
                            Ingredientes activos
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Recetas</CardTitle>
                        <ClipboardCheck className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalRecetas}</div>
                        <p className="text-xs text-muted-foreground">
                            Fórmulas activas
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Compras Pendientes</CardTitle>
                        <ShoppingCart className="h-4 w-4 text-amber-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.comprasPendientes}</div>
                        <p className="text-xs text-muted-foreground">
                            Órdenes de compra
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Accesos Rápidos */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card className="hover:border-primary transition-colors cursor-pointer" asChild>
                    <Link href="/produccion/ordenes">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-blue-100">
                                    <Factory className="h-6 w-6 text-blue-600" />
                                </div>
                                <div>
                                    <CardTitle className="text-base">Órdenes de Producción</CardTitle>
                                    <CardDescription>Planificar y gestionar producción</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                    </Link>
                </Card>

                <Card className="hover:border-primary transition-colors cursor-pointer" asChild>
                    <Link href="/produccion/materias-primas">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-green-100">
                                    <Package className="h-6 w-6 text-green-600" />
                                </div>
                                <div>
                                    <CardTitle className="text-base">Materias Primas</CardTitle>
                                    <CardDescription>Inventario de ingredientes</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                    </Link>
                </Card>

                <Card className="hover:border-primary transition-colors cursor-pointer" asChild>
                    <Link href="/produccion/recetas">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-purple-100">
                                    <ClipboardCheck className="h-6 w-6 text-purple-600" />
                                </div>
                                <div>
                                    <CardTitle className="text-base">Recetas (BOM)</CardTitle>
                                    <CardDescription>Fórmulas y costos</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                    </Link>
                </Card>

                <Card className="hover:border-primary transition-colors cursor-pointer" asChild>
                    <Link href="/produccion/lotes">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-indigo-100">
                                    <TrendingUp className="h-6 w-6 text-indigo-600" />
                                </div>
                                <div>
                                    <CardTitle className="text-base">Lotes y Trazabilidad</CardTitle>
                                    <CardDescription>Control de caducidades</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                    </Link>
                </Card>

                <Card className="hover:border-primary transition-colors cursor-pointer" asChild>
                    <Link href="/produccion/compras">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-amber-100">
                                    <ShoppingCart className="h-6 w-6 text-amber-600" />
                                </div>
                                <div>
                                    <CardTitle className="text-base">Órdenes de Compra</CardTitle>
                                    <CardDescription>Compras a proveedores</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                    </Link>
                </Card>

                <Card className="hover:border-primary transition-colors cursor-pointer" asChild>
                    <Link href="/produccion/calidad">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-rose-100">
                                    <ClipboardCheck className="h-6 w-6 text-rose-600" />
                                </div>
                                <div>
                                    <CardTitle className="text-base">Control de Calidad</CardTitle>
                                    <CardDescription>Inspecciones y auditorías</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                    </Link>
                </Card>
            </div>

            {/* Banner informativo */}
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                <CardHeader>
                    <CardTitle className="text-lg">🎉 Módulo de Producción Activado</CardTitle>
                    <CardDescription className="text-base">
                        Ahora puedes gestionar todo el proceso de manufactura: desde la compra de materias primas hasta la trazabilidad completa de cada lote producido.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">✅ Materias Primas</Badge>
                        <Badge variant="secondary">✅ Recetas (BOM)</Badge>
                        <Badge variant="secondary">✅ Órdenes de Producción</Badge>
                        <Badge variant="secondary">✅ Lotes y Trazabilidad</Badge>
                        <Badge variant="secondary">✅ Control de Caducidades</Badge>
                        <Badge variant="secondary">✅ Órdenes de Compra</Badge>
                        <Badge variant="secondary">✅ Control de Calidad</Badge>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
