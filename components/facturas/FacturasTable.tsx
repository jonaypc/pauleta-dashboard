"use client"
import { useState } from "react"
import Link from "next/link"
import { MoreHorizontal, Eye, Pencil, Send, XCircle, CheckCircle, Trash2, ArrowLeftRight, CreditCard, MessageCircle, Printer } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { CobroForm } from "@/components/cobros/CobroForm"
import type { Factura, EstadoFactura } from "@/types"
import { createClient } from "@/lib/supabase/client"
import { toast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

interface FacturasTableProps {
    facturas: (Factura & { cliente?: { nombre: string; persona_contacto?: string } })[]
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
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

    // Totales
    const totalVisible = facturas.reduce((sum, f) => sum + (f.total || 0), 0)
    const totalSelected = facturas
        .filter(f => selectedIds.has(f.id))
        .reduce((sum, f) => sum + (f.total || 0), 0)

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(new Set(facturas.map(f => f.id)))
        } else {
            setSelectedIds(new Set())
        }
    }

    const handleSelectOne = (id: string, checked: boolean) => {
        const newSelected = new Set(selectedIds)
        if (checked) {
            newSelected.add(id)
        } else {
            newSelected.delete(id)
        }
        setSelectedIds(newSelected)
    }

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

    const handleCambiarEstado = async (factura: Factura, nuevoEstado: EstadoFactura) => {
        setIsActionLoading(true)
        try {
            // Si pasamos de COBRADA a EMITIDA (pendiente), borrar los cobros asociados
            if (factura.estado === "cobrada" && nuevoEstado === "emitida") {
                const { error: errorCobros } = await supabase
                    .from("cobros")
                    .delete()
                    .eq("factura_id", factura.id)

                if (errorCobros) throw errorCobros
            }

            const { error } = await supabase
                .from("facturas")
                .update({ estado: nuevoEstado })
                .eq("id", factura.id)

            if (error) throw error

            toast({
                title: "Estado actualizado",
                description: `La factura ${factura.numero} ahora está ${nuevoEstado}.`,
                variant: "success",
            })
            router.refresh()
        } catch (error: any) {
            console.error("Error updating status:", error)
            toast({
                title: "Error",
                description: error.message || "No se pudo actualizar el estado",
                variant: "destructive",
            })
        } finally {
            setIsActionLoading(false)
        }
    }

    // Abrir WhatsApp con enlace a la factura
    const handleWhatsApp = (factura: Factura & { cliente?: any }) => {
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
        const facturaUrl = `${baseUrl}/facturas/${factura.id}/print`
        const clienteName = factura.cliente?.persona_contacto || factura.cliente?.nombre || 'Cliente'
        const message = encodeURIComponent(
            `Hola ${clienteName}, te envío la factura ${factura.numero} de Pauleta Canaria:\n${facturaUrl}`
        )
        window.open(`https://wa.me/?text=${message}`, '_blank')
    }

    // Abrir la factura en modo impresión
    const handlePrint = (factura: Factura) => {
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
        window.open(`${baseUrl}/facturas/${factura.id}/print`, '_blank')
    }
    return (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-border bg-muted/50">
                        <th className="w-[40px] px-4 py-3">
                            <Checkbox
                                checked={facturas.length > 0 && selectedIds.size === facturas.length}
                                onCheckedChange={(checked) => handleSelectAll(!!checked)}
                                aria-label="Seleccionar todo"
                            />
                        </th>
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
                                colSpan={7}
                                className="px-4 py-8 text-center text-muted-foreground"
                            >
                                No hay facturas registradas
                            </td>
                        </tr>
                    ) : (
                        facturas.map((factura) => (
                            <tr
                                key={factura.id}
                                className={`border-b border-border last:border-b-0 transition-colors ${selectedIds.has(factura.id) ? "bg-muted/50" : "hover:bg-muted/30"}`}
                            >
                                <td className="px-4 py-3">
                                    <Checkbox
                                        checked={selectedIds.has(factura.id)}
                                        onCheckedChange={(checked) => handleSelectOne(factura.id, !!checked)}
                                        aria-label={`Seleccionar factura ${factura.numero}`}
                                    />
                                </td>
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
                                    <div className="flex flex-col">
                                        <span className="font-medium">
                                            {factura.cliente?.persona_contacto || factura.cliente?.nombre || "Sin cliente"}
                                        </span>
                                        {factura.cliente?.persona_contacto && factura.cliente.nombre && (
                                            <span className="text-xs text-muted-foreground">
                                                {factura.cliente.nombre}
                                            </span>
                                        )}
                                    </div>
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
                                    <div className="flex items-center justify-end gap-1">
                                        {/* Botones de Acción Rápida Visibles */}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                            onClick={() => handleWhatsApp(factura)}
                                            title="Enviar por WhatsApp"
                                        >
                                            <MessageCircle className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 hover:bg-muted"
                                            onClick={() => handlePrint(factura)}
                                            title="Imprimir / Ver PDF"
                                        >
                                            <Printer className="h-4 w-4" />
                                        </Button>

                                        {/* Cambio Rápido de Estado */}
                                        {factura.estado === "borrador" && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                onClick={() => handleEmitir(factura)}
                                                disabled={isActionLoading}
                                                title="Emitir factura"
                                            >
                                                <Send className="h-4 w-4" />
                                            </Button>
                                        )}
                                        {factura.estado === "emitida" && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                onClick={() => {
                                                    if (confirm(`¿Marcar factura ${factura.numero} como COBRADA?`)) {
                                                        handleCambiarEstado(factura, "cobrada")
                                                    }
                                                }}
                                                disabled={isActionLoading}
                                                title="Marcar como cobrada"
                                            >
                                                <CheckCircle className="h-4 w-4" />
                                            </Button>
                                        )}

                                        {/* Menú con más opciones */}
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
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/facturas/${factura.id}?editar=true`}>
                                                        <Pencil className="mr-2 h-4 w-4" />
                                                        Editar
                                                    </Link>
                                                </DropdownMenuItem>
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
                                                    <>
                                                        <DropdownMenuItem
                                                            onClick={() => setFacturaParaCobrar(factura)}
                                                            className="cursor-pointer text-green-600"
                                                        >
                                                            <CreditCard className="mr-2 h-4 w-4" />
                                                            Registrar cobro
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => {
                                                                if (confirm(`¿Marcar factura ${factura.numero} como COBRADA manualmente?`)) {
                                                                    handleCambiarEstado(factura, "cobrada")
                                                                }
                                                            }}
                                                            disabled={isActionLoading}
                                                            className="cursor-pointer text-green-600"
                                                        >
                                                            <CheckCircle className="mr-2 h-4 w-4" />
                                                            Marcar como cobrada
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => {
                                                                if (confirm(`¿Convertir factura ${factura.numero} a BORRADOR?`)) {
                                                                    handleCambiarEstado(factura, "borrador")
                                                                }
                                                            }}
                                                            disabled={isActionLoading}
                                                            className="cursor-pointer"
                                                        >
                                                            <ArrowLeftRight className="mr-2 h-4 w-4" />
                                                            Pasar a borrador
                                                        </DropdownMenuItem>
                                                    </>
                                                )}
                                                {factura.estado === "cobrada" && (
                                                    <DropdownMenuItem
                                                        onClick={() => {
                                                            if (confirm(`¿Marcar factura ${factura.numero} como EMITIDA (Pendiente)?\nIMPORTANTE: Se eliminarán todos los cobros asociados a esta factura.`)) {
                                                                handleCambiarEstado(factura, "emitida")
                                                            }
                                                        }}
                                                        disabled={isActionLoading}
                                                        className="cursor-pointer text-orange-600"
                                                    >
                                                        <ArrowLeftRight className="mr-2 h-4 w-4" />
                                                        Marcar como pendiente
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
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>

            {/* Sticky Footer con Totales */}
            <div className="sticky bottom-0 border-t bg-background p-4 shadow-lg">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm text-muted-foreground">
                        {facturas.length} facturas mostradas
                        {selectedIds.size > 0 && ` • ${selectedIds.size} seleccionadas`}
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="text-right">
                            <p className="text-xs text-muted-foreground uppercase font-bold">Total Listado</p>
                            <p className="text-lg font-bold">{formatPrecio(totalVisible)}</p>
                        </div>
                        {selectedIds.size > 0 && (
                            <div className="text-right border-l pl-6">
                                <p className="text-xs text-primary uppercase font-bold">Total Seleccionado</p>
                                <p className="text-lg font-bold text-primary">{formatPrecio(totalSelected)}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

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
