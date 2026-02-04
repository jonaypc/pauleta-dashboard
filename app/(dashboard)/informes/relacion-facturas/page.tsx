import { createClient } from "@/lib/supabase/server"
import { RelacionFacturasGenerator } from "@/components/informes/RelacionFacturasGenerator"

export const metadata = {
    title: "Relación de Facturas | Pauleta",
}

export default async function RelacionFacturasPage() {
    const supabase = await createClient()

    // Cargar clientes activos (filtrar por los que tienen facturas)
    const { data: clientes } = await supabase
        .from("clientes")
        .select("id, nombre, cif, persona_contacto")
        .eq("activo", true)
        .order("nombre")

    // Cargar datos de empresa
    const { data: empresa } = await supabase
        .from("empresa")
        .select("*")
        .single()

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Relación de Facturas</h1>
                <p className="text-muted-foreground">
                    Genera una relación de facturas para presentar a clientes como SPAR/Excodimo
                </p>
            </div>

            <RelacionFacturasGenerator 
                clientes={clientes || []} 
                empresa={empresa}
            />
        </div>
    )
}
