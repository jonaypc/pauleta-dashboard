"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Cloud, Loader2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

export function DriveImportButton() {
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    const handleSync = async () => {
        setIsLoading(true)
        try {
            // Llamada al endpoint con flag manual=true para saltar auth de cron
            const res = await fetch('/api/sync-drive?manual=true', {
                method: 'GET',
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || "Error al sincronizar")
            }

            const errCount = data.errors?.length || 0
            const procCount = data.processed?.length || 0

            if (errCount > 0 && procCount === 0) {
                toast({
                    variant: "destructive",
                    title: "Errores al importar",
                    description: `${errCount} archivo(s) con error: ${data.errors[0]?.error || 'Error desconocido'}`,
                })
            } else if (errCount > 0) {
                toast({
                    title: "Importación parcial",
                    description: `${procCount} procesados, ${errCount} con error`,
                    variant: "destructive",
                })
            } else {
                toast({
                    title: "Sincronización completada",
                    description: data.message || `${procCount} archivos procesados`,
                })
            }

            router.refresh()
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error de sincronización",
                description: error.message,
            })
        } finally {
            setIsLoading(false)
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
            Importar Drive
        </Button>
    )
}
