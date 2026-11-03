"use client"

import { Button } from "@/components/ui/button"
import { Download, Loader2 } from "lucide-react"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"

interface ExportButtonProps {
    data: any[]
    filename?: string
}

export function ExportButton({ data, filename = "informe-ventas" }: ExportButtonProps) {
    const [isExporting, setIsExporting] = useState(false)
    const { toast } = useToast()
    const handleExport = async () => {
        setIsExporting(true)
        try {
            const XLSX = await import("xlsx")
            // 1. Transformar datos para Excel (aplanar objetos, formatear fechas)
            const excelData = data.map(f => ({
                Numero: f.numero,
                Fecha: f.fecha,
                Cliente: f.cliente?.nombre || "N/A",
                Estado: f.estado,
                Base: f.base_imponible,
                IGIC: f.igic,
                Total: f.total,
                Notas: f.notas || ""
            }))

            // 2. Crear libro y hoja
            const wb = XLSX.utils.book_new()
            const ws = XLSX.utils.json_to_sheet(excelData)

            // Ajustar columnas (opcional, simple aproximación)
            const wscols = [
                { wch: 15 }, // Numero
                { wch: 12 }, // Fecha
                { wch: 30 }, // Cliente
                { wch: 10 }, // Estado
                { wch: 10 }, // Base
                { wch: 10 }, // IGIC
                { wch: 10 }, // Total
                { wch: 30 }, // Notas
            ]
            ws['!cols'] = wscols

            XLSX.utils.book_append_sheet(wb, ws, "Ventas")

            // 3. Descargar archivo
            const dateStr = format(new Date(), "yyyy-MM-dd")
            XLSX.writeFile(wb, `${filename}-${dateStr}.xlsx`)
        } catch {
            toast({ title: "No se pudo exportar", description: "Vuelve a intentarlo.", variant: "destructive" })
        } finally {
            setIsExporting(false)
        }
    }

    return (
        <Button variant="outline" size="icon" onClick={handleExport} disabled={isExporting} title="Exportar a Excel" aria-label="Exportar a Excel">
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        </Button>
    )
}
