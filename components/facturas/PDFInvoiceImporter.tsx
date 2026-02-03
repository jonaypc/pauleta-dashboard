"use client"
// Triggering build for Vercel sync - Phase 5 Complete


import { useState, useEffect } from "react"
import { Upload, FileText, CheckCircle, AlertTriangle, Loader2, Save, Barcode, User, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
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

declare global {
    interface Window {
        pdfjsLib: any
    }
}

interface PDFInvoiceImporterProps {
    clientes: { id: string; nombre: string; cif: string | null }[]
    productos: { id: string; nombre: string; codigo_barras?: string | null }[]
}

interface ParsedLine {
    codigo: string
    descripcion: string
    cantidad: number
    precio: number
    importe: number
    productoId?: string
}

interface ParsedInvoice {
    id: string // Temp for key
    numero: string
    fecha: string
    clienteRaw: string
    clienteId?: string
    clienteNombreMatch?: string
    lineas: ParsedLine[]
    subtotal: number
    impuesto: number
    total: number
    valida: boolean
    error?: string
}

export function PDFInvoiceImporter({ clientes, productos }: PDFInvoiceImporterProps) {
    const supabase = createClient()
    const [libLoaded, setLibLoaded] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)
    const [isImporting, setIsImporting] = useState(false)
    const [facturas, setFacturas] = useState<ParsedInvoice[]>([])
    const [stats, setStats] = useState({ total: 0, validas: 0, errores: 0 })

    useEffect(() => {
        if (window.pdfjsLib) {
            setLibLoaded(true)
            return
        }
        const script = document.createElement("script")
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
        script.onload = () => {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js"
            setLibLoaded(true)
        }
        document.head.appendChild(script)
    }, [])

    const normalize = (str: string) => str?.toString().trim().toLowerCase() || ""

    const parseQuickBooksText = (text: string): ParsedInvoice[] => {
        // Dividir por páginas si existe el marcador o intentar detectar bloques FACTURA N.º
        const blocks = text.split(/--- PÁGINA \d+ ---/g).filter(b => b.trim().length > 100)
        const results: ParsedInvoice[] = []

        blocks.forEach((block, idx) => {
            try {
                // 1. Número de Factura
                const numMatch = block.match(/FACTURA N\.º\s+(\d+)/)
                const numero = numMatch ? numMatch[1] : `ERR-${idx}`

                // 2. Fecha
                const fechaMatch = block.match(/FECHA\s+(\d{2}\/\d{2}\/\d{4})/)
                const fechaRaw = fechaMatch ? fechaMatch[1] : ""
                // Convertir DD/MM/YYYY a YYYY-MM-DD
                const [d, m, y] = fechaRaw.split("/")
                const fecha = y && m && d ? `${y}-${m}-${d}` : new Date().toISOString().split("T")[0]

                // 3. Cliente
                // El texto entre "FACTURAR A" y "ENVIAR A" suele ser el cliente
                const clienteMatch = block.match(/FACTURAR A\s+([\s\S]*?)\s+(?:ENVIAR A|FACTURA N\.º)/)
                const clienteRaw = clienteMatch ? clienteMatch[1].trim() : "Desconocido"

                // Buscar match de cliente por nombre o CIF
                const foundCliente = clientes.find(c =>
                    normalize(clienteRaw).includes(normalize(c.nombre)) ||
                    (c.cif && normalize(clienteRaw).includes(normalize(c.cif)))
                )

                // 4. Totales
                const subtotalMatch = block.match(/SUBTOTAL\s+([\d,.]+)/)
                const impuestoMatch = block.match(/IMPUESTO\s+([\d,.]+)/)
                const totalMatch = block.match(/TOTAL\s+([\d,.]+)/)

                const subtotal = parseFloat(subtotalMatch?.[1].replace(",", "") || "0")
                const impuesto = parseFloat(impuestoMatch?.[1].replace(",", "") || "0")
                const total = parseFloat(totalMatch?.[1].replace(",", "") || "0")

                // 5. Líneas de Productos
                // Buscamos líneas que empiecen por un código de barras (8-14 dígitos)
                const lineas: ParsedLine[] = []
                const lineRegex = /(\d{8,14})\s+([\s\S]*?)\s+(\d+)\s+([\d,.]+)\s+([\d,.]+)/g
                let match;

                while ((match = lineRegex.exec(block)) !== null) {
                    const [_, codigo, descripcion, cant, precio, importe] = match
                    const productMatch = productos.find(p => p.codigo_barras === codigo || normalize(p.nombre) === normalize(descripcion))

                    lineas.push({
                        codigo,
                        descripcion: descripcion.trim(),
                        cantidad: parseFloat(cant),
                        precio: parseFloat(precio.replace(",", "")),
                        importe: parseFloat(importe.replace(",", "")),
                        productoId: productMatch?.id
                    })
                }

                results.push({
                    id: Math.random().toString(36),
                    numero,
                    fecha,
                    clienteRaw,
                    clienteId: foundCliente?.id,
                    clienteNombreMatch: foundCliente?.nombre,
                    lineas,
                    subtotal,
                    impuesto,
                    total,
                    valida: !!foundCliente && lineas.length > 0,
                    error: !foundCliente ? "Cliente no encontrado" : (lineas.length === 0 ? "No se detectaron líneas" : undefined)
                })
            } catch (err) {
                console.error("Error parsing block:", err)
            }
        })

        return results
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !window.pdfjsLib) return

        setIsProcessing(true)
        setFacturas([])

        try {
            const arrayBuffer = await file.arrayBuffer()
            const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer })
            const pdfData = await loadingTask.promise

            let fullText = ""
            for (let i = 1; i <= pdfData.numPages; i++) {
                const page = await pdfData.getPage(i)
                const content = await page.getTextContent()
                const strings = content.items.map((item: any) => item.str)
                fullText += strings.join(" ") + `\n--- PÁGINA ${i} ---\n`
            }

            const parsed = parseQuickBooksText(fullText)
            setFacturas(parsed)
            setStats({
                total: parsed.length,
                validas: parsed.filter(f => f.valida).length,
                errores: parsed.filter(f => !f.valida).length
            })
        } catch (err: any) {
            toast({ title: "Error", description: "Fallo al leer el PDF", variant: "destructive" })
        } finally {
            setIsProcessing(false)
        }
    }

    const importarFacturas = async () => {
        const validas = facturas.filter(f => f.valida)
        if (validas.length === 0) return

        setIsImporting(true)
        let successCount = 0

        try {
            for (const f of validas) {
                // 1. Insertar Factura
                const { data: newFactura, error: fError } = await supabase.from('facturas').insert({
                    numero: f.numero,
                    cliente_id: f.clienteId,
                    fecha: f.fecha,
                    base_imponible: f.subtotal,
                    igic: f.impuesto,
                    total: f.total,
                    estado: 'cobrada' // Históricas suelen estar cobradas
                }).select('id').single()

                if (fError) {
                    console.error(`Error factura ${f.numero}:`, fError)
                    continue
                }

                // 2. Insertar Líneas
                const { error: lError } = await supabase.from('lineas_factura').insert(
                    f.lineas.map(l => ({
                        factura_id: newFactura.id,
                        producto_id: l.productoId,
                        descripcion: l.descripcion,
                        cantidad: l.cantidad,
                        precio_unitario: l.precio,
                        subtotal: l.importe,
                        igic: 7 // QuickBooks suele ser 7% en Canarias
                    }))
                )

                if (!lError) successCount++
            }

            toast({ title: "Importación finalizada", description: `Se han importado ${successCount} facturas.` })
            setFacturas([])
        } catch (err) {
            toast({ title: "Error", description: "Ocurrió un error en la importación masiva.", variant: "destructive" })
        } finally {
            setIsImporting(false)
        }
    }

    return (
        <div className="space-y-6">
            {!libLoaded && (
                <div className="flex items-center gap-2 text-muted-foreground animate-pulse">
                    <Loader2 className="h-4 w-4 animate-spin" /> Cargando motor de lectura PDF...
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Cargar Archivo de Facturas</CardTitle>
                    <CardDescription>Sube el PDF de QuickBooks con todas las facturas juntas.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <input
                                type="file"
                                accept=".pdf"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                onChange={handleFileUpload}
                                disabled={isProcessing || isImporting || !libLoaded}
                            />
                            <Button disabled={isProcessing || isImporting || !libLoaded}>
                                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                {isProcessing ? "Analizando..." : "Subir PDF de QuickBooks"}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {facturas.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between bg-slate-50 p-4 rounded-lg border">
                        <div className="flex gap-4">
                            <div className="text-sm">
                                <span className="text-muted-foreground">Detectadas:</span> <strong>{stats.total}</strong>
                            </div>
                            <div className="text-sm">
                                <span className="text-muted-foreground">Listas:</span> <strong className="text-green-600">{stats.validas}</strong>
                            </div>
                            <div className="text-sm text-red-600 font-medium">
                                Error: {stats.errores}
                            </div>
                        </div>
                        <Button onClick={importarFacturas} disabled={isImporting || stats.validas === 0}>
                            {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Importar {stats.validas} Facturas Válidas
                        </Button>
                    </div>

                    <div className="rounded-md border overflow-hidden">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead className="w-[100px]">N.º</TableHead>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Cliente (en PDF)</TableHead>
                                    <TableHead>Match Sistema</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                    <TableHead>Estado</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {facturas.map((f) => (
                                    <TableRow key={f.id} className={!f.valida ? "opacity-60 bg-red-50/30" : ""}>
                                        <TableCell className="font-mono">{f.numero}</TableCell>
                                        <TableCell>{f.fecha}</TableCell>
                                        <TableCell className="text-xs max-w-[200px] truncate">{f.clienteRaw}</TableCell>
                                        <TableCell>
                                            {f.clienteId ? (
                                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                    <User className="mr-1 h-3 w-3" /> {f.clienteNombreMatch}
                                                </Badge>
                                            ) : (
                                                <span className="text-red-500 text-xs font-semibold">No encontrado</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right font-medium">{f.total.toFixed(2)}€</TableCell>
                                        <TableCell>
                                            {f.valida ? (
                                                <Badge className="bg-green-600">✓ Listo</Badge>
                                            ) : (
                                                <Badge variant="destructive" className="flex items-center gap-1">
                                                    <AlertTriangle className="h-3 w-3" /> {f.error}
                                                </Badge>
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
