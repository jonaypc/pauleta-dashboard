"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, FileText, AlertTriangle, CheckCircle, Loader2, X } from "lucide-react"
import Papa from "papaparse"
import * as XLSX from "xlsx"
import { format } from "date-fns"
import { saveBankMovements } from "@/lib/actions/tesoreria"
import { useRouter } from "next/navigation"
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

    const processFile = (file: File) => {
        setIsLoading(true)
        setFile(file)

        const extension = file.name.split('.').pop()?.toLowerCase()

        if (extension === 'csv') {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    setRawHeaders(results.meta.fields || [])
                    setPreviewData(results.data.slice(0, 5))
                    // Intentar auto-mapeo básico
                    autoMap(results.meta.fields || [])
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
                    const headers = json[0].map(h => String(h))
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
                        const mapped = results.data.map(row => ({
                            fecha: (row as any)[mapping.fecha],
                            importe: parseFloat(String((row as any)[mapping.importe]).replace(',', '.')),
                            descripcion: (row as any)[mapping.descripcion] || "Sin descripción",
                            referencia: (row as any)[mapping.referencia] || ""
                        })).filter(r => r.fecha && !isNaN(r.importe))

                        await saveBankMovements(mapped)
                        toast({
                            title: "Importación completada",
                            description: `Se han importado ${mapped.length} movimientos.`,
                        })
                        router.refresh()
                        setFile(null)
                        setIsLoading(false)
                        onImportComplete?.(mapped)
                    }
                })
            } else {
                // Implementación Excel (breve)
                const reader = new FileReader()
                reader.onload = async (e) => {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer)
                    const workbook = XLSX.read(data, { type: 'array' })
                    const firstSheetName = workbook.SheetNames[0]
                    const worksheet = workbook.Sheets[firstSheetName]
                    const json = XLSX.utils.sheet_to_json(worksheet) as any[]

                    const mapped = json.map(row => ({
                        fecha: row[mapping.fecha],
                        importe: parseFloat(String(row[mapping.importe]).replace(',', '.')),
                        descripcion: row[mapping.descripcion] || "Sin descripción",
                        referencia: row[mapping.referencia] || ""
                    })).filter(r => r.fecha && !isNaN(r.importe))

                    await saveBankMovements(mapped)
                    toast({
                        title: "Importación completada",
                        description: `Se han importado ${mapped.length} movimientos.`,
                    })
                    router.refresh()
                    setFile(null)
                    setIsLoading(false)
                    onImportComplete?.(mapped)
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
                                    <Select value={mapping.referencia} onValueChange={(v) => setMapping(p => ({ ...p, referencia: v }))}>
                                        <SelectTrigger className="h-8 text-xs">
                                            <SelectValue placeholder="No usar" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="">-- No usar --</SelectItem>
                                            {rawHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
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
