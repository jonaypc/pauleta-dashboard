import { getDocument } from "pdfjs-dist"
import * as Canvas from "canvas"
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
        // Manejo robusto de importaciones CJS/ESM para canvas
        // Debugging import issues
        console.log("Canvas Import Type:", typeof Canvas)
        console.log("Canvas Keys:", Object.keys(Canvas))
        console.log("Canvas.default Keys:", (Canvas as any).default ? Object.keys((Canvas as any).default) : "No default")

        const createCanvas = Canvas.createCanvas || (Canvas as any).default?.createCanvas
        if (!createCanvas) {
            throw new Error(`Could not load createCanvas. Keys: ${Object.keys(Canvas).join(',')}`)
        }

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
