"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, FileText, AlertTriangle, CheckCircle, Loader2, X, Zap, ExternalLink } from "lucide-react"
import Papa from "papaparse"
import * as XLSX from "xlsx"
import { format } from "date-fns"
import { saveBankMovements } from "@/lib/actions/tesoreria"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

interface BankStatementImporterProps {
    onImportComplete?: (data: any[]) => void
}

export function BankStatementImporter({ onImportComplete }: BankStatementImporterProps) {
    const { toast } = useToast()
    const router = useRouter()
    const [file, setFile] = useState<File | null>(null)
    const [rawHeaders, setRawHeaders] = useState<string[]>([])
    const [previewData, setPreviewData] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [progress, setProgress] = useState(0)

    // Mapping state
    const [mapping, setMapping] = useState({
        fecha: "",
        importe: "",
        descripcion: "",
        referencia: ""
    })

    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (selectedFile) {
            processFile(selectedFile)
        }
    }

    // Helper to format date consistently for Supabase (YYYY-MM-DD)
    const formatForSupabase = (dateInput: any): string | null => {
        if (!dateInput) return null

        try {
            let d: Date

            // Handle Excel serial numbers
            if (typeof dateInput === 'number') {
                // Excel dates are days since 1899-12-30
                d = new Date((dateInput - 25569) * 86400 * 1000)
            } else if (dateInput instanceof Date) {
                d = dateInput
            } else {
                // Try parsing string
                const dateStr = String(dateInput).trim()
                // Simple DD/MM/YYYY or DD-MM-YYYY check
                const parts = dateStr.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/)
                if (parts) {
                    d = new Date(parseInt(parts[3]), parseInt(parts[2]) - 1, parseInt(parts[1]))
                } else {
                    d = new Date(dateStr)
                }
            }

            if (isNaN(d.getTime())) return null
            return d.toISOString().split('T')[0]
        } catch (e) {
            return null
        }
    }

    const processFile = (file: File) => {
        setIsLoading(true)
        setFile(file)

        const extension = file.name.split('.').pop()?.toLowerCase()

        if (extension === 'csv') {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    const headers = (results.meta.fields || []).filter(h => h && h.trim() !== "")
                    setRawHeaders(headers)
                    setPreviewData(results.data.slice(0, 5))
                    // Intentar auto-mapeo básico
                    autoMap(headers)
                    setIsLoading(false)
                },
                error: (error) => {
                    console.error("Error parsing CSV", error)
                    setIsLoading(false)
                }
            })
        } else if (extension === 'xlsx' || extension === 'xls') {
            const reader = new FileReader()
            reader.onload = (e) => {
                const data = new Uint8Array(e.target?.result as ArrayBuffer)
                const workbook = XLSX.read(data, { type: 'array' })
                const firstSheetName = workbook.SheetNames[0]
                const worksheet = workbook.Sheets[firstSheetName]
                const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

                if (json.length > 0) {
                    const headers = json[0].map(h => String(h || "").trim()).filter(h => h !== "")
                    setRawHeaders(headers)

                    const formattedData = json.slice(1, 6).map(row => {
                        const obj: any = {}
                        headers.forEach((h, i) => {
                            obj[h] = row[i]
                        })
                        return obj
                    })
                    setPreviewData(formattedData)
                    autoMap(headers)
                }
                setIsLoading(false)
            }
            reader.readAsArrayBuffer(file)
        }
    }

    const autoMap = (headers: string[]) => {
        const newMapping = { ...mapping }
        const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")

        headers.forEach(h => {
            const normalized = normalize(h)
            if (normalized.includes("fecha") || normalized.includes("date")) newMapping.fecha = h
            if (normalized.includes("importe") || normalized.includes("cantidad") || normalized.includes("amount") || normalized.includes("valor")) newMapping.importe = h
            if (normalized.includes("descripcion") || normalized.includes("concepto") || normalized.includes("detalles") || normalized.includes("description") || normalized.includes("movement")) newMapping.descripcion = h
            if (normalized.includes("referencia") || normalized.includes("ref")) newMapping.referencia = h
        })
        setMapping(newMapping)
    }

    const handleImport = async () => {
        if (!file || !mapping.fecha || !mapping.importe) return

        setIsLoading(true)
        setProgress(10)

        try {
            // Re-leer archivo para procesar todo con el mapeo
            if (file.name.endsWith('.csv')) {
                Papa.parse(file, {
                    header: true,
                    skipEmptyLines: true,
                    complete: async (results) => {
                        try {
                            const mapped = results.data.map((row: any) => {
                                const fechaRaw = row[mapping.fecha]
                                const fechaFormatted = formatForSupabase(fechaRaw)

                                return {
                                    fecha: fechaFormatted,
                                    importe: parseFloat(String(row[mapping.importe]).replace(',', '.')),
                                    descripcion: row[mapping.descripcion] || "Sin descripción",
                                    referencia: mapping.referencia && mapping.referencia !== "unmapped" ? row[mapping.referencia] : ""
                                }
                            }).filter(r => r.fecha && !isNaN(r.importe)) as any[]

                            if (mapped.length === 0) {
                                throw new Error("No se encontraron movimientos válidos en el archivo.")
                            }

                            await saveBankMovements(mapped)
                            toast({
                                title: "Importación completada",
                                description: `Se han importado ${mapped.length} movimientos.`,
                            })
                            router.refresh()
                            setFile(null)
                            onImportComplete?.(mapped)
                        } catch (err: any) {
                            console.error("Error during CSV import processing:", err)
                            toast({
                                title: "Error al importar",
                                description: err.message || "Hubo un problema al procesar los movimientos.",
                                variant: "destructive"
                            })
                        } finally {
                            setIsLoading(false)
                        }
                    }
                })
            } else {
                // Implementación Excel (breve)
                const reader = new FileReader()
                reader.onload = async (e) => {
                    try {
                        const data = new Uint8Array(e.target?.result as ArrayBuffer)
                        const workbook = XLSX.read(data, { type: 'array' })
                        const firstSheetName = workbook.SheetNames[0]
                        const worksheet = workbook.Sheets[firstSheetName]
                        const json = XLSX.utils.sheet_to_json(worksheet) as any[]

                        const mapped = json.map(row => {
                            const fechaRaw = row[mapping.fecha]
                            const fechaFormatted = formatForSupabase(fechaRaw)

                            return {
                                fecha: fechaFormatted,
                                importe: parseFloat(String(row[mapping.importe]).replace(',', '.')),
                                descripcion: row[mapping.descripcion] || "Sin descripción",
                                referencia: mapping.referencia && mapping.referencia !== "unmapped" ? row[mapping.referencia] : ""
                            }
                        }).filter(r => r.fecha && !isNaN(r.importe)) as any[]

                        if (mapped.length === 0) {
                            throw new Error("No se encontraron movimientos válidos en el archivo.")
                        }

                        await saveBankMovements(mapped)
                        toast({
                            title: "Importación completada",
                            description: `Se han importado ${mapped.length} movimientos.`,
                        })
                        router.refresh()
                        setFile(null)
                        onImportComplete?.(mapped)
                    } catch (err: any) {
                        console.error("Error during Excel import processing:", err)
                        toast({
                            title: "Error al importar",
                            description: err.message || "Hubo un problema al procesar los movimientos.",
                            variant: "destructive"
                        })
                    } finally {
                        setIsLoading(false)
                    }
                }
                reader.readAsArrayBuffer(file)
            }
        } catch (error) {
            console.error(error)
            toast({
                title: "Error al importar",
                description: "Hubo un problema al guardar los movimientos.",
                variant: "destructive"
            })
            setIsLoading(false)
        }
    }

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <Upload className="h-5 w-5" /> Importar Extracto Bancario
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-between gap-4">
                    <div className="flex gap-3 items-start">
                        <Zap className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-sm font-bold text-blue-900">¿Cansado de subir archivos?</p>
                            <p className="text-xs text-blue-700">Conecta tu cuenta de Cajamar y recibe movimientos automáticamente.</p>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" asChild className="border-blue-200 hover:bg-blue-100 shrink-0">
                        <Link href="/tesoreria/configuracion">
                            <ExternalLink className="h-4 w-4 mr-2" /> Configurar
                        </Link>
                    </Button>
                </div>

                {!file ? (
                    <div
                        className="border-2 border-dashed rounded-lg p-12 text-center hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            type="file"
                            className="hidden"
                            ref={fileInputRef}
                            accept=".csv,.xlsx,.xls"
                            onChange={handleFileChange}
                        />
                        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-sm font-medium">Sube tu archivo CSV o Excel</p>
                        <p className="text-xs text-muted-foreground mt-1">Soportado por la mayoría de bancos (Cajamar, BBVA, etc.)</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between bg-muted p-3 rounded-md">
                            <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-blue-500" />
                                <span className="text-sm font-medium">{file.name}</span>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setFile(null)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="grid gap-4 bg-muted/30 p-4 rounded-lg border">
                            <h4 className="text-sm font-semibold mb-2">Mapeo de Columnas</h4>
                            <div className="grid gap-3 md:grid-cols-2">
                                <div>
                                    <label className="text-xs font-medium mb-1 block">Fecha</label>
                                    <Select value={mapping.fecha} onValueChange={(v) => setMapping(p => ({ ...p, fecha: v }))}>
                                        <SelectTrigger className="h-8 text-xs">
                                            <SelectValue placeholder="Selecciona columna" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {rawHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <label className="text-xs font-medium mb-1 block">Importe</label>
                                    <Select value={mapping.importe} onValueChange={(v) => setMapping(p => ({ ...p, importe: v }))}>
                                        <SelectTrigger className="h-8 text-xs">
                                            <SelectValue placeholder="Selecciona columna" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {rawHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <label className="text-xs font-medium mb-1 block">Descripción / Concepto</label>
                                    <Select value={mapping.descripcion} onValueChange={(v) => setMapping(p => ({ ...p, descripcion: v }))}>
                                        <SelectTrigger className="h-8 text-xs">
                                            <SelectValue placeholder="Selecciona columna" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {rawHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <label className="text-xs font-medium mb-1 block">Referencia (Opcional)</label>
                                    <Select value={mapping.referencia || "unmapped"} onValueChange={(v) => setMapping(p => ({ ...p, referencia: v }))}>
                                        <SelectTrigger className="h-8 text-xs">
                                            <SelectValue placeholder="No usar" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="unmapped">-- No usar --</SelectItem>
                                            {rawHeaders.map((h, i) => (
                                                <SelectItem key={`${h}-${i}`} value={h}>{h}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        <Button
                            className="w-full"
                            disabled={!mapping.fecha || !mapping.importe || isLoading}
                            onClick={handleImport}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Procesando...
                                </>
                            ) : (
                                "Confirmar e Importar"
                            )}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
