"use client"

import { useState, useRef } from "react"
import * as XLSX from "xlsx"
import { Upload, FileUp, AlertTriangle, CheckCircle, Loader2, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { toast } from "@/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface InvoiceImporterProps {
    clientesExistentes: { id: string; nombre: string }[]
    productosExistentes: { id: string; nombre: string }[]
}

interface ExcelRow {
    Numero: string | number
    Fecha: string | number // Excel dates can be numbers
    Cliente: string
    Producto: string
    Cantidad: number
    Precio: number
    IGIC?: number
    [key: string]: any
}

interface ProcessedInvoice {
    numero: string
    fecha: string
    clienteNombre: string
    clienteId?: string
    lineas: ProcessedLine[]
    total: number
    valida: boolean
    error?: string
}

interface ProcessedLine {
    productoNombre: string
    productoId?: string
    cantidad: number
    precio: number
    subtotal: number
}

export function InvoiceImporter({ clientesExistentes, productosExistentes }: InvoiceImporterProps) {
    const supabase = createClient()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [previsualizacion, setPrevisualizacion] = useState<ProcessedInvoice[]>([])
    const [stats, setStats] = useState({ total: 0, validas: 0, errores: 0 })

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsProcessing(true)
        const reader = new FileReader()

        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result
                const wb = XLSX.read(bstr, { type: "binary" })
                const wsname = wb.SheetNames[0]
                const ws = wb.Sheets[wsname]
                const data = XLSX.utils.sheet_to_json<ExcelRow>(ws)

                procesarDatos(data)
            } catch (error) {
                console.error(error)
                toast({
                    title: "Error al leer el archivo",
                    description: "Asegúrate de que es un archivo Excel válido.",
                    variant: "destructive"
                })
            } finally {
                setIsProcessing(false)
            }
        }

        reader.readAsBinaryString(file)
    }

    const normalizeString = (str: string) => str?.toString().trim().toLowerCase() || ""

    const parseExcelDate = (val: string | number): string => {
        if (!val) return new Date().toISOString().split('T')[0]
        if (typeof val === 'number') {
            // Excel serial date
            const date = new Date(Math.round((val - 25569) * 86400 * 1000));
            return date.toISOString().split('T')[0]
        }
        // Try parsing string
        const date = new Date(val)
        if (!isNaN(date.getTime())) return date.toISOString().split('T')[0]
        return new Date().toISOString().split('T')[0] // Fallback
    }

    const procesarDatos = (rows: ExcelRow[]) => {
        const invoicesMap = new Map<string, ProcessedInvoice>()

        rows.forEach((row, index) => {
            const numero = row.Numero?.toString().trim()
            if (!numero) return // Skip empty rows

            if (!invoicesMap.has(numero)) {
                // Find Client
                const clienteNombre = row.Cliente?.toString().trim()
                const clienteMatch = clientesExistentes.find(c =>
                    normalizeString(c.nombre) === normalizeString(clienteNombre)
                )

                invoicesMap.set(numero, {
                    numero,
                    fecha: parseExcelDate(row.Fecha),
                    clienteNombre: clienteNombre || "Desconocido",
                    clienteId: clienteMatch?.id,
                    lineas: [],
                    total: 0,
                    valida: !!clienteMatch, // Invalid if client not found
                    error: clienteMatch ? undefined : `Cliente '${clienteNombre}' no encontrado`
                })
            }

            const invoice = invoicesMap.get(numero)!

            // Find Product
            const productoNombre = row.Producto?.toString().trim()
            const productoMatch = productosExistentes.find(p =>
                normalizeString(p.nombre) === normalizeString(productoNombre)
            )

            const cantidad = Number(row.Cantidad) || 0
            const precio = Number(row.Precio) || 0
            const subtotal = cantidad * precio

            invoice.lineas.push({
                productoNombre: productoNombre || "Item genérico",
                productoId: productoMatch?.id,
                cantidad,
                precio,
                subtotal
            })

            invoice.total += subtotal
        })

        const result = Array.from(invoicesMap.values())
        setPrevisualizacion(result)
        setStats({
            total: result.length,
            validas: result.filter(i => i.valida).length,
            errores: result.filter(i => !i.valida).length
        })
    }

    const importarFacturas = async () => {
        const validas = previsualizacion.filter(i => i.valida)
        if (validas.length === 0) return

        setIsUploading(true)
        try {
            let successCount = 0

            for (const invoice of validas) {
                // 1. Insertar Factura
                const igicRate = 0.07 // Default 7% or calculate from total? Assuming 7% for MVP
                const baseImponible = invoice.total
                const igic = baseImponible * igicRate
                const total = baseImponible + igic

                const { data: newFactura, error: fError } = await supabase.from('facturas').insert({
                    numero: invoice.numero,
                    cliente_id: invoice.clienteId,
                    fecha: invoice.fecha,
                    estado: 'cobrada', // Históricas usually paid
                    base_imponible: baseImponible,
                    igic: igic,
                    total: total
                }).select('id').single()

                if (fError) {
                    console.error(`Error importando factura ${invoice.numero}:`, fError)
                    continue
                }

                // 2. Insertar Líneas
                const lineasData = invoice.lineas.map(linea => ({
                    factura_id: newFactura.id,
                    producto_id: linea.productoId, // Can be null
                    descripcion: linea.productoNombre,
                    cantidad: linea.cantidad,
                    precio_unitario: linea.precio,
                    subtotal: linea.subtotal,
                    igic: 7.00 // Default
                }))

                const { error: lError } = await supabase.from('lineas_factura').insert(lineasData)
                if (lError) {
                    console.error(`Error líneas factura ${invoice.numero}:`, lError)
                } else {
                    successCount++
                }
            }

            toast({
                title: "Importación completada",
                description: `Se han creado ${successCount} facturas correctamente.`,
                variant: "success"
            })

            // Trigger refresh logic?
            setPrevisualizacion([])

        } catch (error) {
            console.error(error)
            toast({
                title: "Error crítico",
                description: "Ocurrió un fallo durante la importación.",
                variant: "destructive"
            })
        } finally {
            setIsUploading(false)
        }
    }

    const descargarPlantilla = () => {
        const data = [
            ["Numero", "Fecha", "Cliente", "Producto", "Cantidad", "Precio"],
            ["F1001", "2024-01-15", "Cliente Ejemplo S.L.", "Helado Mango", 10, 1.50],
            ["F1001", "2024-01-15", "Cliente Ejemplo S.L.", "Helado Fresa", 5, 1.50],
            ["F1002", "2024-01-16", "Otro Cliente", "Caja Variada", 2, 25.00]
        ]
        const ws = XLSX.utils.aoa_to_sheet(data)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Facturas")
        XLSX.writeFile(wb, "plantilla_facturas.xlsx")
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Cargar Archivo Excel</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" onClick={descargarPlantilla}>
                            <Download className="mr-2 h-4 w-4" />
                            Descargar Plantilla
                        </Button>
                        <div className="relative">
                            <input
                                type="file"
                                accept=".xlsx, .xls, .csv"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                                disabled={isProcessing || isUploading}
                            />
                            <Button disabled={isProcessing || isUploading}>
                                {isProcessing ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <FileUp className="mr-2 h-4 w-4" />
                                )}
                                Seleccionar Excel
                            </Button>
                        </div>
                    </div>

                    <div className="text-sm text-muted-foreground">
                        <p>El archivo debe contener las columnas: <strong>Numero, Fecha, Cliente, Producto, Cantidad, Precio</strong>.</p>
                        <p>El sistema agrupará las filas por número de factura y buscará clientes/productos por nombre.</p>
                    </div>
                </CardContent>
            </Card>

            {previsualizacion.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                            <Badge variant="outline" className="text-sm py-1">
                                Total: {stats.total}
                            </Badge>
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-green-200 text-sm py-1">
                                Válidas: {stats.validas}
                            </Badge>
                            {stats.errores > 0 && (
                                <Badge variant="destructive" className="text-sm py-1">
                                    Con Errores: {stats.errores}
                                </Badge>
                            )}
                        </div>
                        <Button
                            onClick={importarFacturas}
                            disabled={isUploading || stats.validas === 0}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Importar {stats.validas} Facturas
                        </Button>
                    </div>

                    {stats.errores > 0 && (
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Atención</AlertTitle>
                            <AlertDescription>
                                Hay facturas con errores (ej: Cliente no encontrado). Estas NO se importarán hasta que corrijas el Excel o crees el cliente.
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nº Factura</TableHead>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Cliente</TableHead>
                                    <TableHead className="text-center">Líneas</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                    <TableHead>Estado</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {previsualizacion.map((f, i) => (
                                    <TableRow key={i} className={!f.valida ? "bg-red-50" : ""}>
                                        <TableCell className="font-medium">{f.numero}</TableCell>
                                        <TableCell>{f.fecha}</TableCell>
                                        <TableCell>
                                            {f.clienteNombre}
                                            {!f.clienteId && <span className="block text-xs text-red-600 font-bold">No encontrado</span>}
                                        </TableCell>
                                        <TableCell className="text-center">{f.lineas.length}</TableCell>
                                        <TableCell className="text-right">{f.total.toFixed(2)}€</TableCell>
                                        <TableCell>
                                            {f.valida ? (
                                                <Badge variant="outline" className="text-green-600 border-green-200">
                                                    Lista
                                                </Badge>
                                            ) : (
                                                <Badge variant="destructive">Error</Badge>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}
        </div>
    )
}
