import { createClient } from "@/lib/supabase/server"
import { PagosFijosManager } from "@/components/pagos-fijos/PagosFijosManager"

export const metadata = {
    title: "Pagos Fijos",
}

export default async function PagosFijosPage() {
    const supabase = await createClient()

    const { data: pagos } = await supabase
        .from("pagos_fijos")
        .select("*")
        .order("dia_inicio", { ascending: true })

    const { data: historial } = await supabase
        .from("historial_pagos_fijos")
        .select("*, pago_fijo:pagos_fijos(concepto)")
        .order("fecha_vencimiento", { ascending: false })

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Pagos Fijos y Recurrentes</h1>
                    <p className="text-muted-foreground">
                        Controla si has pagado el alquiler, luz, autónomos, etc. del mes.
                    </p>
                </div>
            </div>

            <PagosFijosManager
                pagosFijos={pagos as any || []}
                historialPagos={historial as any || []}
            />
        </div>
    )
}
