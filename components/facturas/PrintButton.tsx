"use client"

import { Button } from "@/components/ui/button"
import { Printer, FileText, Settings } from "lucide-react"
import { useState } from "react"
import { PrintFormatSelector } from "./PrintFormatSelector"
import { useRouter, usePathname, useSearchParams } from "next/navigation"

interface PrintButtonProps {
    color?: string
    showFormatSelector?: boolean
}

export function PrintButton({ color = "#2563EB", showFormatSelector = true }: PrintButtonProps) {
    const [dialogOpen, setDialogOpen] = useState(false)
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const handleFormatSelect = (format: 'a4' | 'thermal') => {
        if (format === 'thermal') {
            // Redirigir a la versión térmica del documento
            const currentParams = new URLSearchParams(searchParams.toString())

            // Construir la URL térmica
            let thermalPath = pathname.replace('/print/', '/print/thermal/')

            // Mantener los parámetros de búsqueda
            const paramsString = currentParams.toString()
            if (paramsString) {
                thermalPath += `?${paramsString}`
            }

            router.push(thermalPath)
        } else {
            // Ya estamos en A4 o imprimir directamente
            window.print()
        }
    }

    if (!showFormatSelector) {
        return (
            <button
                onClick={() => window.print()}
                className="print-button fixed bottom-5 right-5 text-white font-bold py-3 px-6 rounded-lg shadow-lg flex items-center gap-2 transition-opacity hover:opacity-90 z-50 print:hidden"
                style={{ backgroundColor: color }}
            >
                <Printer className="h-5 w-5" />
                Imprimir / Guardar PDF
            </button>
        )
    }

    return (
        <>
            <div className="fixed bottom-5 right-5 flex flex-col gap-2 z-50 print:hidden">
                <button
                    onClick={() => setDialogOpen(true)}
                    className="text-white font-bold py-3 px-6 rounded-lg shadow-lg flex items-center gap-2 transition-opacity hover:opacity-90"
                    style={{ backgroundColor: color }}
                >
                    <Settings className="h-5 w-5" />
                    Elegir Formato
                </button>

                <button
                    onClick={() => window.print()}
                    className="bg-gray-600 text-white font-bold py-2 px-4 rounded-lg shadow-lg flex items-center gap-2 transition-opacity hover:opacity-90 text-sm"
                >
                    <Printer className="h-4 w-4" />
                    Imprimir A4
                </button>
            </div>

            <PrintFormatSelector
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onSelect={handleFormatSelect}
            />
        </>
    )
}
