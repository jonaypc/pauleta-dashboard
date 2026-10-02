"use client"

import { Printer, Settings } from "lucide-react"
import { useEffect, useState } from "react"
import { PrintFormatSelector } from "./PrintFormatSelector"
import { useRouter, usePathname, useSearchParams } from "next/navigation"

interface PrintButtonProps {
    color?: string
    showFormatSelector?: boolean
    invoiceId?: string
    invoiceNumber?: string
}

export function PrintButton({
    color = "#2563EB",
    showFormatSelector = true,
    invoiceId,
    invoiceNumber,
}: PrintButtonProps) {
    const [dialogOpen, setDialogOpen] = useState(false)
    const [standalone, setStandalone] = useState(false)
    const [pdfFile, setPdfFile] = useState<File | null>(null)
    const [pdfBusy, setPdfBusy] = useState(false)
    const [pdfError, setPdfError] = useState("")
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    useEffect(() => {
        setStandalone(
            window.matchMedia("(display-mode: standalone)").matches ||
            (navigator as Navigator & { standalone?: boolean }).standalone === true
        )
    }, [])

    const useInvoiceShare = standalone && Boolean(invoiceId)
    const isCopy = searchParams.get("copia") === "true"
    const pdfUrl = invoiceId
        ? `/api/facturas/${encodeURIComponent(invoiceId)}/pdf${isCopy ? "?copia=true" : ""}`
        : ""

    const handlePrintA4 = async () => {
        if (!useInvoiceShare) {
            window.print()
            return
        }

        // Sharing a file requires a fresh user gesture on iOS. Preparing it and
        // sharing it are two separate taps so a slow PDF response cannot expire it.
        if (!pdfFile) {
            setPdfBusy(true)
            setPdfError("")
            try {
                const response = await fetch(pdfUrl, { credentials: "same-origin", cache: "no-store" })
                if (!response.ok || !response.headers.get("content-type")?.includes("application/pdf")) {
                    throw new Error("No se pudo preparar el PDF de la factura.")
                }
                const blob = await response.blob()
                setPdfFile(new File([blob], `${invoiceNumber || "Factura"}${isCopy ? "-copia" : ""}.pdf`, {
                    type: "application/pdf",
                }))
            } catch (error) {
                setPdfError(error instanceof Error ? error.message : "No se pudo preparar el PDF.")
            } finally {
                setPdfBusy(false)
            }
            return
        }

        if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [pdfFile] }))) {
            try {
                await navigator.share({ files: [pdfFile] })
                setPdfError("")
            } catch (error) {
                if (error instanceof DOMException && error.name === "AbortError") return
                setPdfError("No se pudo abrir el menú de compartir. Prueba con «Abrir PDF».")
            }
        } else {
            setPdfError("Este dispositivo no admite compartir el PDF. Prueba con «Abrir PDF».")
        }
    }

    const printLabel = useInvoiceShare
        ? pdfBusy
            ? "Preparando PDF…"
            : pdfFile
                ? "Compartir PDF e imprimir"
                : "Preparar PDF para imprimir"
        : "Imprimir A4"

    const printControl = (
        <button
            type="button"
            onClick={handlePrintA4}
            disabled={pdfBusy}
            className="bg-gray-600 text-white font-bold py-2 px-4 rounded-lg shadow-lg flex items-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-60 text-sm"
        >
            <Printer className="h-4 w-4" />
            {printLabel}
        </button>
    )

    const feedback = useInvoiceShare && (
        <div className="rounded-md bg-white/95 p-2 text-xs text-gray-800 shadow-lg max-w-[240px]" role="status" aria-live="polite">
            {pdfError || (pdfFile ? "En el menú que se abre, selecciona «Imprimir»." : "Primero prepara el PDF; después toca compartir para imprimir.")}
            {pdfError && (
                <a className="block mt-1 text-blue-700 underline" href={pdfUrl} target="_blank" rel="noopener noreferrer">
                    Abrir PDF
                </a>
            )}
        </div>
    )

    if (!showFormatSelector) {
        return (
            <div className="print-button fixed bottom-5 right-5 z-50 print:hidden">
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
            void handlePrintA4()
        }
    }

    return (
        <>
            <div className="fixed bottom-5 right-5 flex flex-col gap-2 z-50 print:hidden">
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
