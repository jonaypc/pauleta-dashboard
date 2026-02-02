import { createClient } from "@/lib/supabase/server"
import { PagosFijosManager } from "@/components/pagos-fijos/PagosFijosManager"
import { Button } from "@/components/ui/button"

export const metadata = {
    title: "Pagos Fijos",
}

export default async function PagosFijosPage() {
    const supabase = await createClient()

    const { data: pagos } = await supabase
        .from("pagos_fijos")
        .select("*")
        .order("dia_inicio", { ascending: true })

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Pagos Fijos</h1>
                    <p className="text-muted-foreground">
                        Gestión de pagos recurrentes y recordatorios
                    </p>
                </div>
            </div>

            <PagosFijosManager initialPagos={pagos || []} />
        </div>
    )
}
