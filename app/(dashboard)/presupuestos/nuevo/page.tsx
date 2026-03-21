import { createClient } from "@/lib/supabase/server"
import { PresupuestoForm } from "@/components/presupuestos/PresupuestoForm"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export const metadata = {
    title: "Nuevo presupuesto",
}

export default async function NuevoPresupuestoPage() {
    const supabase = await createClient()

    const { data: clientes } = await supabase
        .from("clientes")
        .select("*")
        .eq("activo", true)
        .order("nombre")

    const { data: productos } = await supabase
        .from("productos")
        .select("*")
        .eq("activo", true)
        .order("nombre")

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/presupuestos">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Nuevo presupuesto</h1>
                    <p className="text-muted-foreground">
                        Crea un nuevo presupuesto para un cliente
                    </p>
                </div>
            </div>

            <PresupuestoForm clientes={clientes || []} productos={productos || []} />
        </div>
    )
}
