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
    cobrada: boolean
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
        // En lugar de dividir por páginas, unimos todo y buscamos el patrón de inicio de factura
        // El patrón suele ser "FACTURA N.º"
        const invoiceStarts = Array.from(text.matchAll(/FACTURA N\.º/g)).map(m => m.index)
        const blocks: string[] = []

        for (let i = 0; i < invoiceStarts.length; i++) {
            const start = invoiceStarts[i]
            const end = invoiceStarts[i + 1] || text.length
            blocks.push(text.substring(start!, end))
        }

        const results: ParsedInvoice[] = []

        blocks.forEach((block, idx) => {
            try {
                // 1. Número de Factura
                const numMatch = block.match(/FACTURA N\.º\s+(\d+)/)
                if (!numMatch) return // Si no hay número, no es una factura válida
                const numero = numMatch[1]

                // 2. Fecha
                const fechaMatch = block.match(/FECHA\s+(\d{2}\/\d{2}\/\d{4})/)
                const fechaRaw = fechaMatch ? fechaMatch[1] : ""
                const [d, m, y] = fechaRaw.split("/")
                const fecha = y && m && d ? `${y}-${m}-${d}` : new Date().toISOString().split("T")[0]

                // 3. Cliente
                // Buscamos el bloque entre "FACTURAR A" y algo que cierre (en multi-página puede ser complejo)
                const clienteMatch = block.match(/FACTURAR A\s+([\s\S]*?)\s+(?:ENVIAR A|FECHA|FACTURA)/)
                const clienteRaw = clienteMatch ? clienteMatch[1].trim() : "Desconocido"

                const foundCliente = clientes.find(c =>
                    normalize(clienteRaw).includes(normalize(c.nombre)) ||
                    (c.cif && normalize(clienteRaw).includes(normalize(c.cif)))
                )

                // 4. Totales (Buscamos los últimos que aparezcan en el bloque para evitar errores de arrastre)
                const subtotalMatch = Array.from(block.matchAll(/SUBTOTAL\s+([\d,.]+)/g)).pop()
                const impuestoMatch = Array.from(block.matchAll(/IMPUESTO\s+([\d,.]+)/g)).pop()
                const totalMatch = Array.from(block.matchAll(/TOTAL\s+([\d,.]+)/g)).pop()

                const subtotal = parseFloat(subtotalMatch?.[1].replace(",", "") || "0")
                const impuesto = parseFloat(impuestoMatch?.[1].replace(",", "") || "0")
                const total = parseFloat(totalMatch?.[1].replace(",", "") || "0")

                // 4.5. Estado de pago (Buscamos si el saldo pendiente es 0 o si dice PAGADA)
                const saldoPendienteMatch = block.match(/SALDO PENDIENTE\s+([\d,.]+)/i)
                const saldoPendiente = parseFloat(saldoPendienteMatch?.[1].replace(",", "") || "999")
                const isPagada = saldoPendiente === 0 || /PAGADA|COBRADA|SALDO 0/i.test(block)

                // 5. Líneas de Productos
                // Buscamos líneas que empiecen por un código numérico (mínimo 4 dígitos para soportar códigos internos cortos)
                const lineas: ParsedLine[] = []
                const lineRegex = /(\d{4,14})\s+([\s\S]*?)\s+(\d+)\s+([\d,.]+)\s+([\d,.]+)/g
                let match;

                while ((match = lineRegex.exec(block)) !== null) {
                    const [_, codigo, descripcion, cant, precio, importe] = match
                    // Si el importe no cuadra con cant * precio, puede ser un falso positivo (ej: un teléfono)
                    const parsedCant = parseFloat(cant)
                    const parsedPrecio = parseFloat(precio.replace(",", ""))
                    const parsedImporte = parseFloat(importe.replace(",", ""))

                    // Pequeña validación de integridad
                    if (Math.abs(parsedCant * parsedPrecio - parsedImporte) > 0.5) continue

                    const productMatch = productos.find(p => p.codigo_barras === codigo || normalize(p.nombre) === normalize(descripcion))

                    lineas.push({
                        codigo,
                        descripcion: descripcion.trim(),
                        cantidad: parsedCant,
                        precio: parsedPrecio,
                        importe: parsedImporte,
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
                    cobrada: isPagada,
                    valida: !!foundCliente && lineas.length > 0,
                    error: !foundCliente ? "Cliente no encontrado" : (lineas.length === 0 ? "No se detectaron líneas" : undefined)
                })
            } catch (err) {
                console.error("Error parsing block:", err)
            }
        })

        console.log("Resultado del parsing consolidado:", results)
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
                // 1. Upsert de Factura (Actualizar si ya existe por número)
                const { data: upsertedFactura, error: fError } = await supabase.from('facturas').upsert({
                    numero: f.numero,
                    cliente_id: f.clienteId,
                    fecha: f.fecha,
                    base_imponible: f.subtotal,
                    igic: f.impuesto,
                    total: f.total,
                    estado: f.cobrada ? 'cobrada' : 'emitida'
                }, { onConflict: 'numero' }).select('id').single()

                if (fError) {
                    console.error(`Error factura ${f.numero}:`, fError)
                    continue
                }

                // 2. Limpiar líneas existentes (por si estamos re-importando para arreglar)
                await supabase.from('lineas_factura').delete().eq('factura_id', upsertedFactura.id)

                // 3. Insertar las nuevas líneas detectadas
                const { error: lError } = await supabase.from('lineas_factura').insert(
                    f.lineas.map(l => ({
                        factura_id: upsertedFactura.id,
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
                                    <>
                                        <TableRow key={f.id} className={!f.valida ? "opacity-60 bg-red-50/30" : "hover:bg-slate-50/50"}>
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
                                                <div className="flex flex-col gap-1">
                                                    {f.valida ? (
                                                        <Badge className="bg-green-600">✓ {f.lineas.length} líneas</Badge>
                                                    ) : (
                                                        <Badge variant="destructive" className="flex items-center gap-1">
                                                            <AlertTriangle className="h-3 w-3" /> {f.error}
                                                        </Badge>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className={`h-6 text-[10px] px-2 ${f.cobrada ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}
                                                        onClick={() => {
                                                            setFacturas(prev => prev.map(fact =>
                                                                fact.id === f.id ? { ...fact, cobrada: !fact.cobrada } : fact
                                                            ))
                                                        }}
                                                    >
                                                        {f.cobrada ? 'COBRADA' : 'PENDIENTE'}
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                        {f.lineas.length > 0 && (
                                            <TableRow className="bg-slate-50/30">
                                                <TableCell colSpan={6} className="py-2 px-8">
                                                    <div className="text-[10px] grid grid-cols-5 gap-2 text-muted-foreground uppercase font-bold border-b pb-1 mb-1">
                                                        <span>Código</span>
                                                        <span className="col-span-2">Producto detectado</span>
                                                        <span className="text-center">Cant.</span>
                                                        <span className="text-right">Precio</span>
                                                    </div>
                                                    {f.lineas.map((l, lidx) => (
                                                        <div key={lidx} className="grid grid-cols-5 gap-2 py-0.5 border-b border-dotted last:border-0 hover:text-foreground">
                                                            <span className="font-mono">{l.codigo}</span>
                                                            <span className="col-span-2 truncate flex items-center gap-1">
                                                                {l.productoId ? <CheckCircle className="h-3 w-3 text-green-500" /> : <AlertTriangle className="h-3 w-3 text-amber-500" />}
                                                                {l.descripcion}
                                                            </span>
                                                            <span className="text-center text-foreground font-medium">{l.cantidad}</span>
                                                            <span className="text-right text-foreground">{l.precio.toFixed(2)}€</span>
                                                        </div>
                                                    ))}
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}
        </div>
    )
}
