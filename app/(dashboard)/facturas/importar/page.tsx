import { InvoiceImporter } from "@/components/facturas/InvoiceImporter"
import { createClient } from "@/lib/supabase/server"

export const metadata = {
    title: "Importar Facturas",
}

export default async function ImportarFacturasPage() {
    const supabase = await createClient()

    // Fetch master data needed for matching
    const { data: clientes } = await supabase.from("clientes").select("id, nombre")
    const { data: productos } = await supabase.from("productos").select("id, nombre")

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Importar Facturas</h1>
                <p className="text-muted-foreground">
                    Carga tus facturas antiguas desde Excel (formato QuickBooks o estándar).
                </p>
            </div>

            <InvoiceImporter
                clientesExistentes={clientes || []}
                productosExistentes={productos || []}
            />
        </div>
    )
}
