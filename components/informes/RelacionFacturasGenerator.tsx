"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { createClient } from "@/lib/supabase/client"
import { toast } from "@/hooks/use-toast"
import { FileText, Printer, Loader2, Building2 } from "lucide-react"

import { calcularRango, ultimosDoceMeses, resumenMensual, sumarImportes, obtenerFacturasRelacion, type PeriodoRelacion, type RangoRelacion } from "@/lib/relacion-facturas"

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
    cliente_cif?: string
    observaciones?: string
}

interface RelacionFacturasGeneratorProps {
    clientes: Cliente[]
    empresa: Empresa | null
}

export function RelacionFacturasGenerator({ clientes, empresa }: RelacionFacturasGeneratorProps) {
    const supabase = createClient()
    const [isLoading, setIsLoading] = useState(false)
    const [selectedCIFs, setSelectedCIFs] = useState<string[]>([])
    const [periodo, setPeriodo] = useState<PeriodoRelacion>("1")
    const [mes, setMes] = useState(() => {
        const now = new Date()
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    })
    const [anio, setAnio] = useState(() => String(new Date().getFullYear()))
    const [fechaDesde, setFechaDesde] = useState(() => ultimosDoceMeses().desde)
    const [fechaHasta, setFechaHasta] = useState(() => ultimosDoceMeses().hasta)
    const [rangoConsultado, setRangoConsultado] = useState<RangoRelacion | null>(null)
    const filtros = JSON.stringify([selectedCIFs, periodo, mes, anio, fechaDesde, fechaHasta])
    const filtrosActuales = useRef(filtros)
    filtrosActuales.current = filtros
    useEffect(() => { setShowPreview(false) }, [filtros])
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

    const toggleCIF = (cif: string) => {
        setSelectedCIFs(prev =>
            prev.includes(cif)
                ? prev.filter(c => c !== cif)
                : [...prev, cif]
        )
    }

    const selectAllCIFs = () => {
        if (selectedCIFs.length === cifsUnicos.length) {
            setSelectedCIFs([])
        } else {
            setSelectedCIFs(cifsUnicos.map(c => c.cif))
        }
    }

    const calcularFechas = () => calcularRango({ periodo, mes, anio, desde: fechaDesde, hasta: fechaHasta })

    const seleccionarUltimosDoceMeses = () => {
        const rango = ultimosDoceMeses()
        setPeriodo("personalizado")
        setFechaDesde(rango.desde)
        setFechaHasta(rango.hasta)
    }

    const buscarFacturas = async () => {
        if (selectedCIFs.length === 0) {
            toast({ title: "Error", description: "Selecciona al menos una empresa", variant: "destructive" })
            return
        }

        setIsLoading(true)
        setShowPreview(false)
        const filtrosSolicitud = filtros
        try {
            const rango = calcularFechas()
            const { desde, hasta } = rango

            // Obtener IDs de clientes con los CIFs seleccionados
            const clientesSeleccionados = clientes.filter(c => c.cif && selectedCIFs.includes(c.cif))
            const clienteIds = clientesSeleccionados.map(c => c.id)

            const data = await obtenerFacturasRelacion(supabase, clienteIds, desde, hasta)
            if (filtrosActuales.current !== filtrosSolicitud) return

            const facturasFormateadas = data?.map(f => ({
                id: f.id,
                numero: f.numero,
                fecha: f.fecha,
                total: f.total,
                cliente_nombre: (f.cliente as any)?.persona_contacto || (f.cliente as any)?.nombre || "Sin cliente",
                cliente_cif: (f.cliente as any)?.cif || ""
            })) || []

            setRangoConsultado(rango)
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
        return new Date(`${fecha}T12:00:00`).toLocaleDateString("es-ES")
    }

    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount)
    }

    const totalFacturas = sumarImportes(facturas)
    const { desde, hasta, label } = rangoConsultado || { desde: "", hasta: "", label: "" }

    const imprimirRelacion = () => {
        const cifsParam = selectedCIFs.join(",")
        window.open(`/print/relacion-facturas?cifs=${encodeURIComponent(cifsParam)}&desde=${desde}&hasta=${hasta}&periodo=${periodo}&mes=${mes}&entregado=${encodeURIComponent(entregadoPor)}&fecha=${fechaPresentacion}`, '_blank')
    }

    // Agrupar facturas por empresa (CIF)
    const facturasPorEmpresa = selectedCIFs.map(cif => {
        const empresa = cifsUnicos.find(c => c.cif === cif)
        const facturasEmpresa = facturas.filter(f => f.cliente_cif === cif)
        return {
            cif,
            nombre: empresa?.nombre || cif,
            facturas: facturasEmpresa,
            total: sumarImportes(facturasEmpresa)
        }
    })

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
                    {/* Selector de empresas (multi-selección por CIF) */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>Empresas / Grupos empresariales</Label>
                            <Button variant="ghost" size="sm" onClick={selectAllCIFs} className="h-auto py-1 px-2 text-xs">
                                {selectedCIFs.length === cifsUnicos.length ? "Deseleccionar todas" : "Seleccionar todas"}
                            </Button>
                        </div>
                        <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                            {cifsUnicos.map(c => (
                                <div key={c.cif} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`cif-${c.cif}`}
                                        checked={selectedCIFs.includes(c.cif)}
                                        onCheckedChange={() => toggleCIF(c.cif)}
                                    />
                                    <label
                                        htmlFor={`cif-${c.cif}`}
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                                    >
                                        {c.nombre} <span className="text-muted-foreground">({c.cif} – {c.numSucursales} tiendas)</span>
                                    </label>
                                </div>
                            ))}
                        </div>
                        {selectedCIFs.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                                {selectedCIFs.length} empresa{selectedCIFs.length > 1 ? "s" : ""} seleccionada{selectedCIFs.length > 1 ? "s" : ""}
                            </p>
                        )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="space-y-2">
                            <Label htmlFor="periodo-relacion">Período</Label>
                            <Select value={periodo} onValueChange={(v) => setPeriodo(v as PeriodoRelacion)}>
                                <SelectTrigger id="periodo-relacion"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">1ª Quincena (1-15)</SelectItem>
                                    <SelectItem value="2">2ª Quincena (16-fin)</SelectItem>
                                    <SelectItem value="mensual">Mes completo</SelectItem>
                                    <SelectItem value="anual">Año completo</SelectItem>
                                    <SelectItem value="personalizado">Intervalo de fechas</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {periodo === "anual" ? (
                            <div className="space-y-2">
                                <Label htmlFor="anio-relacion">Año</Label>
                                <Input id="anio-relacion" type="number" min="1900" max="9999" step="1" value={anio} onChange={e => setAnio(e.target.value)} />
                            </div>
                        ) : periodo === "personalizado" ? (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="desde-relacion">Desde</Label>
                                    <Input id="desde-relacion" type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="hasta-relacion">Hasta</Label>
                                    <Input id="hasta-relacion" type="date" min={fechaDesde} value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} />
                                </div>
                            </>
                        ) : (
                            <div className="space-y-2">
                                <Label htmlFor="mes-relacion">Mes</Label>
                                <Input id="mes-relacion" type="month" value={mes} onChange={e => setMes(e.target.value)} />
                            </div>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={seleccionarUltimosDoceMeses}>Últimos 12 meses completos</Button>
                        <Button onClick={buscarFacturas} disabled={isLoading || selectedCIFs.length === 0}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                            Buscar Facturas
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Importes con IGIC, agrupados por CIF. Incluye abonos y excluye facturas anuladas.</p>

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
            {showPreview && rangoConsultado && (
                <Card>
                    <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                        {selectedCIFs.length > 0 ? (
                            <>
                                {facturasPorEmpresa.map(grupo => (
                                    <div key={grupo.cif} className="mb-6">
                                        {(
                                            <div className="flex items-center gap-2 mb-2 pb-2 border-b">
                                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                                <span className="font-semibold">{grupo.nombre}</span>
                                                <span className="text-xs text-muted-foreground">({grupo.cif})</span>
                                            </div>
                                        )}
                                        <h3 className="font-semibold mb-2">Resumen mensual</h3>
                                        <Table>
                                            <TableHeader><TableRow><TableHead>Mes</TableHead><TableHead className="text-right">Facturas</TableHead><TableHead className="text-right">Total con IGIC</TableHead></TableRow></TableHeader>
                                            <TableBody>
                                                {resumenMensual(grupo.facturas, desde, hasta).map(mes => (
                                                    <TableRow key={mes.mes}><TableCell className="capitalize">{mes.label}</TableCell><TableCell className="text-right">{mes.cantidad}</TableCell><TableCell className="text-right">{formatMoney(mes.total)}</TableCell></TableRow>
                                                ))}
                                                <TableRow className="font-bold bg-muted/50"><TableCell>Total del periodo</TableCell><TableCell className="text-right">{grupo.facturas.length}</TableCell><TableCell className="text-right">{formatMoney(grupo.total)}</TableCell></TableRow>
                                            </TableBody>
                                        </Table>
                                        <h3 className="font-semibold mt-6 mb-2">Detalle de facturas</h3>
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
                                                {grupo.facturas.map(f => (
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
                                                    <TableCell colSpan={4} className="text-right">Subtotal {grupo.nombre}:</TableCell>
                                                    <TableCell className="text-right">{grupo.total.toFixed(2)}</TableCell>
                                                    <TableCell></TableCell>
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                    </div>
                                ))}

                                <div className="mt-4 flex flex-wrap gap-3 justify-between text-sm text-muted-foreground border-t pt-4">
                                    <span>{facturas.length} facturas encontradas{selectedCIFs.length > 1 ? ` de ${facturasPorEmpresa.length} empresas` : ""}</span>
                                    <Badge variant="outline" className="text-lg px-4 py-1">
                                        Total General: {formatMoney(totalFacturas)}
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
