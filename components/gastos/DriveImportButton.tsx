"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Cloud, Loader2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

export function DriveImportButton() {
    const [isLoading, setIsLoading] = useState(false)
    const [progress, setProgress] = useState("")
    const router = useRouter()

    const handleSync = async () => {
        setIsLoading(true)
        setProgress("Escaneando...")

        let totalProcessed = 0
        let totalErrors = 0
        let totalDuplicates = 0
        let batch = 0

        try {
            // Hacer llamadas en bucle hasta que no queden archivos pendientes
            while (true) {
                batch++
                setProgress(`Lote ${batch}...`)

                const res = await fetch('/api/sync-drive?manual=true', {
                    method: 'GET',
                })

                const data = await res.json()

                if (!res.ok) {
                    throw new Error(data.error || "Error al sincronizar")
                }

                const procCount = data.processed?.length || 0
                const errCount = data.errors?.length || 0
                const dupCount = data.processed?.filter((p: any) => p.status === 'duplicate').length || 0

                totalProcessed += procCount - dupCount
                totalErrors += errCount
                totalDuplicates += dupCount

                setProgress(`${totalProcessed} importados, ${totalDuplicates} duplicados...`)

                // Si no quedan archivos pendientes, terminar
                if (data.remaining === 0 || data.new_files === 0) {
                    break
                }

                // Si no se procesó nada y no hay pendientes, terminar (evitar bucle infinito)
                if (procCount === 0 && errCount === 0) {
                    break
                }
            }

            // Mostrar resultado final
            const parts: string[] = []
            if (totalProcessed > 0) parts.push(`${totalProcessed} importados`)
            if (totalDuplicates > 0) parts.push(`${totalDuplicates} duplicados`)
            if (totalErrors > 0) parts.push(`${totalErrors} con error`)
            if (parts.length === 0) parts.push("No hay archivos nuevos")

            toast({
                title: totalErrors > 0 && totalProcessed === 0
                    ? "Errores al importar"
                    : "Sincronización completada",
                description: parts.join(" · "),
                variant: totalErrors > 0 && totalProcessed === 0 ? "destructive" : undefined,
            })

            router.refresh()
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error de sincronización",
                description: error.message,
            })
        } finally {
            setIsLoading(false)
            setProgress("")
        }
    }

    return (
        <Button
            variant="outline"
            onClick={handleSync}
            disabled={isLoading}
            className="flex"
        >
            {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
                <Cloud className="mr-2 h-4 w-4 text-blue-600" />
            )}
            {isLoading ? progress || "Importando..." : "Importar Drive"}
        </Button>
    )
}
