interface InvoicePrintPDFOptions {
    fileName: string
    signal: AbortSignal
    copy?: boolean
}

// Asset loading and canvas rendering can stall in an installed iOS app. The
// caller's deadline must cover the whole operation, not just a network fetch.
function withAbort<T>(operation: PromiseLike<T>, signal: AbortSignal): Promise<T> {
    return new Promise((resolve, reject) => {
        const abort = () => {
            signal.removeEventListener("abort", abort)
            reject(new Error("La preparación del PDF tardó demasiado. Pulsa para reintentar."))
        }
        signal.addEventListener("abort", abort, { once: true })
        Promise.resolve(operation).then(resolve, reject).finally(() => {
            signal.removeEventListener("abort", abort)
        })
        if (signal.aborted) abort()
    })
}

function waitForImage(image: HTMLImageElement, signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
        const cleanup = () => {
            image.removeEventListener("load", loaded)
            image.removeEventListener("error", failed)
            signal.removeEventListener("abort", aborted)
        }
        const loaded = () => { cleanup(); resolve() }
        const failed = () => { cleanup(); reject(new Error("No se pudo cargar el logo de la factura. Pulsa para reintentar.")) }
        const aborted = () => { cleanup(); reject(new Error("Se canceló la preparación del PDF.")) }
        if (signal.aborted) return aborted()
        if (image.complete) return image.naturalWidth > 0 ? loaded() : failed()
        image.addEventListener("load", loaded, { once: true })
        image.addEventListener("error", failed, { once: true })
        signal.addEventListener("abort", aborted, { once: true })
        // The print logo must load even if it is outside a narrow viewport.
        image.loading = "eager"
    })
}

async function preserveCopyStamp(clone: Document) {
    const label = clone.querySelector<HTMLElement>(".html2pdf__container .invoice .copy-label")
    if (!label || !clone.defaultView) return
    const style = clone.defaultView.getComputedStyle(label)
    const width = label.offsetWidth
    const height = label.offsetHeight
    const padding = 12
    const border = parseFloat(style.borderTopWidth)
    const matrix = style.transform.match(/^matrix\(([^)]+)\)$/)?.[1].split(",").map(Number)
    const angle = matrix ? Math.atan2(matrix[1], matrix[0]) * 180 / Math.PI : 0
    const escape = (value: string) => value.replace(/[&<>"']/g, character => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;",
    }[character]!))
    // html2canvas rotates the CSS border but misplaces the rotated text. An
    // SVG in the capture clone keeps both together without changing the page.
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width + padding * 2}" height="${height + padding * 2}">
      <g transform="rotate(${angle} ${padding + width / 2} ${padding + height / 2})">
        <rect x="${padding + border / 2}" y="${padding + border / 2}" width="${width - border}" height="${height - border}" rx="${parseFloat(style.borderTopLeftRadius)}" fill="${style.backgroundColor}" stroke="${style.borderTopColor}" stroke-width="${border}"/>
        <text x="${padding + width / 2}" y="${padding + height / 2}" text-anchor="middle" dominant-baseline="central" fill="${style.color}" font-family="${escape(style.fontFamily)}" font-size="${style.fontSize}" font-weight="${style.fontWeight}" letter-spacing="${style.letterSpacing}">${escape(label.textContent || "COPIA")}</text>
      </g>
    </svg>`
    const image = clone.createElement("img")
    image.className = label.className
    image.alt = label.textContent || "COPIA"
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
    Object.assign(image.style, {
        width: `${width + padding * 2}px`, height: `${height + padding * 2}px`,
        top: `${parseFloat(style.top) - padding}px`, transform: "translateX(-50%)",
        border: "none", padding: "0", background: "transparent", borderRadius: "0",
    })
    label.replaceWith(image)
    // Safari may capture a newly inserted SVG before its image has decoded.
    // Do not produce an apparently original invoice if the stamp cannot load.
    await image.decode()
}

export async function generateInvoicePrintPDF({ fileName, signal, copy = false }: InvoicePrintPDFOptions): Promise<Blob> {
    const invoice = document.querySelector<HTMLElement>(".invoice[data-print-root]")
    if (!invoice) throw new Error("No se ha encontrado la factura para imprimir.")

    if (copy && !invoice.querySelector(".copy-label")) {
        throw new Error("La copia aún no está preparada. Vuelve a pulsar para reintentar.")
    }

    // Capture the configured print view itself: the server's email/download
    // renderer uses a different layout, including a different COPIA mark.
    await withAbort(Promise.all([
        document.fonts.ready,
        ...Array.from(invoice.querySelectorAll("img")).map(image => waitForImage(image, signal)),
    ]), signal)
    const { default: html2pdf } = await withAbort(import("html2pdf.js"), signal)

    const width = Math.max(invoice.scrollWidth, invoice.clientWidth)
    const height = Math.max(invoice.scrollHeight, invoice.clientHeight)
    // Keep the canvas within a small iOS memory budget for longer invoices.
    const scale = Math.min(1.5, Math.sqrt(3_000_000 / (width * height)))

    return withAbort(html2pdf()
        .set({
            margin: 0,
            filename: `${fileName}.pdf`,
            image: { type: "jpeg", quality: 0.96 },
            html2canvas: {
                scale,
                useCORS: true,
                imageTimeout: 4000,
                backgroundColor: "#ffffff",
                windowWidth: width,
                logging: false,
                onclone: preserveCopyStamp,
            },
            jsPDF: { unit: "mm", format: "a4", orientation: "portrait", compress: true },
            // Supported at runtime, but omitted from html2pdf.js's types.
            pagebreak: { mode: ["css", "legacy"], avoid: ["tr", ".totals-box", ".bank-info", ".legal-text"] },
        } as any)
        .from(invoice)
        .outputPdf("blob"), signal)
}
