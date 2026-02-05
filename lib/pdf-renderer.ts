import { getDocument } from "pdfjs-dist"
import { createCanvas } from "canvas"

// Configurar worker falso para Node.js (necesario para pdfjs-dist en servidor)
// En Next.js a veces hay que manejar esto con cuidado para evitar errores de compilación
// Si falla el build, moveremos esto a un archivo separado que solo se importe en servidor.

// Aseguramos que pdfjs use el worker fake
const pdfjs = require("pdfjs-dist")
if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = ""
}

interface RenderOptions {
    scale?: number
}

export async function convertPdfToImage(buffer: Buffer, options: RenderOptions = { scale: 1.5 }): Promise<Buffer | null> {
    try {
        const data = new Uint8Array(buffer)

        const loadingTask = getDocument({
            data,
            verbosity: 0,
            useSystemFonts: false,
            disableFontFace: true,
        })

        const doc = await loadingTask.promise
        if (doc.numPages < 1) return null

        // Renderizar primera página
        const page = await doc.getPage(1)

        const viewport = page.getViewport({ scale: options.scale || 1.5 })

        // Crear canvas
        const canvas = createCanvas(viewport.width, viewport.height)
        const context = canvas.getContext('2d')

        // Renderizar
        await page.render({
            canvasContext: context as any, // "as any" porque el tipo NodeCanvasContext no siempre coincide exacto con DOM CanvasRenderingContext2D
            viewport: viewport
        }).promise

        // Convertir a buffer (PNG)
        return canvas.toBuffer('image/png')

    } catch (e: any) {
        console.error("Error rendering PDF to image:", e)
        throw new Error(`PDF Rendering failed: ${e.message || e}`)
    }
}
