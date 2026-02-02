import { createClient } from "@/lib/supabase/server"
import { EmpresaForm } from "@/components/configuracion/EmpresaForm"

export const metadata = {
    title: "Configuración",
}

export default async function ConfiguracionPage() {
    const supabase = await createClient()

    const { data: empresa } = await supabase
        .from("empresa")
        .select("*")
        .single()

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Configuración</h1>
                    <p className="text-muted-foreground">
                        Gestiona los datos de tu empresa para facturas y albaranes.
                    </p>
                </div>
            </div>

            <div className="grid gap-6">
                <EmpresaForm initialData={empresa} />
            </div>
        </div>
    )
}
