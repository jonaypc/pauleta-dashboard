"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { ArrowLeft, Factory } from "lucide-react"
import Link from "next/link"

interface Producto {
    id: string
    nombre: string
    codigo: string
}

interface Receta {
    id: string
    nombre: string
    version: number
    producto_id: string
    rendimiento: number
}

export default function NuevaOrdenPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [productos, setProductos] = useState<Producto[]>([])
    const [recetas, setRecetas] = useState<Receta[]>([])
    const [recetasFiltradas, setRecetasFiltradas] = useState<Receta[]>([])

    const [formData, setFormData] = useState({
        producto_id: "",
        receta_id: "",
        cantidad_planificada: "",
        fecha_planificada: new Date().toISOString().split("T")[0],
        prioridad: "3",
        operario_responsable: "",
        turno: "",
        notas: "",
    })

    // Cargar productos y recetas al montar
    useEffect(() => {
        async function cargarDatos() {
            try {
                // Cargar productos
                const resProductos = await fetch("/api/productos")
                if (resProductos.ok) {
                    const data = await resProductos.json()
                    setProductos(data.data || [])
                }

                // Cargar recetas
                const resRecetas = await fetch("/api/recetas")
                if (resRecetas.ok) {
                    const data = await resRecetas.json()
                    setRecetas(data.data || [])
                }
            } catch (error) {
                console.error("Error cargando datos:", error)
            }
        }
        cargarDatos()
    }, [])

    // Filtrar recetas cuando cambie el producto
    useEffect(() => {
        if (formData.producto_id) {
            const filtradas = recetas.filter(r => r.producto_id === formData.producto_id)
            setRecetasFiltradas(filtradas)
            // Si solo hay una receta, seleccionarla automáticamente
            if (filtradas.length === 1) {
                setFormData(prev => ({ ...prev, receta_id: filtradas[0].id }))
            } else {
                setFormData(prev => ({ ...prev, receta_id: "" }))
            }
        } else {
            setRecetasFiltradas([])
            setFormData(prev => ({ ...prev, receta_id: "" }))
        }
    }, [formData.producto_id, recetas])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            const response = await fetch("/api/ordenes-produccion", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    cantidad_planificada: parseFloat(formData.cantidad_planificada),
                    prioridad: parseInt(formData.prioridad),
                }),
            })

            const result = await response.json()

            if (!response.ok || result.error) {
                throw new Error(result.error || "Error al crear orden")
            }

            toast({
                title: "Orden creada",
                description: `Orden ${result.data.numero} creada exitosamente`,
            })

            router.push("/produccion/ordenes")
            router.refresh()
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Error al crear la orden de producción",
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/produccion/ordenes">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Factory className="h-7 w-7 text-primary" />
                        Nueva Orden de Producción
                    </h1>
                    <p className="text-muted-foreground">
                        Crear una nueva orden de producción
                    </p>
                </div>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmit}>
                <Card>
                    <CardHeader>
                        <CardTitle>Datos de la Orden</CardTitle>
                        <CardDescription>
                            Completa la información para crear la orden de producción
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Producto */}
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="producto_id">
                                    Producto <span className="text-destructive">*</span>
                                </Label>
                                <Select
                                    value={formData.producto_id}
                                    onValueChange={(value) =>
                                        setFormData({ ...formData, producto_id: value })
                                    }
                                    required
                                >
                                    <SelectTrigger id="producto_id">
                                        <SelectValue placeholder="Selecciona un producto" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {productos.map((producto) => (
                                            <SelectItem key={producto.id} value={producto.id}>
                                                {producto.nombre} ({producto.codigo})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="receta_id">Receta</Label>
                                <Select
                                    value={formData.receta_id}
                                    onValueChange={(value) =>
                                        setFormData({ ...formData, receta_id: value })
                                    }
                                    disabled={!formData.producto_id || recetasFiltradas.length === 0}
                                >
                                    <SelectTrigger id="receta_id">
                                        <SelectValue placeholder="Selecciona una receta" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {recetasFiltradas.map((receta) => (
                                            <SelectItem key={receta.id} value={receta.id}>
                                                {receta.nombre} v{receta.version} (Rend: {receta.rendimiento})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {formData.producto_id && recetasFiltradas.length === 0 && (
                                    <p className="text-xs text-muted-foreground">
                                        No hay recetas disponibles para este producto
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Cantidad y Fecha */}
                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="space-y-2">
                                <Label htmlFor="cantidad_planificada">
                                    Cantidad Planificada <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="cantidad_planificada"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.cantidad_planificada}
                                    onChange={(e) =>
                                        setFormData({ ...formData, cantidad_planificada: e.target.value })
                                    }
                                    placeholder="0.00"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="fecha_planificada">
                                    Fecha Planificada <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="fecha_planificada"
                                    type="date"
                                    value={formData.fecha_planificada}
                                    onChange={(e) =>
                                        setFormData({ ...formData, fecha_planificada: e.target.value })
                                    }
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="prioridad">
                                    Prioridad <span className="text-destructive">*</span>
                                </Label>
                                <Select
                                    value={formData.prioridad}
                                    onValueChange={(value) =>
                                        setFormData({ ...formData, prioridad: value })
                                    }
                                    required
                                >
                                    <SelectTrigger id="prioridad">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">1 - Muy Alta</SelectItem>
                                        <SelectItem value="2">2 - Alta</SelectItem>
                                        <SelectItem value="3">3 - Media</SelectItem>
                                        <SelectItem value="4">4 - Baja</SelectItem>
                                        <SelectItem value="5">5 - Muy Baja</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Operario y Turno */}
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="operario_responsable">Operario Responsable</Label>
                                <Input
                                    id="operario_responsable"
                                    value={formData.operario_responsable}
                                    onChange={(e) =>
                                        setFormData({ ...formData, operario_responsable: e.target.value })
                                    }
                                    placeholder="Nombre del operario"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="turno">Turno</Label>
                                <Select
                                    value={formData.turno}
                                    onValueChange={(value) =>
                                        setFormData({ ...formData, turno: value })
                                    }
                                >
                                    <SelectTrigger id="turno">
                                        <SelectValue placeholder="Selecciona un turno" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="mañana">Mañana</SelectItem>
                                        <SelectItem value="tarde">Tarde</SelectItem>
                                        <SelectItem value="noche">Noche</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Notas */}
                        <div className="space-y-2">
                            <Label htmlFor="notas">Notas / Observaciones</Label>
                            <Textarea
                                id="notas"
                                value={formData.notas}
                                onChange={(e) =>
                                    setFormData({ ...formData, notas: e.target.value })
                                }
                                placeholder="Notas adicionales sobre la orden..."
                                rows={4}
                            />
                        </div>

                        {/* Botones */}
                        <div className="flex gap-3 justify-end pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.push("/produccion/ordenes")}
                                disabled={isLoading}
                            >
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? "Creando..." : "Crear Orden"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </form>
        </div>
    )
}
