"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { Save, X, Plus, Trash2 } from "lucide-react"
import { createOrdenCompra } from "@/lib/actions/ordenes-compra"
import type { Proveedor, MateriaPrima, LineaOrdenCompraFormData } from "@/types"

interface OrdenCompraFormProps {
    proveedores: Proveedor[]
    materiasPrimas: MateriaPrima[]
}

export function OrdenCompraForm({ proveedores, materiasPrimas }: OrdenCompraFormProps) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)

    const [proveedorId, setProveedorId] = useState("")
    const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0])
    const [fechaEntregaEsperada, setFechaEntregaEsperada] = useState("")
    const [metodoPago, setMetodoPago] = useState("")
    const [referenciaProveedor, setReferenciaProveedor] = useState("")
    const [notas, setNotas] = useState("")
    const [lineas, setLineas] = useState<LineaOrdenCompraFormData[]>([])

    const agregarLinea = () => {
        setLineas([
            ...lineas,
            {
                materia_prima_id: "",
                cantidad_pedida: 1,
                precio_unitario: 0,
                lote_proveedor: "",
                fecha_caducidad: "",
                notas: "",
            },
        ])
    }

    const actualizarLinea = (index: number, campo: keyof LineaOrdenCompraFormData, valor: any) => {
        const nuevasLineas = [...lineas]
        nuevasLineas[index] = { ...nuevasLineas[index], [campo]: valor }
        setLineas(nuevasLineas)
    }

    const eliminarLinea = (index: number) => {
        setLineas(lineas.filter((_, i) => i !== index))
    }

    const calcularTotales = () => {
        const subtotal = lineas.reduce((sum, l) => {
            return sum + (l.cantidad_pedida * l.precio_unitario)
        }, 0)
        const impuestos = subtotal * 0.07 // IGIC 7%
        const total = subtotal + impuestos
        return { subtotal, impuestos, total }
    }

    const { subtotal, impuestos, total } = calcularTotales()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!proveedorId) {
            toast({
                title: "Error",
                description: "Debes seleccionar un proveedor",
                variant: "destructive",
            })
            return
        }

        if (lineas.length === 0) {
            toast({
                title: "Error",
                description: "Debes añadir al menos una línea de compra",
                variant: "destructive",
            })
            return
        }

        // Validar que todas las líneas tengan materia prima
        const lineasIncompletas = lineas.some(l => !l.materia_prima_id || l.cantidad_pedida <= 0 || l.precio_unitario < 0)
        if (lineasIncompletas) {
            toast({
                title: "Error",
                description: "Todas las líneas deben tener materia prima, cantidad y precio",
                variant: "destructive",
            })
            return
        }

        setIsLoading(true)

        try {
            const result = await createOrdenCompra({
                proveedor_id: proveedorId,
                fecha,
                fecha_entrega_esperada: fechaEntregaEsperada || undefined,
                metodo_pago: metodoPago || undefined,
                referencia_proveedor: referenciaProveedor || undefined,
                notas: notas || undefined,
                lineas,
            })

            if (result.error) {
                toast({
                    title: "Error",
                    description: result.error,
                    variant: "destructive",
                })
                setIsLoading(false)
                return
            }

            toast({
                title: "Orden creada",
                description: "La orden de compra se ha creado correctamente",
            })

            router.push("/produccion/ordenes-compra")
            router.refresh()
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Error al crear la orden",
                variant: "destructive",
            })
            setIsLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Información General</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="proveedor">Proveedor *</Label>
                            <Select value={proveedorId} onValueChange={setProveedorId}>
                                <SelectTrigger id="proveedor">
                                    <SelectValue placeholder="Seleccionar proveedor" />
                                </SelectTrigger>
                                <SelectContent>
                                    {proveedores.map((proveedor) => (
                                        <SelectItem key={proveedor.id} value={proveedor.id}>
                                            {proveedor.nombre}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="fecha">Fecha *</Label>
                            <Input
                                id="fecha"
                                type="date"
                                value={fecha}
                                onChange={(e) => setFecha(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="fecha_entrega">Fecha Entrega Esperada</Label>
                            <Input
                                id="fecha_entrega"
                                type="date"
                                value={fechaEntregaEsperada}
                                onChange={(e) => setFechaEntregaEsperada(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="metodo_pago">Método de Pago</Label>
                            <Select value={metodoPago} onValueChange={setMetodoPago}>
                                <SelectTrigger id="metodo_pago">
                                    <SelectValue placeholder="Seleccionar método" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="transferencia">Transferencia</SelectItem>
                                    <SelectItem value="tarjeta">Tarjeta</SelectItem>
                                    <SelectItem value="efectivo">Efectivo</SelectItem>
                                    <SelectItem value="domiciliacion">Domiciliación</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2 sm:col-span-2">
                            <Label htmlFor="referencia">Referencia Proveedor</Label>
                            <Input
                                id="referencia"
                                value={referenciaProveedor}
                                onChange={(e) => setReferenciaProveedor(e.target.value)}
                                placeholder="Número de pedido del proveedor"
                            />
                        </div>

                        <div className="space-y-2 sm:col-span-2">
                            <Label htmlFor="notas">Notas</Label>
                            <Textarea
                                id="notas"
                                value={notas}
                                onChange={(e) => setNotas(e.target.value)}
                                placeholder="Observaciones adicionales"
                                rows={3}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Líneas de Compra</CardTitle>
                    <Button type="button" onClick={agregarLinea} size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Añadir Línea
                    </Button>
                </CardHeader>
                <CardContent>
                    {lineas.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No hay líneas. Añade al menos una materia prima.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {lineas.map((linea, index) => {
                                const materiaPrima = materiasPrimas.find(m => m.id === linea.materia_prima_id)
                                const subtotalLinea = linea.cantidad_pedida * linea.precio_unitario

                                return (
                                    <div key={index} className="border rounded-lg p-4 space-y-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="font-medium text-sm">Línea #{index + 1}</h4>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => eliminarLinea(index)}
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>

                                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                            <div className="space-y-1 sm:col-span-2">
                                                <Label>Materia Prima *</Label>
                                                <Select
                                                    value={linea.materia_prima_id}
                                                    onValueChange={(value) => actualizarLinea(index, "materia_prima_id", value)}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Seleccionar materia prima" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {materiasPrimas.map((mp) => (
                                                            <SelectItem key={mp.id} value={mp.id}>
                                                                {mp.nombre} ({mp.codigo}) - {mp.unidad_medida}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-1">
                                                <Label>Cantidad *</Label>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    min="0.01"
                                                    value={linea.cantidad_pedida}
                                                    onChange={(e) => actualizarLinea(index, "cantidad_pedida", parseFloat(e.target.value) || 0)}
                                                    placeholder="0.00"
                                                />
                                                {materiaPrima && (
                                                    <p className="text-xs text-muted-foreground">
                                                        {materiaPrima.unidad_medida}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="space-y-1">
                                                <Label>Precio Unitario *</Label>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={linea.precio_unitario}
                                                    onChange={(e) => actualizarLinea(index, "precio_unitario", parseFloat(e.target.value) || 0)}
                                                    placeholder="0.00 €"
                                                />
                                            </div>

                                            <div className="space-y-1">
                                                <Label>Lote Proveedor</Label>
                                                <Input
                                                    value={linea.lote_proveedor}
                                                    onChange={(e) => actualizarLinea(index, "lote_proveedor", e.target.value)}
                                                    placeholder="Lote"
                                                />
                                            </div>

                                            <div className="space-y-1">
                                                <Label>Fecha Caducidad</Label>
                                                <Input
                                                    type="date"
                                                    value={linea.fecha_caducidad}
                                                    onChange={(e) => actualizarLinea(index, "fecha_caducidad", e.target.value)}
                                                />
                                            </div>

                                            <div className="space-y-1 bg-muted/50 rounded p-2 flex items-end">
                                                <div className="w-full">
                                                    <Label className="text-xs">Subtotal</Label>
                                                    <div className="text-lg font-bold">
                                                        {new Intl.NumberFormat("es-ES", {
                                                            style: "currency",
                                                            currency: "EUR",
                                                        }).format(subtotalLinea)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Totales */}
            <Card>
                <CardContent className="pt-6">
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Base Imponible:</span>
                            <span className="font-medium">
                                {new Intl.NumberFormat("es-ES", {
                                    style: "currency",
                                    currency: "EUR",
                                }).format(subtotal)}
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">IGIC (7%):</span>
                            <span className="font-medium">
                                {new Intl.NumberFormat("es-ES", {
                                    style: "currency",
                                    currency: "EUR",
                                }).format(impuestos)}
                            </span>
                        </div>
                        <div className="flex justify-between text-lg font-bold border-t pt-2">
                            <span>Total:</span>
                            <span className="text-primary">
                                {new Intl.NumberFormat("es-ES", {
                                    style: "currency",
                                    currency: "EUR",
                                }).format(total)}
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Botones de Acción */}
            <div className="flex gap-4 justify-end">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/produccion/ordenes-compra")}
                    disabled={isLoading}
                >
                    <X className="mr-2 h-4 w-4" />
                    Cancelar
                </Button>
                <Button type="submit" disabled={isLoading}>
                    <Save className="mr-2 h-4 w-4" />
                    {isLoading ? "Creando..." : "Crear Orden"}
                </Button>
            </div>
        </form>
    )
}
