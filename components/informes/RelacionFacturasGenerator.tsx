"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { toast } from "@/hooks/use-toast"
import { FileText, Printer, Download, Loader2, Calendar, Building2 } from "lucide-react"

interface Cliente {
    id: string
    nombre: string
    cif: string | null
    persona_contacto: string | null
}

interface Empresa {
    nombre: string
    cif: string
    direccion: string
    ciudad: string
    codigo_postal: string
    telefono: string
    email: string
}

interface FacturaRelacion {
    id: string
    numero: string
    fecha: string
    total: number
    cliente_nombre: string
    observaciones?: string
}

interface RelacionFacturasGeneratorProps {
    clientes: Cliente[]
    empresa: Empresa | null
}

export function RelacionFacturasGenerator({ clientes, empresa }: RelacionFacturasGeneratorProps) {
    const supabase = createClient()
    const [isLoading, setIsLoading] = useState(false)
    const [selectedCIF, setSelectedCIF] = useState("")
    const [periodo, setPeriodo] = useState<"1" | "2">("1")
    const [mes, setMes] = useState(() => {
        const now = new Date()
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    })
    const [entregadoPor, setEntregadoPor] = useState("Jonay Pérez Carreño")
    const [facturas, setFacturas] = useState<FacturaRelacion[]>([])
    const [showPreview, setShowPreview] = useState(false)
    const [fechaPresentacion, setFechaPresentacion] = useState(() => {
        return new Date().toISOString().split('T')[0]
    })

    // Obtener CIFs únicos para el selector
    const cifsUnicos = Array.from(new Set(clientes.filter(c => c.cif).map(c => c.cif!)))
        .map(cif => {
            const clientesConCIF = clientes.filter(c => c.cif === cif)
            return {
                cif,
                nombre: clientesConCIF[0].nombre,
                numSucursales: clientesConCIF.length
            }
        })

    // Calcular fechas del período
    const calcularFechas = () => {
        const [year, month] = mes.split('-').map(Number)
        const primerDia = new Date(year, month - 1, 1)
        const ultimoDia = new Date(year, month, 0)
        
        if (periodo === "1") {
            return {
                desde: `${year}-${String(month).padStart(2, '0')}-01`,
                hasta: `${year}-${String(month).padStart(2, '0')}-15`,
                label: "1ª quincena"
            }
        } else {
            return {
                desde: `${year}-${String(month).padStart(2, '0')}-16`,
                hasta: `${year}-${String(month).padStart(2, '0')}-${ultimoDia.getDate()}`,
                label: "2ª quincena"
            }
        }
    }

    const buscarFacturas = async () => {
        if (!selectedCIF) {
            toast({ title: "Error", description: "Selecciona un cliente", variant: "destructive" })
            return
        }

        setIsLoading(true)
        try {
            const { desde, hasta } = calcularFechas()
            
            // Obtener IDs de clientes con este CIF
            const clientesConCIF = clientes.filter(c => c.cif === selectedCIF)
            const clienteIds = clientesConCIF.map(c => c.id)

            // Buscar facturas de estos clientes en el período
            const { data, error } = await supabase
                .from("facturas")
                .select(`
                    id, numero, fecha, total,
                    cliente:clientes(nombre, persona_contacto)
                `)
                .in("cliente_id", clienteIds)
                .gte("fecha", desde)
                .lte("fecha", hasta)
                .neq("estado", "anulada")
                .order("fecha", { ascending: true })

            if (error) throw error

            const facturasFormateadas = data?.map(f => ({
                id: f.id,
                numero: f.numero,
                fecha: f.fecha,
                total: f.total,
                cliente_nombre: (f.cliente as any)?.persona_contacto || (f.cliente as any)?.nombre || "Sin cliente"
            })) || []

            setFacturas(facturasFormateadas)
            setShowPreview(true)

            if (facturasFormateadas.length === 0) {
                toast({ title: "Sin resultados", description: "No se encontraron facturas en este período" })
            }

        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" })
        } finally {
            setIsLoading(false)
        }
    }

    const formatFecha = (fecha: string) => {
        return new Date(fecha).toLocaleDateString("es-ES")
    }

    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount)
    }

    const totalFacturas = facturas.reduce((sum, f) => sum + f.total, 0)
    const { desde, hasta, label } = calcularFechas()

    const imprimirRelacion = () => {
        window.open(`/print/relacion-facturas?cif=${selectedCIF}&desde=${desde}&hasta=${hasta}&periodo=${periodo}&mes=${mes}&entregado=${encodeURIComponent(entregadoPor)}&fecha=${fechaPresentacion}`, '_blank')
    }

    const nombreCliente = cifsUnicos.find(c => c.cif === selectedCIF)?.nombre || ""

    return (
        <div className="space-y-6">
            {/* Formulario de selección */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        Generar Relación de Facturas
                    </CardTitle>
                    <CardDescription>
                        Selecciona el cliente y el período para generar la relación de facturas
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {/* Selector de cliente (por CIF) */}
                        <div className="space-y-2">
                            <Label>Cliente/Grupo empresarial</Label>
                            <Select value={selectedCIF} onValueChange={setSelectedCIF}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar cliente..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {cifsUnicos.map(c => (
                                        <SelectItem key={c.cif} value={c.cif}>
                                            {c.nombre} ({c.numSucursales} tiendas)
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Selector de mes */}
                        <div className="space-y-2">
                            <Label>Mes</Label>
                            <Input 
                                type="month" 
                                value={mes}
                                onChange={(e) => setMes(e.target.value)}
                            />
                        </div>

                        {/* Selector de quincena */}
                        <div className="space-y-2">
                            <Label>Período</Label>
                            <Select value={periodo} onValueChange={(v) => setPeriodo(v as "1" | "2")}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">1ª Quincena (1-15)</SelectItem>
                                    <SelectItem value="2">2ª Quincena (16-fin)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Botón buscar */}
                        <div className="space-y-2">
                            <Label>&nbsp;</Label>
                            <Button onClick={buscarFacturas} disabled={isLoading} className="w-full">
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                                Buscar Facturas
                            </Button>
                        </div>
                    </div>

                    {/* Campos adicionales */}
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label>Entregado por</Label>
                            <Input 
                                value={entregadoPor}
                                onChange={(e) => setEntregadoPor(e.target.value)}
                                placeholder="Nombre de quien entrega"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Fecha de presentación</Label>
                            <Input 
                                type="date"
                                value={fechaPresentacion}
                                onChange={(e) => setFechaPresentacion(e.target.value)}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Vista previa */}
            {showPreview && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Vista Previa</CardTitle>
                            <CardDescription>
                                {label} - {formatFecha(desde)} al {formatFecha(hasta)}
                            </CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={imprimirRelacion}>
                                <Printer className="mr-2 h-4 w-4" />
                                Imprimir / PDF
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {facturas.length > 0 ? (
                            <>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nº Factura</TableHead>
                                            <TableHead>Fecha</TableHead>
                                            <TableHead>Tienda</TableHead>
                                            <TableHead>Nº Albarán</TableHead>
                                            <TableHead className="text-right">Importe (€)</TableHead>
                                            <TableHead>Observaciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {facturas.map(f => (
                                            <TableRow key={f.id}>
                                                <TableCell className="font-mono">{f.numero}</TableCell>
                                                <TableCell>{formatFecha(f.fecha)}</TableCell>
                                                <TableCell>{f.cliente_nombre}</TableCell>
                                                <TableCell className="font-mono">{f.numero}</TableCell>
                                                <TableCell className="text-right font-medium">{f.total.toFixed(2)}</TableCell>
                                                <TableCell className="text-muted-foreground">-</TableCell>
                                            </TableRow>
                                        ))}
                                        <TableRow className="bg-muted/50 font-bold">
                                            <TableCell colSpan={4} className="text-right">TOTAL:</TableCell>
                                            <TableCell className="text-right">{totalFacturas.toFixed(2)}</TableCell>
                                            <TableCell></TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                                
                                <div className="mt-4 flex justify-between text-sm text-muted-foreground">
                                    <span>{facturas.length} facturas encontradas</span>
                                    <Badge variant="outline" className="text-lg px-4 py-1">
                                        Total: {formatMoney(totalFacturas)}
                                    </Badge>
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                No se encontraron facturas para este período
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
