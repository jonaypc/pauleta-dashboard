import { getDocument } from "pdfjs-dist"
import { createCanvas } from "canvas"

// Configurar worker falso para Node.js (necesario para pdfjs-dist en servidor)
// En Next.js a veces hay que manejar esto con cuidado para evitar errores de compilación
// Si falla el build, moveremos esto a un archivo separado que solo se importe en servidor.

// Aseguramos que pdfjs use el worker fake
import * as pdfjsLib from "pdfjs-dist"

// Aseguramos que pdfjs use el worker fake
if (typeof window === 'undefined') {
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = ""
    }
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
            canvasContext: context as any,
            viewport: viewport,
            canvas: canvas as any
        } as any).promise

        // Convertir a buffer (PNG)
        return canvas.toBuffer('image/png')

    } catch (e: any) {
        console.error("Error rendering PDF to image:", e)
        throw new Error(`PDF Rendering failed: ${e.message || e}`)
    }
}
