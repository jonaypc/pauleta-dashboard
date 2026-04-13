"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Download, Loader2 } from "lucide-react"
import JSZip from "jszip"

export function ExportButton() {
    const [isExporting, setIsExporting] = useState(false)
    const [progress, setProgress] = useState("")
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
            // Step 1: Get Excel + report PDF + invoice list
            setProgress("Generando Excel y resumen...")
            const params = new URLSearchParams({ from, to })
            const estado = searchParams.get("estado")
            if (estado) params.set("estado", estado)

            const response = await fetch(`/api/facturas/export?${params}`)

            if (!response.ok) {
                let errorMsg = "Error al exportar"
                try {
                    const err = await response.json()
                    errorMsg = err.error || errorMsg
                } catch {
                    errorMsg = response.status === 504
                        ? "Timeout del servidor. Prueba con un rango más corto."
                        : `Error del servidor (${response.status})`
                }
                throw new Error(errorMsg)
            }

            const data = await response.json()

            // Step 2: Reconstruct the base ZIP (Excel + report)
            const baseZipBytes = Uint8Array.from(atob(data.zipBase64), c => c.charCodeAt(0))
            const zip = await JSZip.loadAsync(baseZipBytes)

            // Step 3: Fetch individual PDFs one by one
            const facturas: { id: string; numero: string }[] = data.facturas
            const pdfsFolder = zip.folder("PDFs")!
            let pdfCount = 0

            for (const factura of facturas) {
                pdfCount++
                setProgress(`Generando PDF ${pdfCount}/${facturas.length}...`)

                try {
                    const pdfRes = await fetch(`/api/facturas/${factura.id}/pdf`)
                    if (pdfRes.ok) {
                        const pdfBlob = await pdfRes.arrayBuffer()
                        const safeName = (factura.numero || factura.id).replace(/[/\\?%*:|"<>]/g, "-")
                        pdfsFolder.file(`${safeName}.pdf`, pdfBlob)
                    }
                } catch (pdfErr) {
                    console.error(`Error fetching PDF for ${factura.numero}:`, pdfErr)
                }
            }

            // Step 4: Generate final ZIP and download
            setProgress("Preparando descarga...")
            const finalZip = await zip.generateAsync({ type: "blob" })
            const url = URL.createObjectURL(finalZip)
            const a = document.createElement("a")
            a.href = url
            a.download = `facturas-${from}-a-${to}.zip`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)

            toast({ title: "Exportación completada", description: `${facturas.length} facturas exportadas` })
        } catch (error: any) {
            toast({
                title: "Error al exportar",
                description: error.message,
                variant: "destructive",
            })
        }

        setIsExporting(false)
        setProgress("")
    }

    return (
        <Button variant="outline" onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
                <Download className="mr-2 h-4 w-4" />
            )}
            {isExporting ? progress || "Exportando..." : "Exportar para asesoría"}
        </Button>
    )
}
