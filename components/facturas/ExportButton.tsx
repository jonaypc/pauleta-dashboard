"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Download, Loader2 } from "lucide-react"

export function ExportButton() {
    const [isExporting, setIsExporting] = useState(false)
    const searchParams = useSearchParams()
    const { toast } = useToast()

    const handleExport = async () => {
        const from = searchParams.get("from")
        const to = searchParams.get("to")

        if (!from || !to) {
            toast({
                title: "Selecciona un rango de fechas",
                description: "Usa el filtro de fechas para elegir el período a exportar (ej: trimestre)",
                variant: "destructive",
            })
            return
        }

        setIsExporting(true)

        try {
            const params = new URLSearchParams({ from, to })
            const estado = searchParams.get("estado")
            if (estado) params.set("estado", estado)

            const response = await fetch(`/api/facturas/export?${params}`)

            if (!response.ok) {
                const err = await response.json()
                throw new Error(err.error || "Error al exportar")
            }

            // Download the ZIP
            const blob = await response.blob()
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `facturas-${from}-a-${to}.zip`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)

            toast({ title: "Exportación completada" })
        } catch (error: any) {
            toast({
                title: "Error al exportar",
                description: error.message,
                variant: "destructive",
            })
        }

        setIsExporting(false)
    }

    return (
        <Button variant="outline" onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
                <Download className="mr-2 h-4 w-4" />
            )}
            Exportar para asesoría
        </Button>
    )
}
