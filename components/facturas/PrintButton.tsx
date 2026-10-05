"use client"

import html2canvas from "html2canvas"
import { jsPDF } from "jspdf"
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
    const [pdfObjectUrl, setPdfObjectUrl] = useState("")
    const [pdfBusy, setPdfBusy] = useState(false)
    const [pdfError, setPdfError] = useState("")
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    useEffect(() => {
        setStandalone(isStandaloneMode())
    }, [])

    useEffect(() => {
        return () => {
            if (pdfObjectUrl) URL.revokeObjectURL(pdfObjectUrl)
        }
    }, [pdfObjectUrl])

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

    const buildPdfFromCurrentDocument = async () => {
        const explicitRoot = document.querySelector<HTMLElement>("[data-print-root]")
        const printableRoot = explicitRoot || document.querySelector<HTMLElement>(".print-container") || document.body

        const canvas = await html2canvas(printableRoot, {
            backgroundColor: "#ffffff",
            scale: Math.min(window.devicePixelRatio || 1, 2),
            useCORS: true,
            logging: false,
            windowWidth: Math.max(printableRoot.scrollWidth, printableRoot.clientWidth),
            windowHeight: Math.max(printableRoot.scrollHeight, printableRoot.clientHeight),
            ignoreElements: (element) => {
                const node = element as HTMLElement
                return (
                    node.classList?.contains("print-button") ||
                    node.classList?.contains("print-button-container") ||
                    node.classList?.contains("no-print") ||
                    node.classList?.contains("instructions") ||
                    node.hasAttribute?.("data-print-controls")
                )
            },
        })

        const imageData = canvas.toDataURL("image/jpeg", 0.94)

        if (isThermal) {
            const pageWidthMm = 80
            const pageHeightMm = Math.max(40, (canvas.height * pageWidthMm) / canvas.width)
            const pdf = new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: [pageWidthMm, pageHeightMm],
                compress: true,
            })
            pdf.addImage(imageData, "JPEG", 0, 0, pageWidthMm, pageHeightMm, undefined, "FAST")
            return pdf.output("blob")
        }

        const pageWidthMm = 210
        const pageHeightMm = 297
        const imageHeightMm = (canvas.height * pageWidthMm) / canvas.width
        const pdf = new jsPDF({
            orientation: "portrait",
            unit: "mm",
            format: "a4",
            compress: true,
        })

        let offsetY = 0
        pdf.addImage(imageData, "JPEG", 0, offsetY, pageWidthMm, imageHeightMm, undefined, "FAST")
        let remaining = imageHeightMm - pageHeightMm

        while (remaining > 0) {
            offsetY -= pageHeightMm
            pdf.addPage()
            pdf.addImage(imageData, "JPEG", 0, offsetY, pageWidthMm, imageHeightMm, undefined, "FAST")
            remaining -= pageHeightMm
        }

        return pdf.output("blob")
    }

    const preparePdf = async () => buildPdfFromCurrentDocument()

    const storePdf = (blob: Blob) => {
        if (pdfObjectUrl) URL.revokeObjectURL(pdfObjectUrl)
        const file = new File([blob], `${fileName}.pdf`, { type: "application/pdf" })
        setPdfFile(file)
        setPdfObjectUrl(URL.createObjectURL(blob))
    }

    const handlePrint = async () => {
        if (!standalone) {
            window.print()
            return
        }

        // iOS requires the Share Sheet to be opened by a fresh user gesture.
        // We therefore prepare the PDF on the first tap and share it on the next.
        if (!pdfFile) {
            setPdfBusy(true)
            setPdfError("")
            try {
                const blob = await preparePdf()
                storePdf(blob)
            } catch (error) {
                console.error("Error preparing print PDF:", error)
                setPdfError(error instanceof Error ? error.message : "No se pudo preparar el documento para imprimir.")
            } finally {
                setPdfBusy(false)
            }
            return
        }

        if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [pdfFile] }))) {
            try {
                await navigator.share({
                    files: [pdfFile],
                    title: fileName,
                })
                setPdfError("")
            } catch (error) {
                if (error instanceof DOMException && error.name === "AbortError") return
                console.error("Error sharing print PDF:", error)
                setPdfError("No se pudo abrir el menú de compartir. Usa «Abrir PDF» e imprime desde ahí.")
            }
            return
        }

        setPdfError("Este dispositivo no permite compartir el PDF. Usa «Abrir PDF» e imprime desde ahí.")
    }

    const printLabel = standalone
        ? pdfBusy
            ? "Preparando para imprimir…"
            : pdfFile
                ? "Imprimir / compartir"
                : "Preparar para imprimir"
        : showFormatSelector
            ? "Imprimir A4"
            : "Imprimir / Guardar PDF"

    const printControl = (
        <button
            type="button"
            onClick={() => void handlePrint()}
            disabled={pdfBusy}
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
            aria-live="polite"
        >
            {pdfError || (
                pdfFile
                    ? "Toca «Imprimir / compartir» y selecciona «Imprimir» en el menú de iOS."
                    : "Toca una vez para preparar el documento y otra para abrir las opciones de impresión."
            )}
            {pdfObjectUrl && (
                <a
                    className="block mt-1 text-blue-700 underline"
                    href={pdfObjectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Abrir PDF
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
