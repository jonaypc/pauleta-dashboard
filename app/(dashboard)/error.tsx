'use client'

import { useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error('Dashboard Error:', error)
    }, [error])

    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
            <div className="rounded-full bg-red-100 p-3">
                <AlertTriangle className="h-10 w-10 text-red-600" />
            </div>
            <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold tracking-tight">¡Algo salió mal!</h2>
                <p className="text-muted-foreground w-[500px]">
                    Ha ocurrido un error al cargar el dashboard.
                </p>
                <div className="bg-slate-100 p-4 rounded-md text-left text-xs font-mono overflow-auto max-w-[600px] border border-slate-200">
                    <p className="font-bold text-red-700">Message: {error.message}</p>
                    {error.digest && <p className="text-slate-500">Digest: {error.digest}</p>}
                    {error.stack && <p className="mt-2 text-slate-600 whitespace-pre-wrap">{error.stack}</p>}
                </div>
            </div>
            <Button
                onClick={
                    // Attempt to recover by trying to re-render the segment
                    () => reset()
                }
            >
                Intentar de nuevo
            </Button>
        </div>
    )
}
