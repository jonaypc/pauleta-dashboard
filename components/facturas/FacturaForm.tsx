"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { Save, X, FileText, Calculator } from "lucide-react"
import { LineasFactura } from "./LineasFactura"
import type {
    Factura,
    Cliente,
    Producto,
    LineaFacturaFormData,
} from "@/types"

interface FacturaFormProps {
    factura?: Factura & { lineas?: { id: string; producto_id: string | null; descripcion: string; cantidad: number; precio_unitario: number; igic: number; subtotal: number }[] }
    clientes: Cliente[]
    productos: Producto[]
    onCancel?: () => void
}

// Formatea precio
function formatPrecio(precio: number): string {
    return new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency: "EUR",
    }).format(precio)
}

export function FacturaForm({
    factura,
    clientes,
    productos,
    onCancel,
}: FacturaFormProps) {
    const router = useRouter()
    const supabase = createClient()
    const isEditing = !!factura

    const [isLoading, setIsLoading] = useState(false)
    const [numero, setNumero] = useState(factura?.numero || "")
    const [clienteId, setClienteId] = useState(factura?.cliente_id || "")
    const [fecha, setFecha] = useState(
        factura?.fecha || new Date().toISOString().split("T")[0]
    )
    const [fechaVencimiento, setFechaVencimiento] = useState(
        factura?.fecha_vencimiento || ""
    )
    const [notas, setNotas] = useState(factura?.notas || "")
    const [lineas, setLineas] = useState<LineaFacturaFormData[]>(
        factura?.lineas?.map((l) => ({
            producto_id: l.producto_id || undefined,
            descripcion: l.descripcion,
            cantidad: l.cantidad,
            precio_unitario: l.precio_unitario,
            igic: l.igic,
            es_intercambio: (l as any).es_intercambio || false, // Cast temporal si types no actualiza rápido
            producto_devuelto_id: (l as any).producto_devuelto_id || undefined,
            motivo_devolucion: (l as any).motivo_devolucion || undefined,
        })) || []
    )

    // Calcular totales
    const calcularTotales = () => {
        const baseImponible = lineas.reduce(
            (sum, l) => sum + l.cantidad * l.precio_unitario,
            0
        )
        const igic = lineas.reduce(
            (sum, l) => sum + l.cantidad * l.precio_unitario * (l.igic / 100),
            0
        )
        const total = baseImponible + igic
        return { baseImponible, igic, total }
    }

    const { baseImponible, igic, total } = calcularTotales()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!clienteId) {
            toast({
                title: "Error",
                description: "Debes seleccionar un cliente",
                variant: "destructive",
            })
            return
        }

        if (lineas.length === 0) {
            toast({
                title: "Error",
                description: "Debes añadir al menos una línea",
                variant: "destructive",
            })
            return
        }

        setIsLoading(true)

        try {
            if (isEditing) {
                // Actualizar factura existente
                const { error: facturaError } = await supabase
                    .from("facturas")
                    .update({
                        numero: numero, // Permitir actualizar número
                        cliente_id: clienteId,
                        fecha,
                        fecha_vencimiento: fechaVencimiento || null,
                        notas: notas || null,
                    })
                    .eq("id", factura.id)

                if (facturaError) throw facturaError

                // Eliminar líneas existentes
                await supabase
                    .from("lineas_factura")
                    .delete()
                    .eq("factura_id", factura.id)

                // Insertar nuevas líneas
                const lineasData = lineas.map((l) => ({
                    factura_id: factura.id,
                    producto_id: l.producto_id || null,
                    descripcion: l.descripcion,
                    cantidad: l.cantidad,
                    precio_unitario: l.precio_unitario,
                    igic: l.igic,
                    subtotal: l.cantidad * l.precio_unitario,
                    es_intercambio: l.es_intercambio || false,
                    producto_devuelto_id: l.producto_devuelto_id || null,
                    motivo_devolucion: l.motivo_devolucion || null
                }))

                const { error: lineasError } = await supabase
                    .from("lineas_factura")
                    .insert(lineasData)

                if (lineasError) throw lineasError

                toast({
                    title: "Factura actualizada",
                    description: "Los cambios se han guardado correctamente",
                    variant: "success",
                })
            } else {
                let finalNumero = numero;

                // Si no se especificó número, generarlo automáticamente
                if (!finalNumero) {
                    const { data: numeroData, error: numeroError } = await supabase.rpc(
                        "generar_numero_factura"
                    )
                    if (numeroError) throw numeroError
                    finalNumero = numeroData;
                }

                // Crear nueva factura
                const { data: nuevaFactura, error: facturaError } = await supabase
                    .from("facturas")
                    .insert({
                        numero: finalNumero,
                        cliente_id: clienteId,
                        fecha,
                        fecha_vencimiento: fechaVencimiento || null,
                        notas: notas || null,
                        estado: "borrador",
                        base_imponible: baseImponible,
                        igic,
                        total,
                    })
                    .select("id")
                    .single()

                if (facturaError) throw facturaError

                // Insertar líneas
                const lineasData = lineas.map((l) => ({
                    factura_id: nuevaFactura.id,
                    producto_id: l.producto_id || null,
                    descripcion: l.descripcion,
                    cantidad: l.cantidad,
                    precio_unitario: l.precio_unitario,
                    igic: l.igic,
                    subtotal: l.cantidad * l.precio_unitario,
                    es_intercambio: l.es_intercambio || false,
                    producto_devuelto_id: l.producto_devuelto_id || null,
                    motivo_devolucion: l.motivo_devolucion || null
                }))

                const { error: lineasError } = await supabase
                    .from("lineas_factura")
                    .insert(lineasData)

                if (lineasError) throw lineasError

                toast({
                    title: "Factura creada",
                    description: `Factura ${finalNumero} creada correctamente`,
                    variant: "success",
                })
            }

            router.push("/facturas")
            router.refresh()
        } catch (error: any) {
            console.error("Error creating/updating invoice:", error)
            const errorMessage = error?.message || error?.error_description || "Error desconocido"
            toast({
                title: "Error",
                description: errorMessage,
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Datos principales */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <FileText className="h-5 w-5" />
                        Datos de la factura
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="cliente" required>
                            Cliente
                        </Label>
                        <Select value={clienteId} onValueChange={setClienteId}>
                            <SelectTrigger id="cliente">
                                <SelectValue placeholder="Seleccionar cliente..." />
                            </SelectTrigger>
                            <SelectContent>
                                {clientes.map((cliente) => (
                                    <SelectItem key={cliente.id} value={cliente.id}>
                                        {cliente.persona_contacto
                                            ? `${cliente.persona_contacto} (${cliente.nombre})`
                                            : cliente.nombre}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="fecha" required>
                            Fecha
                        </Label>
                        <Input
                            id="fecha"
                            type="date"
                            value={fecha}
                            onChange={(e) => setFecha(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="fechaVencimiento">Fecha de vencimiento</Label>
                        <Input
                            id="fechaVencimiento"
                            type="date"
                            value={fechaVencimiento}
                            onChange={(e) => setFechaVencimiento(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="numero">
                            Número de Factura
                        </Label>
                        <Input
                            id="numero"
                            placeholder="Automático"
                            value={numero}
                            onChange={(e) => setNumero(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                            Dejar vacío para autogerenar (ej: F501)
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Líneas de factura */}
            <Card>
                <CardContent className="pt-6">
                    <LineasFactura
                        lineas={lineas}
                        productos={productos}
                        onChange={setLineas}
                    />
                </CardContent>
            </Card>

            {/* Totales */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Calculator className="h-5 w-5" />
                        Totales
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-end space-y-2">
                        <div className="flex justify-between w-full max-w-xs">
                            <span className="text-muted-foreground">Base imponible:</span>
                            <span className="font-medium tabular-nums">
                                {formatPrecio(baseImponible)}
                            </span>
                        </div>
                        <div className="flex justify-between w-full max-w-xs">
                            <span className="text-muted-foreground">IGIC:</span>
                            <span className="font-medium tabular-nums">
                                {formatPrecio(igic)}
                            </span>
                        </div>
                        <div className="flex justify-between w-full max-w-xs border-t pt-2">
                            <span className="text-lg font-semibold">Total:</span>
                            <span className="text-lg font-bold text-primary tabular-nums">
                                {formatPrecio(total)}
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Notas */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Notas</CardTitle>
                </CardHeader>
                <CardContent>
                    <textarea
                        value={notas}
                        onChange={(e) => setNotas(e.target.value)}
                        placeholder="Notas adicionales para la factura..."
                        rows={3}
                        className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                </CardContent>
            </Card>

            {/* Botones */}
            <div className="flex justify-end gap-3">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel || (() => router.back())}
                    disabled={isLoading}
                >
                    <X className="mr-2 h-4 w-4" />
                    Cancelar
                </Button>
                <Button type="submit" loading={isLoading}>
                    <Save className="mr-2 h-4 w-4" />
                    {isEditing ? "Guardar cambios" : "Crear factura"}
                </Button>
            </div>
        </form>
    )
}
