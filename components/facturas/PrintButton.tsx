"use client"

import { Printer, Settings } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { PrintFormatSelector } from "./PrintFormatSelector"

interface PrintButtonProps {
    color?: string
    showFormatSelector?: boolean
    invoiceId?: string
    invoiceNumber?: string
}

function isStandaloneMode() {
    return (
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true
    )
}

function safeFileName(value: string) {
    return value.replace(/[/\\?%*:|"<>]/g, "-").replace(/\s+/g, " ").trim()
}

export function PrintButton({
    color = "#2563EB",
    showFormatSelector = true,
    invoiceNumber,
}: PrintButtonProps) {
    const [dialogOpen, setDialogOpen] = useState(false)
    const [standalone, setStandalone] = useState(false)
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    useEffect(() => {
        setStandalone(isStandaloneMode())
    }, [])

    const isCopy = searchParams.get("copia") === "true"
    const isThermal = pathname.includes("/print/thermal/")
    const fallbackFileName = useMemo(() => {
        const routeName = pathname
            .replace(/^\/print\/thermal\//, "")
            .replace(/^\/print\//, "")
            .replace(/\//g, "-")
            .replace(/\[|\]/g, "")
        return safeFileName(`Pauleta-${routeName || "documento"}`)
    }, [pathname])

    const fileName = invoiceNumber
        ? safeFileName(`${invoiceNumber}${isCopy ? "-copia" : ""}`)
        : fallbackFileName

    const handlePrint = async () => {
        if (!standalone) {
            window.print()
            return
        }

        // iOS standalone mode: avoid window.print() and client-side PDF rendering,
        // both of which are unreliable after the iOS update. Sharing the current
        // printable URL opens the native iOS share sheet without re-rendering the invoice.
        if (navigator.share) {
            try {
                await navigator.share({
                    title: fileName,
                    url: window.location.href,
                })
                return
            } catch (error) {
                if (error instanceof DOMException && error.name === "AbortError") return
                console.error("Error opening iOS share sheet:", error)
            }
        }

        // Last-resort fallback: open the same printable view in a new browser context.
        window.open(window.location.href, "_blank", "noopener,noreferrer")
    }

    const printLabel = standalone
        ? "Imprimir / compartir"
        : showFormatSelector
            ? "Imprimir A4"
            : "Imprimir / Guardar PDF"

    const printControl = (
        <button
            type="button"
            onClick={() => void handlePrint()}
            className={showFormatSelector
                ? "bg-gray-600 text-white font-bold py-2 px-4 rounded-lg shadow-lg flex items-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-60 text-sm"
                : "text-white font-bold py-3 px-6 rounded-lg shadow-lg flex items-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-60"}
            style={showFormatSelector ? undefined : { backgroundColor: color }}
        >
            <Printer className="h-4 w-4" />
            {printLabel}
        </button>
    )

    const feedback = standalone && (
        <div
            className="rounded-md bg-white/95 p-2 text-xs text-gray-800 shadow-lg max-w-[250px]"
            role="status"
        >
            Toca «Imprimir / compartir» y después selecciona «Imprimir» en el menú de iOS.
        </div>
    )

    if (!showFormatSelector) {
        return (
            <div className="print-button fixed bottom-5 right-5 z-50 print:hidden" data-print-controls>
                {printControl}
                {feedback}
            </div>
        )
    }

    const handleFormatSelect = (format: "a4" | "thermal") => {
        if (format === "thermal") {
            let thermalPath = pathname.replace("/print/", "/print/thermal/")
            const paramsString = searchParams.toString()
            if (paramsString) thermalPath += `?${paramsString}`
            router.push(thermalPath)
        } else {
            void handlePrint()
        }
    }

    return (
        <>
            <div className="fixed bottom-5 right-5 flex flex-col gap-2 z-50 print:hidden" data-print-controls>
                <button
                    type="button"
                    onClick={() => setDialogOpen(true)}
                    className="text-white font-bold py-3 px-6 rounded-lg shadow-lg flex items-center gap-2 transition-opacity hover:opacity-90"
                    style={{ backgroundColor: color }}
                >
                    <Settings className="h-5 w-5" />
                    Elegir Formato
                </button>
                {printControl}
                {feedback}
            </div>
            <PrintFormatSelector
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onSelect={handleFormatSelect}
            />
        </>
    )
}
