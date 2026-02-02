import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { ProductoForm } from "@/components/productos/ProductoForm"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { ArrowLeft, Pencil, Package, Tag, Calendar } from "lucide-react"
import { formatDate } from "@/lib/utils"

interface PageProps {
    params: { id: string }
    searchParams: { editar?: string }
}

// Formatea el precio con el símbolo del euro
function formatPrecio(precio: number): string {
    return new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency: "EUR",
    }).format(precio)
}

// Mapea la unidad a texto legible
function formatUnidad(unidad: string): string {
    const unidades: Record<string, string> = {
        unidad: "Unidad",
        caja: "Caja",
        kg: "Kilogramo (Kg)",
    }
    return unidades[unidad] || unidad
}

export async function generateMetadata({ params }: PageProps) {
    const supabase = await createClient()
    const { data: producto } = await supabase
        .from("productos")
        .select("nombre")
        .eq("id", params.id)
        .single()

    return {
        title: producto?.nombre || "Producto",
    }
}

export default async function ProductoDetailPage({
    params,
    searchParams,
}: PageProps) {
    const supabase = await createClient()
    const isEditing = searchParams.editar === "true"

    const { data: producto, error } = await supabase
        .from("productos")
        .select("*")
        .eq("id", params.id)
        .single()

    if (error || !producto) {
        notFound()
    }

    if (isEditing) {
        return (
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href={`/productos/${params.id}`}>
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Editar producto
                        </h1>
                        <p className="text-muted-foreground">{producto.nombre}</p>
                    </div>
                </div>

                {/* Formulario */}
                <div className="max-w-2xl">
                    <ProductoForm producto={producto} />
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/productos">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold tracking-tight">
                                {producto.nombre}
                            </h1>
                            <Badge variant={producto.activo ? "cobrada" : "borrador"}>
                                {producto.activo ? "Activo" : "Inactivo"}
                            </Badge>
                        </div>
                        {producto.categoria && (
                            <p className="text-muted-foreground">
                                Categoría: {producto.categoria}
                            </p>
                        )}
                    </div>
                </div>
                <Button asChild>
                    <Link href={`/productos/${params.id}?editar=true`}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                    </Link>
                </Button>
            </div>

            {/* Grid de información */}
            <div className="grid gap-6 lg:grid-cols-3">
                {/* Columna principal */}
                <div className="space-y-6 lg:col-span-2">
                    {/* Datos del producto */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Package className="h-5 w-5" />
                                Datos del producto
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <p className="text-sm font-medium text-muted-foreground">
                                    Nombre
                                </p>
                                <p className="mt-1 text-lg font-medium">{producto.nombre}</p>
                            </div>
                            {producto.descripcion && (
                                <div className="sm:col-span-2">
                                    <p className="text-sm font-medium text-muted-foreground">
                                        Descripción
                                    </p>
                                    <p className="mt-1 whitespace-pre-wrap">
                                        {producto.descripcion}
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Precio y configuración */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Tag className="h-5 w-5" />
                                Precio y configuración
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 sm:grid-cols-3">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">
                                    Precio
                                </p>
                                <p className="mt-1 text-2xl font-bold text-primary">
                                    {formatPrecio(producto.precio)}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">
                                    Unidad
                                </p>
                                <p className="mt-1 text-lg">{formatUnidad(producto.unidad)}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">
                                    IGIC
                                </p>
                                <p className="mt-1 text-lg">{producto.igic}%</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Información */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Calendar className="h-5 w-5" />
                                Información
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Estado</span>
                                <Badge variant={producto.activo ? "cobrada" : "borrador"}>
                                    {producto.activo ? "Activo" : "Inactivo"}
                                </Badge>
                            </div>
                            {producto.categoria && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Categoría</span>
                                    <span>{producto.categoria}</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Creado</span>
                                <span>{formatDate(producto.created_at)}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
