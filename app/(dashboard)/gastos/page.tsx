import { createClient } from "@/lib/supabase/server"
import { GastosTable } from "@/components/gastos/GastosTable"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"

export const metadata = {
    title: "Gastos y Compras",
    description: "Control de facturas de proveedores",
}

export default async function GastosPage() {
    const supabase = await createClient()

    const { data: gastos } = await supabase
        .from("gastos")
        .select(`
            id,
            numero,
            fecha,
            importe,
            estado,
            categoria,
            archivo_url,
            proveedor:proveedores(nombre)
        `)
        .order("fecha", { ascending: false })

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Gastos y Compras</h1>
                    <p className="text-muted-foreground">
                        Gestiona las facturas de tus proveedores.
                    </p>
                </div>
                <Button asChild>
                    <Link href="/gastos/nuevo">
                        <Plus className="mr-2 h-4 w-4" />
                        Registrar Gasto
                    </Link>
                </Button>
            </div>

            <GastosTable gastos={gastos as any || []} />
        </div>
    )
}
