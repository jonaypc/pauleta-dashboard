import { createClient } from "@/lib/supabase/server"
import { ProductBarcodeUpdater } from "@/components/productos/ProductBarcodeUpdater"

export const metadata = {
    title: "Importar Códigos de Barras",
}

export default async function ImportarProductosPage() {
    const supabase = await createClient()

    const { data: productos } = await supabase
        .from("productos")
        .select("id, nombre, codigo_barras")

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Actualizar Códigos de Barras</h1>
                <p className="text-muted-foreground">
                    Sube tu Excel de productos para asignar códigos de barras automáticamente a los productos existentes.
                </p>
            </div>

            <ProductBarcodeUpdater productosExistentes={productos || []} />
        </div>
    )
}
