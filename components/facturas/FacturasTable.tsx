"use client"
import { useState } from "react"
import Link from "next/link"
import { MoreHorizontal, Eye, Pencil, Send, XCircle, CheckCircle, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CobroForm } from "@/components/cobros/CobroForm"
import type { Factura, EstadoFactura } from "@/types"
import { createClient } from "@/lib/supabase/client"
import { toast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

interface FacturasTableProps {
    facturas: (Factura & { cliente?: { nombre: string } })[]
    onEmitir?: (factura: Factura) => void
    onCobrar?: (factura: Factura) => void
    onAnular?: (factura: Factura) => void
}

// Formatea el precio con el símbolo del euro
function formatPrecio(precio: number): string {
    return new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency: "EUR",
    }).format(precio)
}

// Formatea fecha a formato español
function formatFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    })
}

// Mapea estado a variante de badge
function getEstadoVariant(estado: EstadoFactura): "borrador" | "emitida" | "cobrada" | "anulada" {
    return estado
}

// Mapea estado a texto legible
function getEstadoLabel(estado: EstadoFactura): string {
    const labels: Record<EstadoFactura, string> = {
        borrador: "Borrador",
        emitida: "Emitida",
        cobrada: "Cobrada",
        anulada: "Anulada",
    }
    return labels[estado]
}

export function FacturasTable({
    facturas,
    onEmitir,
    onCobrar,
    onAnular,
}: FacturasTableProps) {
    const router = useRouter()
    const supabase = createClient()
    const [facturaParaCobrar, setFacturaParaCobrar] = useState<Factura | null>(null)
    const [isActionLoading, setIsActionLoading] = useState(false)

    const handleEmitir = async (factura: Factura) => {
        setIsActionLoading(true)
        try {
            const { error } = await supabase
                .from("facturas")
                .update({ estado: "emitida" })
                .eq("id", factura.id)

            if (error) throw error

            toast({
                title: "Factura emitida",
                description: `La factura ${factura.numero} ahora está emitida.`,
                variant: "success",
            })
            router.refresh()
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            })
        } finally {
            setIsActionLoading(false)
        }
    }

    const handleAnular = async (factura: Factura) => {
        if (!confirm(`¿Estás seguro de que quieres anular la factura ${factura.numero}?`)) return

        setIsActionLoading(true)
        try {
            const { error } = await supabase
                .from("facturas")
                .update({ estado: "anulada" })
                .eq("id", factura.id)

            if (error) throw error

            toast({
                title: "Factura anulada",
                description: `La factura ${factura.numero} ha sido anulada.`,
                variant: "success",
            })
            router.refresh()
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            })
        } finally {
            setIsActionLoading(false)
        }
    }

    const handleDelete = async (factura: Factura) => {
        setIsActionLoading(true)
        try {
            // Eliminar líneas primero (aunque ON DELETE CASCADE debería manejarlo, es más seguro)
            const { error: errorLineas } = await supabase
                .from("lineas_factura")
                .delete()
                .eq("factura_id", factura.id)

            if (errorLineas) throw errorLineas

            // Eliminar factura
            const { error } = await supabase
                .from("facturas")
                .delete()
                .eq("id", factura.id)

            if (error) throw error

            toast({
                title: "Factura eliminada",
                description: `La factura ${factura.numero} ha sido eliminada correctamente.`,
                variant: "success",
            })
            router.refresh()
        } catch (error: any) {
            console.error("Error deleting invoice:", error)
            toast({
                title: "Error",
                description: error.message || "No se pudo eliminar la factura",
                variant: "destructive",
            })
        } finally {
            setIsActionLoading(false)
        }
    }
    return (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-border bg-muted/50">
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                            Número
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                            Fecha
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                            Cliente
                        </th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                            Total
                        </th>
                        <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                            Estado
                        </th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                            Acciones
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {facturas.length === 0 ? (
                        <tr>
                            <td
                                colSpan={6}
                                className="px-4 py-8 text-center text-muted-foreground"
                            >
                                No hay facturas registradas
                            </td>
                        </tr>
                    ) : (
                        facturas.map((factura) => (
                            <tr
                                key={factura.id}
                                className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors"
                            >
                                <td className="px-4 py-3">
                                    <Link
                                        href={`/facturas/${factura.id}`}
                                        className="font-medium text-primary hover:underline"
                                    >
                                        {factura.numero}
                                    </Link>
                                </td>
                                <td className="px-4 py-3 text-muted-foreground">
                                    {formatFecha(factura.fecha)}
                                </td>
                                <td className="px-4 py-3">
                                    {factura.cliente?.nombre || "Sin cliente"}
                                </td>
                                <td className="px-4 py-3 text-right font-medium tabular-nums">
                                    {formatPrecio(factura.total)}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <Badge
                                        variant={getEstadoVariant(factura.estado)}
                                        dot
                                        className="text-xs"
                                    >
                                        {getEstadoLabel(factura.estado)}
                                    </Badge>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 hover:bg-muted"
                                            >
                                                <span className="sr-only">Abrir menú</span>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-44">
                                            <DropdownMenuItem asChild>
                                                <Link href={`/facturas/${factura.id}`}>
                                                    <Eye className="mr-2 h-4 w-4" />
                                                    Ver detalle
                                                </Link>
                                            </DropdownMenuItem>
                                            {factura.estado === "borrador" && (
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/facturas/${factura.id}?editar=true`}>
                                                        <Pencil className="mr-2 h-4 w-4" />
                                                        Editar
                                                    </Link>
                                                </DropdownMenuItem>
                                            )}
                                            <DropdownMenuSeparator />
                                            {factura.estado === "borrador" && (
                                                <DropdownMenuItem
                                                    onClick={() => handleEmitir(factura)}
                                                    disabled={isActionLoading}
                                                    className="cursor-pointer text-blue-600"
                                                >
                                                    <Send className="mr-2 h-4 w-4" />
                                                    Emitir factura
                                                </DropdownMenuItem>
                                            )}
                                            {factura.estado === "emitida" && (
                                                <DropdownMenuItem
                                                    onClick={() => setFacturaParaCobrar(factura)}
                                                    className="cursor-pointer text-green-600"
                                                >
                                                    <CheckCircle className="mr-2 h-4 w-4" />
                                                    Registrar cobro
                                                </DropdownMenuItem>
                                            )}
                                            {factura.estado !== "anulada" && factura.estado !== "cobrada" && (
                                                <DropdownMenuItem
                                                    onClick={() => handleAnular(factura)}
                                                    disabled={isActionLoading}
                                                    className="cursor-pointer text-red-600"
                                                >
                                                    <XCircle className="mr-2 h-4 w-4" />
                                                    Anular
                                                </DropdownMenuItem>
                                            )}
                                            {factura.estado === "borrador" && (
                                                <>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        onClick={() => {
                                                            if (confirm(`¿Estás seguro de que quieres eliminar la factura ${factura.numero}? Esta acción no se puede deshacer.`)) {
                                                                handleDelete(factura)
                                                            }
                                                        }}
                                                        disabled={isActionLoading}
                                                        className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Eliminar
                                                    </DropdownMenuItem>
                                                </>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>

            {/* Modal de Cobro */}
            {facturaParaCobrar && (
                <CobroForm
                    open={!!facturaParaCobrar}
                    onOpenChange={(open) => !open && setFacturaParaCobrar(null)}
                    facturaId={facturaParaCobrar.id}
                    facturaNumero={facturaParaCobrar.numero}
                    pendiente={facturaParaCobrar.total}
                    onSuccess={() => {
                        setFacturaParaCobrar(null)
                        router.refresh()
                    }}
                />
            )}
        </div>
    )
}
