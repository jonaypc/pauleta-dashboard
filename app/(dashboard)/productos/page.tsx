import { createClient } from "@/lib/supabase/server"
import { ProductosTable } from "@/components/productos/ProductosTable"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { Plus, Search, Package } from "lucide-react"

export const metadata = {
    title: "Productos",
}

interface PageProps {
    searchParams: { q?: string }
}

export default async function ProductosPage({ searchParams }: PageProps) {
    const supabase = await createClient()
    const busqueda = searchParams.q || ""

    let query = supabase
        .from("productos")
        .select("*")
        .eq("activo", true)
        .order("nombre", { ascending: true })

    if (busqueda) {
        query = query.or(
            `nombre.ilike.%${busqueda}%,descripcion.ilike.%${busqueda}%,categoria.ilike.%${busqueda}%`
        )
    }

    const { data: productos, error } = await query

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Productos</h1>
                    <p className="text-muted-foreground">
                        Gestiona el catálogo de productos de Pauleta Canaria
                    </p>
                </div>
                <Button asChild>
                    <Link href="/productos/nuevo">
                        <Plus className="mr-2 h-4 w-4" />
                        Nuevo producto
                    </Link>
                </Button>
            </div>

            {/* Filtros */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <form className="relative flex-1 sm:max-w-sm">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        type="search"
                        name="q"
                        placeholder="Buscar por nombre, descripción o categoría..."
                        defaultValue={busqueda}
                        className="pl-9"
                    />
                </form>
            </div>

            {/* Tabla o estado vacío */}
            {productos && productos.length > 0 ? (
                <ProductosTable productos={productos} />
            ) : (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
                    <div className="rounded-full bg-muted p-4">
                        <Package className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold">No hay productos</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {busqueda
                            ? "No se encontraron productos con esa búsqueda"
                            : "Empieza creando tu primer producto"}
                    </p>
                    {!busqueda && (
                        <Button asChild className="mt-4">
                            <Link href="/productos/nuevo">
                                <Plus className="mr-2 h-4 w-4" />
                                Crear producto
                            </Link>
                        </Button>
                    )}
                </div>
            )}
        </div>
    )
}
