"use client"

import { useState, useEffect, useRef } from "react"
import { FileText, CheckCircle, AlertTriangle, Loader2, Save, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { toast } from "@/hooks/use-toast"
import * as pdfjsLib from "pdfjs-dist"

// Interface definitions
interface Producto {
    id: string
    nombre: string
    codigo_barras: string | null
    igic: number
}

interface Cliente {
    id: string
    nombre: string
    cif: string | null
    direccion?: string | null
    ciudad?: string | null
    codigo_postal?: string | null
}

interface ParsedLine {
    codigo: string
    descripcion: string
    cantidad: number
    precio: number
    importe: number
    productoId?: string
    igic: number
}

interface ParsedInvoice {
    id: string
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

interface PDFInvoiceImporterProps {
    clientes: Cliente[]
    productos: Producto[]
}

function PDFInvoiceImporter({ clientes, productos }: PDFInvoiceImporterProps) {
    const supabase = createClient()
    const [isProcessing, setIsProcessing] = useState(false)
    const [facturas, setFacturas] = useState<ParsedInvoice[]>([])
    const [stats, setStats] = useState({ total: 0, validas: 0, errores: 0 })
    const [isImporting, setIsImporting] = useState(false)

    useEffect(() => {
        // Usar el worker desde el directorio public para evitar problemas de CSP
        if (typeof window !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'
        }
    }, [])

    useEffect(() => {
        if (facturas.length > 0) {
            setStats({
                total: facturas.length,
                validas: facturas.filter(f => f.valida).length,
                errores: facturas.filter(f => !f.valida).length
            })
        }
    }, [facturas])

    const normalize = (str: string) => {
        if (!str) return ""
        return str.toString()
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9\s]/g, "")
            .replace(/\s+/g, " ")
    }

    const isSimilar = (str1: string, str2: string): boolean => {
        const n1 = normalize(str1)
        const n2 = normalize(str2)
        if (n1 === n2) return true
        if (n1.includes(n2) || n2.includes(n1)) return true
        const words1 = n1.split(" ").filter(w => w.length > 2)
        const words2 = n2.split(" ").filter(w => w.length > 2)
        const commonWords = words1.filter(w => words2.some(w2 => w2.includes(w) || w.includes(w2)))
        return commonWords.length >= 2
    }

    // Parser específico para el formato de Pauleta Canaria
    const parsePauletaInvoices = (text: string): ParsedInvoice[] => {
        const results: ParsedInvoice[] = []
        
        // Dividir por cada factura usando "FACTURA N.º" como separador
        const splitParts = text.split(/FACTURA\s*N\.º\s*/i)
        
        console.log(`Partes encontradas: ${splitParts.length}`)
        
        // Procesar cada parte (la primera parte es la cabecera, el resto son facturas)
        for (let i = 1; i < splitParts.length; i++) {
            const block = splitParts[i]
            const prevBlock = splitParts[i - 1] // Parte anterior (puede contener FACTURAR A)
            
            try {
                // 1. NÚMERO DE FACTURA - primeros dígitos del bloque
                const numMatch = block.match(/^\s*(\d+)/)
                if (!numMatch) {
                    console.log(`Factura ${i}: No se encontró número`)
                    continue
                }
                const numero = numMatch[1]
                
                // 2. FECHA - formato FECHA 29/01/2026
                const fechaMatch = block.match(/FECHA\s*(\d{2})\/(\d{2})\/(\d{4})/)
                let fecha = new Date().toISOString().split("T")[0]
                if (fechaMatch) {
                    fecha = `${fechaMatch[3]}-${fechaMatch[2]}-${fechaMatch[1]}`
                }
                
                // 3. CLIENTE - Buscar el ÚLTIMO bloque FACTURAR A...ENVIAR A antes del número de factura
                let clienteRaw = "Desconocido"
                let clienteCIF = ""
                let clienteDireccion = ""
                let clienteCP = ""
                let clienteCiudad = ""
                
                // Función para extraer cliente del ÚLTIMO bloque FACTURAR A en un texto
                const extractLastCliente = (textToSearch: string) => {
                    // Buscar TODAS las ocurrencias de FACTURAR A...ENVIAR A y usar la ÚLTIMA
                    const regex = /FACTURAR\s*A([\s\S]*?)ENVIAR\s*A/gi
                    const allMatches: RegExpExecArray[] = []
                    let m
                    while ((m = regex.exec(textToSearch)) !== null) {
                        allMatches.push(m)
                    }
                    if (allMatches.length === 0) return false
                    
                    // Usar el último match (el más cercano al número de factura)
                    const lastMatch = allMatches[allMatches.length - 1]
                    const clienteText = lastMatch[1]
                    
                    // Buscar CIF/NIF en el texto (formato: B02973170 o 78483209X o F-35009950)
                    const cifMatch = clienteText.match(/([A-Z][-]?\d{7,8}[A-Z]?|\d{8}[A-Z])/i)
                    if (cifMatch) {
                        clienteCIF = cifMatch[1].toUpperCase().replace(/-/g, '')
                        // El nombre está antes del CIF
                        const cifIndex = clienteText.indexOf(cifMatch[0])
                        let nombrePart = clienteText.substring(0, cifIndex)
                        // Limpiar el nombre
                        nombrePart = nombrePart.replace(/[\.\,\s]+$/, '').trim()
                        if (nombrePart) clienteRaw = nombrePart
                        
                        // Extraer dirección (después del CIF)
                        const afterCIF = clienteText.substring(cifIndex + cifMatch[0].length)
                        // Buscar código postal (5 dígitos)
                        const cpMatch = afterCIF.match(/(\d{5})/)
                        if (cpMatch) {
                            clienteCP = cpMatch[1]
                            // La dirección está antes del CP
                            const cpIndex = afterCIF.indexOf(cpMatch[0])
                            clienteDireccion = afterCIF.substring(0, cpIndex).trim()
                        }
                        // Buscar ciudad (después del CP, antes de España)
                        const ciudadMatch = afterCIF.match(/\d{5}\s*([A-Za-záéíóúñÁÉÍÓÚÑ\s]+?)(?:España|$)/i)
                        if (ciudadMatch) {
                            clienteCiudad = ciudadMatch[1].trim()
                        }
                    } else {
                        // Si no hay CIF, usar todo el texto hasta España o código postal
                        const nombreMatch = clienteText.match(/^([A-Za-záéíóúñÁÉÍÓÚÑ\s\.]+)/i)
                        if (nombreMatch) {
                            clienteRaw = nombreMatch[1].trim()
                        }
                    }
                    return true
                }
                
                // SIEMPRE buscar en el bloque anterior, porque el FACTURAR A de esta factura
                // está ANTES de "FACTURA N.º", es decir, en el bloque anterior.
                extractLastCliente(prevBlock)
                
                console.log(`Factura ${numero}: Cliente = "${clienteRaw}", CIF = "${clienteCIF}", Dir = "${clienteDireccion}", CP = "${clienteCP}"`)
                
                // Buscar cliente en la base de datos - CON DIFERENCIACIÓN POR DIRECCIÓN
                // Primero buscar todos los clientes con el mismo CIF
                const clientesConMismoCIF = clientes.filter(c => {
                    if (clienteCIF && c.cif) {
                        const cifNorm1 = c.cif.replace(/[-\s\.]/g, '').toUpperCase()
                        const cifNorm2 = clienteCIF.replace(/[-\s\.]/g, '').toUpperCase()
                        return cifNorm1 === cifNorm2
                    }
                    return false
                })
                
                let foundCliente: Cliente | undefined
                
                if (clientesConMismoCIF.length === 1) {
                    // Solo hay un cliente con ese CIF, usarlo
                    foundCliente = clientesConMismoCIF[0]
                } else if (clientesConMismoCIF.length > 1) {
                    // Múltiples clientes con mismo CIF (sucursales), diferenciar por dirección/CP/ciudad
                    console.log(`Factura ${numero}: Múltiples clientes con CIF ${clienteCIF}, diferenciando por dirección...`)
                    
                    foundCliente = clientesConMismoCIF.find(c => {
                        // Comparar código postal
                        if (clienteCP && c.codigo_postal) {
                            if (c.codigo_postal === clienteCP) return true
                        }
                        // Comparar ciudad
                        if (clienteCiudad && c.ciudad) {
                            const c1 = normalize(clienteCiudad)
                            const c2 = normalize(c.ciudad)
                            if (c1.includes(c2) || c2.includes(c1)) return true
                        }
                        // Comparar dirección
                        if (clienteDireccion && c.direccion) {
                            const d1 = normalize(clienteDireccion)
                            const d2 = normalize(c.direccion)
                            // Buscar palabras clave de la dirección
                            const words1 = d1.split(" ").filter(w => w.length > 3)
                            const words2 = d2.split(" ").filter(w => w.length > 3)
                            const common = words1.filter(w => words2.some(w2 => w2.includes(w) || w.includes(w2)))
                            if (common.length >= 1) return true
                        }
                        return false
                    })
                    
                    // Si no encuentra por dirección, usar el primero (como fallback)
                    if (!foundCliente) {
                        console.log(`Factura ${numero}: No se pudo diferenciar por dirección, usando primer cliente`)
                        foundCliente = clientesConMismoCIF[0]
                    }
                }
                
                // Si no encontró por CIF, buscar por nombre
                if (!foundCliente && clienteRaw !== "Desconocido") {
                    foundCliente = clientes.find(c => {
                        const n1 = normalize(clienteRaw)
                        const n2 = normalize(c.nombre)
                        if (n1 === n2) return true
                        if (n1.includes(n2) || n2.includes(n1)) return true
                        
                        const words1 = n1.split(" ").filter(w => w.length > 2)
                        const words2 = n2.split(" ").filter(w => w.length > 2)
                        const commonWords = words1.filter(w => words2.includes(w))
                        if (commonWords.length >= 2) return true
                        
                        return false
                    })
                }
                
                console.log(`Factura ${numero}: Cliente encontrado = ${foundCliente ? foundCliente.nombre : 'NINGUNO'}`)
                
                // 4. LÍNEAS DE PRODUCTOS
                // Formato con espacios: 8437027630002 Pauleta de Fresa 60 1.25 75.00
                const lineas: ParsedLine[] = []
                
                // Regex mejorado para el formato con espacios
                const lineRegex = /(843702763\d{4})\s+([A-Za-záéíóúñÁÉÍÓÚÑ\s]+?)\s+(\d+)\s+(\d+\.\d{2})\s+(\d+\.\d{2})/g
                let match
                
                while ((match = lineRegex.exec(block)) !== null) {
                    const codigo = match[1]
                    let descripcion = match[2].trim()
                    const cantidad = parseInt(match[3])
                    const precio = parseFloat(match[4])
                    const importe = parseFloat(match[5])
                    
                    // Buscar producto por código de barras
                    const productMatch = productos.find(p => p.codigo_barras === codigo)
                    
                    // Usar nombre del producto de la DB si existe
                    if (productMatch) {
                        descripcion = productMatch.nombre
                    }
                    
                    lineas.push({
                        codigo,
                        descripcion,
                        cantidad,
                        precio,
                        importe,
                        productoId: productMatch?.id,
                        igic: productMatch?.igic ?? 3 // IGIC general Canarias
                    })
                }
                
                console.log(`Factura ${numero}: ${lineas.length} líneas encontradas`)
                
                // 5. TOTALES
                const subtotalMatch = block.match(/SUBTOTAL\s*([\d.]+)/i)
                const impuestoMatch = block.match(/IMPUESTO\s*([\d.]+)/i)
                const totalMatch = block.match(/TOTAL\s*([\d.]+)/i)
                
                const subtotal = parseFloat(subtotalMatch?.[1] || "0")
                const impuesto = parseFloat(impuestoMatch?.[1] || "0")
                const total = parseFloat(totalMatch?.[1] || "0")
                
                // 6. ESTADO DE PAGO - buscar "SALDO PENDIENTE EUR 0.00" o similar
                const saldoPendienteMatch = block.match(/SALDO\s*PENDIENTE\s*EUR\s*([\d.]+)/i)
                const saldoPendiente = parseFloat(saldoPendienteMatch?.[1] || "999")
                const isPagada = saldoPendiente < 0.01
                
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
                console.error(`Error parsing factura ${i}:`, err)
            }
        }

        console.log("Resultado del parsing:", results)
        return results
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        console.log("=== handleFileUpload iniciado ===")
        const file = e.target.files?.[0]
        if (!file) {
            console.log("No se seleccionó archivo")
            return
        }

        console.log("Archivo seleccionado:", file.name, file.size, "bytes")
        setIsProcessing(true)
        setFacturas([])

        try {
            console.log("Leyendo archivo...")
            const arrayBuffer = await file.arrayBuffer()
            console.log("ArrayBuffer obtenido, tamaño:", arrayBuffer.byteLength)
            
            console.log("Iniciando carga de PDF con pdfjs...")
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
            console.log("Loading task creado")
            
            const pdfData = await loadingTask.promise
            console.log("PDF cargado, páginas:", pdfData.numPages)

            let fullText = ""
            for (let i = 1; i <= pdfData.numPages; i++) {
                console.log(`Procesando página ${i}/${pdfData.numPages}`)
                const page = await pdfData.getPage(i)
                const content = await page.getTextContent()
                const strings = content.items.map((item: any) => item.str)
                fullText += strings.join("") + "\n"
            }
            
            console.log("=== Texto extraído del PDF ===")
            console.log(fullText.substring(0, 3000))
            console.log("=== Fin texto ===")

            const parsed = parsePauletaInvoices(fullText)
            console.log("Facturas parseadas:", parsed.length)
            setFacturas(parsed)
            
            toast({ title: "PDF procesado", description: `Se encontraron ${parsed.length} facturas` })
            
        } catch (err: any) {
            console.error("=== ERROR PROCESANDO PDF ===", err)
            toast({ title: "Error", description: err.message || "Fallo al leer el PDF", variant: "destructive" })
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

                await supabase.from('lineas_factura').delete().eq('factura_id', upsertedFactura.id)

                const { error: lError } = await supabase.from('lineas_factura').insert(
                    f.lineas.map(l => ({
                        factura_id: upsertedFactura.id,
                        producto_id: l.productoId,
                        descripcion: l.descripcion,
                        cantidad: l.cantidad,
                        precio_unitario: l.precio,
                        subtotal: l.importe,
                        igic: l.igic
                    }))
                )

                if (!lError) successCount++
            }

            toast({ title: "Importación finalizada", description: `Se han procesado ${successCount} facturas.` })
            setFacturas([])

        } catch (error) {
            console.error(error)
            toast({ title: "Error crítico", description: "Fallo durante la importación", variant: "destructive" })
        } finally {
            setIsImporting(false)
        }
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        Cargar Archivo de Facturas
                        <Badge variant="secondary" className="text-xs">v3.0</Badge>
                    </CardTitle>
                    <CardDescription>Sube el PDF de facturas de Pauleta Canaria. El sistema detectará automáticamente clientes, productos y estado de cobro.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <input
                                type="file"
                                accept=".pdf"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                onChange={handleFileUpload}
                                disabled={isProcessing || isImporting}
                            />
                            <Button disabled={isProcessing || isImporting}>
                                {isProcessing ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <FileText className="mr-2 h-4 w-4" />
                                )}
                                Seleccionar PDF
                            </Button>
                        </div>
                        {stats.total > 0 && (
                            <div className="flex gap-2 text-sm">
                                <Badge variant="outline">Total: {stats.total}</Badge>
                                <Badge className="bg-green-100 text-green-800 border-green-200">Válidas: {stats.validas}</Badge>
                                {stats.errores > 0 && <Badge variant="destructive">Errores: {stats.errores}</Badge>}
                            </div>
                        )}
                        {stats.validas > 0 && (
                            <Button onClick={importarFacturas} disabled={isImporting} className="ml-auto bg-green-600 hover:bg-green-700">
                                {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Importar {stats.validas} Facturas
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {facturas.length > 0 && (
                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Factura</TableHead>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Cliente</TableHead>
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
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-xs text-muted-foreground truncate max-w-[200px]">{f.clienteRaw}</span>
                                                    {f.clienteId ? (
                                                        <Badge variant="outline" className="bg-green-50 text-green-700 w-fit">
                                                            <User className="mr-1 h-3 w-3" /> {f.clienteNombreMatch}
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-red-500 text-xs font-bold">⚠ {f.error}</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-medium">{f.total.toFixed(2)}€</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1 items-start">
                                                    {f.valida ? (
                                                        <Badge className="bg-green-600">✓ {f.lineas.length} líneas</Badge>
                                                    ) : (
                                                        <Badge variant="destructive" className="flex items-center gap-1">
                                                            <AlertTriangle className="h-3 w-3" /> Error
                                                        </Badge>
                                                    )}
                                                    <Badge variant={f.cobrada ? "default" : "secondary"} className={f.cobrada ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}>
                                                        {f.cobrada ? 'COBRADA' : 'PENDIENTE'}
                                                    </Badge>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                        {f.lineas.length > 0 && (
                                            <TableRow className="bg-slate-50/30 border-b-4 border-white">
                                                <TableCell colSpan={5} className="py-2 px-8">
                                                    <div className="text-[10px] grid grid-cols-6 gap-2 text-muted-foreground uppercase font-bold border-b pb-1 mb-1">
                                                        <span>EAN</span>
                                                        <span className="col-span-2">Producto</span>
                                                        <span className="text-center">Cant.</span>
                                                        <span className="text-right">Precio</span>
                                                        <span className="text-right">Importe</span>
                                                    </div>
                                                    {f.lineas.map((l, lidx) => (
                                                        <div key={lidx} className="grid grid-cols-6 gap-2 py-0.5 border-b border-dotted last:border-0 hover:text-foreground text-xs">
                                                            <span className="font-mono text-[10px]">{l.codigo}</span>
                                                            <span className="col-span-2 truncate flex items-center gap-1">
                                                                {l.productoId ? <CheckCircle className="h-3 w-3 text-green-500" /> : <AlertTriangle className="h-3 w-3 text-amber-500" />}
                                                                {l.descripcion}
                                                            </span>
                                                            <span className="text-center">{l.cantidad}</span>
                                                            <span className="text-right">{l.precio.toFixed(2)}€</span>
                                                            <span className="text-right font-medium">{l.importe.toFixed(2)}€</span>
                                                        </div>
                                                    ))}
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}

export default PDFInvoiceImporter
