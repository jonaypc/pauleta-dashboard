"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, Loader2 } from "lucide-react"

interface DownloadPresupuestoPDFButtonProps {
    presupuestoId: string
    presupuestoNumero: string
}

export function DownloadPresupuestoPDFButton({
    presupuestoId,
    presupuestoNumero,
}: DownloadPresupuestoPDFButtonProps) {
    const [isDownloading, setIsDownloading] = useState(false)

    const handleDownload = async () => {
        try {
            setIsDownloading(true)

            const response = await fetch(`/api/presupuestos/${presupuestoId}/pdf`)

            if (!response.ok) {
                throw new Error("Error al generar PDF")
            }

            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = `${presupuestoNumero}.pdf`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            window.URL.revokeObjectURL(url)
        } catch (error) {
            console.error("Error downloading PDF:", error)
            alert("Error al descargar el PDF")
        } finally {
            setIsDownloading(false)
        }
    }

    return (
        <Button
            variant="outline"
            onClick={handleDownload}
            disabled={isDownloading}
        >
            {isDownloading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
                <Download className="mr-2 h-4 w-4" />
            )}
            Descargar PDF
        </Button>
    )
}
