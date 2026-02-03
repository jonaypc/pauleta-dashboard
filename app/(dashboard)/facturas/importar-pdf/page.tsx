import { createClient } from "@/lib/supabase/server"
import dynamic from "next/dynamic"

// Cargar dinámicamente para evitar errores de SSR con pdfjs-dist
const PDFInvoiceImporter = dynamic(
    () => import("@/components/facturas/PDFInvoiceImporter"),
    { ssr: false }
)

export const metadata = {
    title: "Importar Facturas PDF | Pauleta",
}

export default async function ImportarPDFPage() {
    const supabase = await createClient()

    // Cargar clientes y productos para el matching (incluyendo dirección y persona_contacto para diferenciar sucursales)
    const { data: clientes } = await supabase.from("clientes").select("id, nombre, cif, direccion, ciudad, codigo_postal, persona_contacto")
    const { data: productos } = await supabase.from("productos").select("id, nombre, codigo_barras, igic")

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Importar Facturas PDF</h1>
                <p className="text-muted-foreground">
                    Sistema automatizado para importar facturas desde QuickBooks.
                </p>
            </div>

            <PDFInvoiceImporter
                clientes={clientes || []}
                productos={productos?.map((p: any) => ({
                    ...p,
                    // Asegurar que igic sea numérico
                    igic: Number(p.igic || 7)
                })) || []}
            />
        </div>
    )
}
