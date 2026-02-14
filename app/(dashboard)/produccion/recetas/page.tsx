import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Plus, ClipboardCheck, Package, Clock, DollarSign } from "lucide-react"

export const metadata = {
    title: "Recetas - Producción",
}

interface Receta {
    id: string
    nombre: string
    version: number
    rendimiento: number
    tiempo_preparacion: number | null
    tiempo_congelacion: number | null
    activa: boolean
    created_at: string
    producto: {
        id: string
        nombre: string
    }
    ingredientes: Array<{
        id: string
        cantidad: number
        unidad: string
        materia_prima: {
            id: string
            nombre: string
            codigo: string
            costo_promedio: number
        }
    }>
}

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency: "EUR",
    }).format(amount)
}

function formatNumber(num: number): string {
    return new Intl.NumberFormat("es-ES", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(num)
}

async function getRecetas() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from("recetas")
        .select(`
            *,
            producto:productos(id, nombre),
            ingredientes:receta_ingredientes(
                id,
                cantidad,
                unidad,
                materia_prima:materias_primas(id, nombre, codigo, costo_promedio)
            )
        `)
        .order("created_at", { ascending: false })

    if (error) {
        console.error("Error fetching recetas:", error)
        return []
    }

    return data as Receta[]
}

export default async function RecetasPage() {
    const recetas = await getRecetas()
    const recetasActivas = recetas.filter(r => r.activa)

    // Calcular costo promedio de recetas
    const costoTotal = recetas.reduce((sum, receta) => {
        const costoReceta = receta.ingredientes?.reduce((s, ing) =>
            s + (ing.cantidad * (ing.materia_prima?.costo_promedio || 0)), 0) || 0
        return sum + costoReceta
    }, 0)

    const costoPromedio = recetas.length > 0 ? costoTotal / recetas.length : 0

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <ClipboardCheck className="h-7 w-7 text-primary" />
                        Recetas (BOM)
                    </h1>
                    <p className="text-muted-foreground">
                        Fórmulas de producción y costos de materias primas
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button asChild>
                        <Link href="/produccion/recetas/nueva">
                            <Plus className="mr-2 h-4 w-4" />
                            Nueva Receta
                        </Link>
                    </Button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Recetas</CardTitle>
                        <ClipboardCheck className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{recetas.length}</div>
                        <p className="text-xs text-muted-foreground">
                            {recetasActivas.length} activas
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Productos con Receta</CardTitle>
                        <Package className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {new Set(recetas.map(r => r.producto?.id)).size}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Productos configurados
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Costo Promedio</CardTitle>
                        <DollarSign className="h-4 w-4 text-amber-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(costoPromedio)}</div>
                        <p className="text-xs text-muted-foreground">
                            Por receta
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tiempo Promedio</CardTitle>
                        <Clock className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {Math.round(recetas.reduce((sum, r) =>
                                sum + (r.tiempo_preparacion || 0) + (r.tiempo_congelacion || 0), 0) / (recetas.length || 1))} min
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Producción total
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Lista de Recetas */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {recetas.length === 0 ? (
                    <Card className="col-span-full">
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <ClipboardCheck className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No hay recetas creadas</h3>
                            <p className="text-muted-foreground text-center mb-4">
                                Crea tu primera receta para definir los ingredientes y costos de producción
                            </p>
                            <Button asChild>
                                <Link href="/produccion/recetas/nueva">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Crear Primera Receta
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    recetas.map((receta) => {
                        const costoTotal = receta.ingredientes?.reduce((sum, ing) =>
                            sum + (ing.cantidad * (ing.materia_prima?.costo_promedio || 0)), 0) || 0
                        const costoUnitario = receta.rendimiento > 0 ? costoTotal / receta.rendimiento : 0

                        return (
                            <Link key={receta.id} href={`/produccion/recetas/${receta.id}`}>
                                <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                                    <CardHeader>
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <CardTitle className="text-base mb-1">
                                                    {receta.nombre}
                                                </CardTitle>
                                                <p className="text-sm text-muted-foreground">
                                                    {receta.producto?.nombre || "Sin producto"}
                                                </p>
                                            </div>
                                            <Badge variant={receta.activa ? "success" : "secondary"} className="ml-2">
                                                v{receta.version}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {/* Rendimiento */}
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Rendimiento:</span>
                                            <span className="font-medium">{formatNumber(receta.rendimiento)} uds</span>
                                        </div>

                                        {/* Ingredientes */}
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Ingredientes:</span>
                                            <span className="font-medium">{receta.ingredientes?.length || 0}</span>
                                        </div>

                                        {/* Tiempo */}
                                        {(receta.tiempo_preparacion || receta.tiempo_congelacion) && (
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-muted-foreground">Tiempo total:</span>
                                                <span className="font-medium">
                                                    {(receta.tiempo_preparacion || 0) + (receta.tiempo_congelacion || 0)} min
                                                </span>
                                            </div>
                                        )}

                                        {/* Costos */}
                                        <div className="pt-3 border-t space-y-2">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-muted-foreground">Costo total:</span>
                                                <span className="font-semibold">{formatCurrency(costoTotal)}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-muted-foreground">Costo unitario:</span>
                                                <span className="font-semibold text-primary">
                                                    {formatCurrency(costoUnitario)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Lista de ingredientes */}
                                        {receta.ingredientes && receta.ingredientes.length > 0 && (
                                            <div className="pt-3 border-t">
                                                <p className="text-xs font-medium text-muted-foreground mb-2">
                                                    Ingredientes principales:
                                                </p>
                                                <div className="space-y-1">
                                                    {receta.ingredientes.slice(0, 3).map((ing) => (
                                                        <div key={ing.id} className="flex items-center justify-between text-xs">
                                                            <span className="text-muted-foreground truncate">
                                                                {ing.materia_prima?.nombre || "Sin nombre"}
                                                            </span>
                                                            <span className="font-medium ml-2 whitespace-nowrap">
                                                                {formatNumber(ing.cantidad)} {ing.unidad}
                                                            </span>
                                                        </div>
                                                    ))}
                                                    {receta.ingredientes.length > 3 && (
                                                        <p className="text-xs text-muted-foreground italic">
                                                            +{receta.ingredientes.length - 3} más...
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </Link>
                        )
                    })
                )}
            </div>
        </div>
    )
}
