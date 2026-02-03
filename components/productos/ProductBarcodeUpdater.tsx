"use client"

import { useState, useRef } from "react"
import * as XLSX from "xlsx"
import { Upload, FileUp, AlertTriangle, CheckCircle, Loader2, Download, Barcode, Tag } from "lucide-react"
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

interface ProductBarcodeUpdaterProps {
    productosExistentes: { id: string; nombre: string; codigo_barras?: string }[]
}

interface ExcelRow {
    Nombre: string
    [key: string]: any // Flexibilidad para nombres de columna como "Barcode", "Codigo", etc.
}

interface ProcessedProduct {
    productoId: string
    nombre: string
    codigoActual: string
    codigoNuevo: string
    estado: 'match' | 'no_match' | 'duplicate' | 'sin_cambio'
}

export function ProductBarcodeUpdater({ productosExistentes }: ProductBarcodeUpdaterProps) {
    const supabase = createClient()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [previsualizacion, setPrevisualizacion] = useState<ProcessedProduct[]>([])
    const [stats, setStats] = useState({ total: 0, matches: 0, nuevos: 0 })

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
                    description: "No se pudo procesar el Excel.",
                    variant: "destructive"
                })
            } finally {
                setIsProcessing(false)
            }
        }

        reader.readAsBinaryString(file)
    }

    const normalize = (str: string) => str?.toString().trim().toLowerCase() || ""

    // Función para buscar columna de código de barras
    const findBarcodeValue = (row: any): string => {
        // Buscar claves comunes
        const keys = Object.keys(row).map(k => k.toLowerCase())
        const barcodeKey = keys.find(k => k.includes("bar") || k.includes("code") || k.includes("codigo") || k.includes("ean"))

        if (barcodeKey) {
            // Encontrar la clave original (case sensitive)
            const originalKey = Object.keys(row).find(k => k.toLowerCase() === barcodeKey)
            return originalKey ? row[originalKey]?.toString().trim() : ""
        }
        return ""
    }

    const procesarDatos = (rows: ExcelRow[]) => {
        const resultados: ProcessedProduct[] = []
        let matchesCount = 0
        let nuevosCount = 0

        rows.forEach(row => {
            const nombreExcel = row.Nombre?.toString().trim()
            if (!nombreExcel) return

            const codigoNuevo = findBarcodeValue(row)
            if (!codigoNuevo) return

            // Buscar producto existente
            const producto = productosExistentes.find(p =>
                normalize(p.nombre) === normalize(nombreExcel)
            )

            if (producto) {
                let estado: ProcessedProduct['estado'] = 'match'

                if (producto.codigo_barras === codigoNuevo) {
                    estado = 'sin_cambio'
                } else if (!producto.codigo_barras) {
                    estado = 'match' // Nuevo código
                    nuevosCount++
                } else {
                    estado = 'match' // Sobreescritura (avisar?)
                    nuevosCount++
                }

                matchesCount++
                resultados.push({
                    productoId: producto.id,
                    nombre: producto.nombre,
                    codigoActual: producto.codigo_barras || "-",
                    codigoNuevo,
                    estado
                })
            } else {
                resultados.push({
                    productoId: "",
                    nombre: nombreExcel,
                    codigoActual: "-",
                    codigoNuevo,
                    estado: 'no_match'
                })
            }
        })

        setPrevisualizacion(resultados)
        setStats({
            total: resultados.length,
            matches: matchesCount,
            nuevos: nuevosCount
        })
    }

    const actualizarCodigos = async () => {
        const porActualizar = previsualizacion.filter(p => p.estado === 'match')
        if (porActualizar.length === 0) return

        setIsUploading(true)
        try {
            let successCount = 0

            // Hacerlo en paralelo o serie? Serie es más seguro para feedback
            for (const item of porActualizar) {
                const { error } = await supabase
                    .from('productos')
                    .update({ codigo_barras: item.codigoNuevo })
                    .eq('id', item.productoId)

                if (!error) successCount++
            }

            toast({
                title: "Actualización completada",
                description: `Se han actualizado ${successCount} códigos de barras.`,
                variant: "success"
            })

            setPrevisualizacion([])
        } catch (error) {
            console.error(error)
            toast({
                title: "Error",
                description: "Fallo al actualizar códigos.",
                variant: "destructive"
            })
        } finally {
            setIsUploading(false)
        }
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Barcode className="h-5 w-5" />
                        Cargar Códigos de Barras
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
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
                                Subir Excel de Productos
                            </Button>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            El Excel debe tener columnas "Nombre" y alguna columna tipo "Código", "Barcode" o "EAN".
                        </p>
                    </div>
                </CardContent>
            </Card>

            {previsualizacion.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                            <Badge variant="outline" className="text-sm">Total: {stats.total}</Badge>
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-green-200 text-sm">
                                Encontrados: {stats.matches}
                            </Badge>
                            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200 text-sm">
                                Nuevos Códigos: {stats.nuevos}
                            </Badge>
                        </div>
                        <Button
                            onClick={actualizarCodigos}
                            disabled={isUploading || stats.nuevos === 0}
                        >
                            {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirmar Actualización
                        </Button>
                    </div>

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Producto (Excel)</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead>Código Actual</TableHead>
                                    <TableHead>Nuevo Código</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {previsualizacion.map((item, idx) => (
                                    <TableRow key={idx}>
                                        <TableCell className="font-medium">{item.nombre}</TableCell>
                                        <TableCell>
                                            {item.estado === 'match' && <Badge className="bg-green-600">Actualizar</Badge>}
                                            {item.estado === 'sin_cambio' && <Badge variant="outline">Sin cambios</Badge>}
                                            {item.estado === 'no_match' && <Badge variant="destructive">No encontrado</Badge>}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{item.codigoActual}</TableCell>
                                        <TableCell className="font-bold">{item.codigoNuevo}</TableCell>
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
