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

    const invoicePdfUrl = invoiceId
        ? `/api/facturas/${invoiceId}/pdf${isCopy ? "?copia=true" : ""}`
        : ""

    useEffect(() => {
        if (!standalone || !invoiceId) return

        const controller = new AbortController()
        let cancelled = false

        const loadPdf = async () => {
            setPdfBusy(true)
            setPdfError("")
            setPdfFile(null)

            try {
                const response = await fetch(invoicePdfUrl, {
                    credentials: "same-origin",
                    cache: "no-store",
                    signal: controller.signal,
                })
                if (!response.ok) throw new Error("No se pudo generar el PDF de la factura.")

                const blob = await response.blob()
                if (cancelled) return

                setPdfFile(new File([blob], `${fileName}.pdf`, { type: "application/pdf" }))
            } catch (error) {
                if (cancelled || (error instanceof DOMException && error.name === "AbortError")) return
                console.error("Error loading invoice PDF:", error)
                setPdfError(error instanceof Error ? error.message : "No se pudo preparar el PDF.")
            } finally {
                if (!cancelled) setPdfBusy(false)
            }
        }

        void loadPdf()
        return () => {
            cancelled = true
            controller.abort()
        }
    }, [standalone, invoiceId, invoicePdfUrl, fileName])

    const handlePrint = async () => {
        if (!standalone) {
            window.print()
            return
        }

        // In iOS standalone mode share a real PDF file. This avoids the iOS 27
        // window.print() regression and makes the native sheet treat the invoice
        // as a printable document instead of as a web link.
        if (invoiceId) {
            if (pdfBusy) return

            if (pdfFile && navigator.share && (!navigator.canShare || navigator.canShare({ files: [pdfFile] }))) {
                try {
                    await navigator.share({
                        files: [pdfFile],
                        title: fileName,
                    })
                    return
                } catch (error) {
                    if (error instanceof DOMException && error.name === "AbortError") return
                    console.error("Error sharing invoice PDF:", error)
                }
            }

            // If file sharing is unavailable or generation failed, open the real PDF.
            if (invoicePdfUrl) {
                window.open(invoicePdfUrl, "_blank", "noopener,noreferrer")
                return
            }
        }

        // Non-invoice printable views keep the current fallback until they get
        // their own server PDF endpoint.
        if (navigator.share) {
            try {
                await navigator.share({ title: fileName, url: window.location.href })
                return
            } catch (error) {
                if (error instanceof DOMException && error.name === "AbortError") return
            }
        }
        window.open(window.location.href, "_blank", "noopener,noreferrer")
    }

    const printLabel = standalone
        ? (invoiceId && pdfBusy ? "Preparando PDF…" : "Imprimir / compartir")
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
            {invoiceId
                ? (pdfError || (pdfFile
                    ? "PDF listo. Toca «Imprimir / compartir» y selecciona «Imprimir» en iOS."
                    : "Generando el PDF de la factura…"))
                : "Toca «Imprimir / compartir» para abrir las opciones de iOS."}
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
