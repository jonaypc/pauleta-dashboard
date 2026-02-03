import { createClient } from "@/lib/supabase/server"
import { ProductoForm } from "@/components/productos/ProductoForm"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export const metadata = {
    title: "Nuevo producto",
}

export default async function NuevoProductoPage() {
    const supabase = await createClient()
    const { data: productos } = await supabase
        .from("productos")
        .select("*")
        .eq("activo", true)
        .order("nombre")

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/productos">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Nuevo producto</h1>
                    <p className="text-muted-foreground">
                        Añade un nuevo producto al catálogo
                    </p>
                </div>
            </div>

            {/* Formulario */}
            <div className="max-w-2xl">
                <ProductoForm allProductos={productos || []} />
            </div>
        </div>
    )
}
