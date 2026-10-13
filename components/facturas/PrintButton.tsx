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
    const [pdfObjectUrl, setPdfObjectUrl] = useState("")
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

    // iOS 27 standalone PWAs may silently ignore window.print(). Prepare a real
    // PDF for every document, so the tap can use the native iOS share sheet.
    useEffect(() => {
        if (!standalone) {
            setServerPdf(null)
            setPdfLoading(false)
            setPdfError("")
            return
        }

        const controller = new AbortController()
        const timeoutId = window.setTimeout(() => controller.abort(), 20000)
        let cancelled = false

        const loadPdf = async () => {
            setPdfLoading(true)
            setPdfError("")
            setServerPdf(null)
            try {
                let blob: Blob

                if (invoicePdfUrl) {
                    const response = await fetch(invoicePdfUrl, {
                        credentials: "same-origin",
                        cache: "no-store",
                        signal: controller.signal,
                    })
                    if (!response.ok) throw new Error("No se pudo generar el PDF de la factura.")
                    blob = await response.blob()
                } else {
                    // For delivery notes, invoice relations and thermal receipts
                    // there is no server PDF route: preserve the visible layout.
                    await document.fonts.ready
                    const printable = document.querySelector<HTMLElement>(
                        ".print-container > .invoice, .print-container > .albaran, " +
                        ".print-container > .document, .print-container > .thermal-receipt, " +
                        ".print-container > .control-cambios, .invoice, .albaran, " +
                        ".document, .thermal-receipt, .control-cambios"
                    )
                    if (!printable) throw new Error("No se ha encontrado el documento para imprimir.")
                    // @ts-ignore - html2pdf.js does not ship TypeScript declarations.
                    const { default: html2pdf } = await import("html2pdf.js")
                    if (cancelled) return

                    const thermal = pathname.includes("/print/thermal/")
                    blob = await html2pdf()
                        .set({
                            margin: 0,
                            filename: `${fileName}.pdf`,
                            image: { type: "jpeg", quality: 0.96 },
                            html2canvas: { scale: 1.5, useCORS: true, backgroundColor: "#ffffff" },
                            jsPDF: {
                                unit: "mm",
                                format: thermal ? [80, 297] : "a4",
                                orientation: "portrait",
                            },
                            pagebreak: { mode: ["css", "legacy"], avoid: ["tr", ".signature-box", ".total-row"] },
                        })
                        .from(printable)
                        .outputPdf("blob")
                }

                if (!cancelled) {
                    if (!blob.size) throw new Error("El PDF generado está vacío.")
                    setServerPdf(new File([blob], `${fileName}.pdf`, { type: "application/pdf" }))
                }
            } catch (error) {
                if (!cancelled) {
                    console.error("Error preparing iOS PDF:", error)
                    setPdfError("No se pudo preparar el PDF. Abre el documento en Chrome para imprimirlo.")
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
    }, [standalone, invoicePdfUrl, fileName, pathname])

    useEffect(() => {
        if (!serverPdf) {
            setPdfObjectUrl("")
            return
        }
        const objectUrl = URL.createObjectURL(serverPdf)
        setPdfObjectUrl(objectUrl)
        return () => URL.revokeObjectURL(objectUrl)
    }, [serverPdf])

    const handlePrint = async () => {
        if (!standalone) {
            window.print()
            return
        }

        if (!serverPdf) {
            setPdfError(pdfLoading
                ? "Preparando el PDF… Vuelve a pulsar cuando aparezca «PDF listo»."
                : "No hay un PDF disponible. Abre este documento en Chrome para imprimirlo.")
            return
        }

        // iOS standalone has a native share sheet, unlike window.print().
        // Share only the files array: some iOS versions reject an extra title.
        if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [serverPdf] }))) {
            try {
                setPdfError("Abriendo las opciones de impresión del iPhone…")
                await navigator.share({ files: [serverPdf] })
                setPdfError("")
                return
            } catch (error) {
                if (error instanceof DOMException && error.name === "AbortError") {
                    setPdfError("Se cerraron las opciones de compartir. Puedes volver a intentarlo.")
                    return
                }
                console.error("Error sharing PDF on iOS:", error)
            }
        }
        setPdfError("No se abrió el menú de iOS. Usa «Guardar PDF» aquí debajo.")
    }

    const printLabel = standalone
        ? pdfLoading
            ? "Preparando PDF…"
            : "Imprimir / compartir PDF"
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
                ? "PDF listo. Pulsa «Imprimir / compartir PDF» y elige «Imprimir» en iOS."
                : pdfLoading
                    ? "Preparando el documento para imprimirlo desde la app…"
                    : "No se ha preparado ningún PDF.")}
            {pdfObjectUrl && (
                <a
                    className="mt-2 block font-semibold text-blue-700 underline"
                    href={invoicePdfUrl || pdfObjectUrl}
                    download={`${fileName}.pdf`}
                >
                    Guardar / abrir PDF
                </a>
            )}
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
