import { createClient } from "@/lib/supabase/server"
import { FacturaForm } from "@/components/facturas/FacturaForm"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export const metadata = {
    title: "Nueva factura",
}

export default async function NuevaFacturaPage() {
    const supabase = await createClient()

    // Obtener clientes activos
    const { data: clientes } = await supabase
        .from("clientes")
        .select("*")
        .eq("activo", true)
        .order("nombre")

    // Obtener productos activos
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
                    <Link href="/facturas">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Nueva factura</h1>
                    <p className="text-muted-foreground">
                        Crea una nueva factura para un cliente
                    </p>
                </div>
            </div>

            {/* Formulario */}
            <FacturaForm clientes={clientes || []} productos={productos || []} />
        </div>
    )
}
