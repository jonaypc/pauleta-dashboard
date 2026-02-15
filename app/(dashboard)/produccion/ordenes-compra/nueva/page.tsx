import { createClient } from "@/lib/supabase/server"
import { OrdenCompraForm } from "@/components/produccion/OrdenCompraForm"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export const metadata = {
    title: "Nueva Orden de Compra",
}

export default async function NuevaOrdenCompraPage() {
    const supabase = await createClient()

    // Cargar proveedores activos
    const { data: proveedores, error: proveedoresError } = await supabase
        .from("proveedores")
        .select("*")
        .eq("activo", true)
        .order("nombre")

    // Cargar materias primas activas
    const { data: materiasPrimas, error: materiasError } = await supabase
        .from("materias_primas")
        .select("*")
        .eq("activo", true)
        .order("nombre")

    if (proveedoresError || materiasError) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-bold">Nueva Orden de Compra</h1>
                <Card className="border-destructive">
                    <CardContent className="pt-6">
                        <p className="text-destructive">
                            Error: {proveedoresError?.message || materiasError?.message}
                        </p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (!proveedores || proveedores.length === 0) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" asChild>
                        <Link href="/produccion/ordenes-compra">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Volver
                        </Link>
                    </Button>
                    <h1 className="text-2xl font-bold">Nueva Orden de Compra</h1>
                </div>
                <Card className="border-amber-500">
                    <CardContent className="pt-6 text-center space-y-4">
                        <p className="text-amber-600 font-medium">
                            No hay proveedores activos disponibles
                        </p>
                        <p className="text-muted-foreground text-sm">
                            Necesitas crear al menos un proveedor antes de poder hacer órdenes de compra
                        </p>
                        <Button asChild>
                            <Link href="/proveedores">
                                Ir a Proveedores
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (!materiasPrimas || materiasPrimas.length === 0) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" asChild>
                        <Link href="/produccion/ordenes-compra">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Volver
                        </Link>
                    </Button>
                    <h1 className="text-2xl font-bold">Nueva Orden de Compra</h1>
                </div>
                <Card className="border-amber-500">
                    <CardContent className="pt-6 text-center space-y-4">
                        <p className="text-amber-600 font-medium">
                            No hay materias primas activas disponibles
                        </p>
                        <p className="text-muted-foreground text-sm">
                            Necesitas crear al menos una materia prima antes de poder hacer órdenes de compra
                        </p>
                        <Button asChild>
                            <Link href="/produccion/materias-primas">
                                Ir a Materias Primas
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" asChild>
                    <Link href="/produccion/ordenes-compra">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Volver
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">Nueva Orden de Compra</h1>
                    <p className="text-muted-foreground">
                        Crear orden de compra de materias primas
                    </p>
                </div>
            </div>

            <OrdenCompraForm
                proveedores={proveedores}
                materiasPrimas={materiasPrimas}
            />
        </div>
    )
}
