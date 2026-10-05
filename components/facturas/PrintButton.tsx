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
    const [serverPdf, setServerPdf] = useState<File | null>(null)
    const [pdfLoading, setPdfLoading] = useState(false)
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

    const invoicePdfUrl = invoiceId && !isThermal
        ? `/api/facturas/${invoiceId}/pdf${isCopy ? "?copia=true" : ""}`
        : ""

    useEffect(() => {
        if (!standalone || !invoicePdfUrl) {
            setServerPdf(null)
            setPdfLoading(false)
            setPdfError("")
            return
        }

        const controller = new AbortController()
        const timeoutId = window.setTimeout(() => controller.abort(), 12000)
        let cancelled = false

        const loadPdf = async () => {
            setPdfLoading(true)
            setPdfError("")
            setServerPdf(null)
            try {
                const response = await fetch(invoicePdfUrl, {
                    credentials: "same-origin",
                    cache: "no-store",
                    signal: controller.signal,
                })
                if (!response.ok) throw new Error("No se pudo generar el PDF.")
                const blob = await response.blob()
                if (!cancelled) {
                    setServerPdf(new File([blob], `${fileName}.pdf`, { type: "application/pdf" }))
                }
            } catch (error) {
                if (!cancelled) {
                    console.error("Error loading server PDF:", error)
                    setPdfError("No se pudo precargar el PDF. Toca imprimir para abrirlo directamente.")
                }
            } finally {
                window.clearTimeout(timeoutId)
                if (!cancelled) setPdfLoading(false)
            }
        }

        void loadPdf()
        return () => {
            cancelled = true
            window.clearTimeout(timeoutId)
            controller.abort()
        }
    }, [standalone, invoicePdfUrl, fileName])

    const handlePrint = async () => {
        if (!standalone) {
            window.print()
            return
        }

        if (serverPdf && navigator.share && (!navigator.canShare || navigator.canShare({ files: [serverPdf] }))) {
            try {
                await navigator.share({
                    files: [serverPdf],
                    title: fileName,
                })
                return
            } catch (error) {
                if (error instanceof DOMException && error.name === "AbortError") return
                console.error("Error sharing PDF:", error)
            }
        }

        if (invoicePdfUrl) {
            window.open(invoicePdfUrl, "_blank", "noopener,noreferrer")
            return
        }

        // For non-invoice printable views, open a fresh browser context.
        // Safari/iOS can print the already-rendered page from there.
        window.open(window.location.href, "_blank", "noopener,noreferrer")
    }

    const printLabel = standalone
        ? pdfLoading && invoicePdfUrl
            ? "Cargando PDF…"
            : "Imprimir / compartir"
        : showFormatSelector
            ? "Imprimir A4"
            : "Imprimir / Guardar PDF"

    const printControl = (
        <button
            type="button"
            onClick={() => void handlePrint()}
            className={showFormatSelector
                ? "bg-gray-600 text-white font-bold py-2 px-4 rounded-lg shadow-lg flex items-center gap-2 transition-opacity hover:opacity-90 text-sm"
                : "text-white font-bold py-3 px-6 rounded-lg shadow-lg flex items-center gap-2 transition-opacity hover:opacity-90"}
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
            aria-live="polite"
        >
            {pdfError || (serverPdf
                ? "PDF listo. Toca «Imprimir / compartir» y selecciona «Imprimir» en iOS."
                : invoicePdfUrl && pdfLoading
                    ? "Preparando el PDF desde el servidor…"
                    : "Toca «Imprimir / compartir» para abrir las opciones de impresión.")}
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
