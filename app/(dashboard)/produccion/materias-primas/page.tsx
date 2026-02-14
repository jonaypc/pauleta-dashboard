import { getMateriasPrimas, getEstadisticasMateriasPrimas } from "@/lib/actions/materias-primas"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MateriasPrimasTable } from "@/components/produccion/MateriasPrimasTable"
import Link from "next/link"
import { Plus, Package, AlertTriangle, TrendingDown, DollarSign } from "lucide-react"

export const metadata = {
    title: "Materias Primas - Producción",
}

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency: "EUR",
    }).format(amount)
}

export default async function MateriasPrimasPage() {
    const [materiasResult, statsResult] = await Promise.all([
        getMateriasPrimas(),
        getEstadisticasMateriasPrimas(),
    ])

    if (materiasResult.error) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Materias Primas</h1>
                </div>
                <Card className="border-destructive">
                    <CardContent className="pt-6">
                        <p className="text-destructive">Error: {materiasResult.error}</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const materiasPrimas = materiasResult.data || []
    const stats = statsResult.data || { total: 0, stockBajo: 0, sinStock: 0, valorTotal: 0 }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Package className="h-7 w-7 text-primary" />
                        Materias Primas
                    </h1>
                    <p className="text-muted-foreground">
                        Gestión de inventario de ingredientes y materiales
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button asChild>
                        <Link href="/produccion/materias-primas/nueva">
                            <Plus className="mr-2 h-4 w-4" />
                            Nueva Materia Prima
                        </Link>
                    </Button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Materias Primas</CardTitle>
                        <Package className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total}</div>
                        <p className="text-xs text-muted-foreground">
                            Ingredientes activos
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600">{stats.stockBajo}</div>
                        <p className="text-xs text-muted-foreground">
                            Por debajo del mínimo
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Sin Stock</CardTitle>
                        <TrendingDown className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{stats.sinStock}</div>
                        <p className="text-xs text-muted-foreground">
                            Stock agotado
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
                        <DollarSign className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(stats.valorTotal)}</div>
                        <p className="text-xs text-muted-foreground">
                            Inventario valorado
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Tabla */}
            <Card>
                <CardHeader>
                    <CardTitle>Listado de Materias Primas</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <MateriasPrimasTable materiasPrimas={materiasPrimas} />
                </CardContent>
            </Card>
        </div>
    )
}
