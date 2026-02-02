"use client"

import { Button } from "@/components/ui/button"
import { Printer } from "lucide-react"
import { useEffect, useState } from "react"

interface PrintButtonProps {
    color?: string
}

export function PrintButton({ color = "#2563EB" }: PrintButtonProps) {
    const [isPrinting, setIsPrinting] = useState(false)

    // Handle print via keyboard shortcut (Ctrl+P) custom behavior if needed, 
    // but browser default usually works. 
    // This component is mainly for the persistent floating button.

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
