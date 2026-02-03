import { createClient } from "@/lib/supabase/server"
import { PDFInvoiceImporter } from "@/components/facturas/PDFInvoiceImporter"

export const metadata = {
    title: "Importar Facturas PDF",
}

export default async function ImportarPDFPage() {
    const supabase = await createClient()

    // Cargar datos para el matching
    const [clientesRes, productosRes] = await Promise.all([
        supabase.from('clientes').select('id, nombre, cif'),
        supabase.from('productos').select('id, nombre, codigo_barras')
    ])

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Importar Facturas PDF</h1>
                <p className="text-muted-foreground">
                    Procesa archivos PDF de QuickBooks para crear facturas automáticamente.
                </p>
            </div>

            <PDFInvoiceImporter
                clientes={clientesRes.data || []}
                productos={productosRes.data || []}
            />
        </div>
    )
}
