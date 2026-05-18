"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { toast } from "@/hooks/use-toast"
import { FileText, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface ConvertirAFacturaButtonProps {
    presupuestoId: string
    presupuestoNumero: string
}

export function ConvertirAFacturaButton({
    presupuestoId,
    presupuestoNumero,
}: ConvertirAFacturaButtonProps) {
    const router = useRouter()
    const supabase = createClient()
    const [isLoading, setIsLoading] = useState(false)

    const handleConvertir = async () => {
        setIsLoading(true)

        try {
            // 1. Obtener presupuesto con líneas
            const { data: presupuesto, error: fetchError } = await supabase
                .from("presupuestos")
                .select(`
                    *,
                    lineas:lineas_presupuesto(*)
                `)
                .eq("id", presupuestoId)
                .single()

            if (fetchError || !presupuesto) throw new Error("No se pudo obtener el presupuesto")

            // 2. Generar número de factura
            const { data: numeroFactura, error: numError } = await supabase.rpc(
                "generar_numero_factura"
            )
            if (numError) throw numError

            // 3. Crear factura (directamente emitida)
            const { data: nuevaFactura, error: facturaError } = await supabase
                .from("facturas")
                .insert({
                    numero: numeroFactura,
                    cliente_id: presupuesto.cliente_id,
                    fecha: new Date().toISOString().split("T")[0],
                    notas: presupuesto.notas ? `Desde presupuesto ${presupuestoNumero}. ${presupuesto.notas}` : `Desde presupuesto ${presupuestoNumero}`,
                    estado: "emitida",
                    base_imponible: presupuesto.base_imponible,
                    igic: presupuesto.igic,
                    total: presupuesto.total,
                })
                .select("id")
                .single()

            if (facturaError) throw facturaError

            // 4. Crear líneas de factura desde líneas de presupuesto
            if (presupuesto.lineas && presupuesto.lineas.length > 0) {
                const lineasFactura = presupuesto.lineas.map((l: any) => ({
                    factura_id: nuevaFactura.id,
                    producto_id: l.producto_id || null,
                    descripcion: l.descripcion,
                    cantidad: l.cantidad,
                    precio_unitario: l.precio_unitario,
                    igic: l.igic,
                    subtotal: l.subtotal,
                }))

                const { error: lineasError } = await supabase
                    .from("lineas_factura")
                    .insert(lineasFactura)

                if (lineasError) throw lineasError
            }

            // 5. Marcar presupuesto como facturado
            const { error: updateError } = await supabase
                .from("presupuestos")
                .update({
                    estado: "facturado",
                    factura_id: nuevaFactura.id,
                })
                .eq("id", presupuestoId)

            if (updateError) throw updateError

            toast({
                title: "Factura creada",
                description: `Se ha creado la factura ${numeroFactura} desde el presupuesto ${presupuestoNumero}`,
                variant: "success",
            })

            // Redirigir a la factura creada
            router.push(`/facturas/${nuevaFactura.id}`)
            router.refresh()
        } catch (error: any) {
            console.error("Error converting presupuesto to factura:", error)
            toast({
                title: "Error",
                description: error.message || "Error al convertir a factura",
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700" disabled={isLoading}>
                    {isLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <FileText className="mr-2 h-4 w-4" />
                    )}
                    Convertir a factura
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Convertir a factura</AlertDialogTitle>
                    <AlertDialogDescription>
                        Se creará una nueva factura con los datos del presupuesto {presupuestoNumero}.
                        El presupuesto quedará marcado como &quot;facturado&quot;.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConvertir} disabled={isLoading}>
                        {isLoading ? "Convirtiendo..." : "Confirmar"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
