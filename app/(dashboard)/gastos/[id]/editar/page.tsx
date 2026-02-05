import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import { GastoForm } from "@/components/gastos/GastoForm"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

interface PageProps {
    params: { id: string }
}

export default async function EditGastoPage({ params }: PageProps) {
    const supabase = await createClient()

    const { data: gasto, error } = await supabase
        .from("gastos")
        .select(`
            *,
            proveedor:proveedores(*)
        `)
        .eq("id", params.id)
        .single()

    if (error || !gasto) {
        notFound()
    }

    // Adapt data for form
    const initialData = {
        id: gasto.id,
        numero: gasto.numero,
        fecha: gasto.fecha,
        nombre_proveedor: gasto.proveedor?.nombre,
        cif_proveedor: gasto.proveedor?.cif,
        importe: gasto.importe,
        estado: gasto.estado,
        categoria: gasto.categoria,
        metodo_pago: gasto.metodo_pago,
        notas: gasto.notas,
        archivo_url: gasto.archivo_url
    }

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href={`/gastos/${gasto.id}`}>
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Editar Gasto</h1>
                    <p className="text-muted-foreground">Modifica los detalles de la factura</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Datos del Gasto</CardTitle>
                </CardHeader>
                <CardContent>
                    <GastoForm initialData={initialData} />
                </CardContent>
            </Card>
        </div>
    )
}
