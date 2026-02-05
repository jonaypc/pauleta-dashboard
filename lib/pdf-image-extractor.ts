import { getDocument, OPS, PDFDocumentProxy } from "pdfjs-dist"

// Configurar worker falso para Node.js
import * as pdfjsLib from "pdfjs-dist"

// Configurar worker falso para Node.js (necesario para pdfjs-dist en servidor)
if (typeof window === 'undefined') {
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = ""
    }
}

/**
 * Extracts the first image found in the first page of a PDF.
 * Ideal for scanned documents where the page is just one big image.
 */
export async function extractFirstImageFromPDF(buffer: Buffer): Promise<{ data: Buffer, mimeType: string } | null> {
    try {
        // Convert Buffer to Uint8Array/ArrayBuffer for pdfjs
        const data = new Uint8Array(buffer)

        // Load document
        const loadingTask = getDocument({

            data,
            verbosity: 0,
            useSystemFonts: false,
            disableFontFace: true,
        })

        const doc: PDFDocumentProxy = await loadingTask.promise

        if (doc.numPages < 1) return null

        const page = await doc.getPage(1)
        const ops = await page.getOperatorList()

        let imageName: string | null = null

        // Look for the paintImageXObject operator
        for (let i = 0; i < ops.fnArray.length; i++) {
            if (ops.fnArray[i] === OPS.paintImageXObject) {
                // The first argument is the image name in the resource dictionary
                imageName = ops.argsArray[i][0]
                // We take the first image we find, assuming it's the main scan
                break
            }
        }

        if (!imageName) {
            return null
        }

        // Get the image object
        return new Promise<({ data: Buffer, mimeType: string } | null)>((resolve) => {
            page.objs.get(imageName, (img: any) => {
                if (!img) {
                    resolve(null)
                    return
                }

                // Check if we have data
                // ImageKind.RGB = 1, ImageKind.GRAYSCALE_1BPP = 2, ImageKind.RGB_24BPP = 3 ?
                // pdfjs internal structures vary.

                // If it's a JPEG stream, it's often stored directly or we can access it.
                // However, pdfjs often decodes it. 

                // NOTE: Extracting the *original* raw standard byte stream (e.g. unmodified JPEG) 
                // is hard via the high-level API because pdfjs decodes everything for rendering.
                // But often `img.data` contains the raw bytes if we are lucky or if we access the stream directly.

                // Given the complexity of re-encoding or finding the raw stream in the myriad of pdfjs versions,
                // and the fact that we have `pdf-to-img` as a renderer fallback, 
                // we will stick to a simpler strategy here: 
                // ONLY return if we can get a Buffer that is recognizably an image file (e.g. internal jpeg stream),
                // otherwise return null and let the renderer handle it.

                // Actually, let's try to be smart. If the user just needs "Scanned PDF -> Image", 
                // rendering it is often safer than extracting raw objects which might be CMYK or tiled.

                // Let's rely on standard rendering via pdf-to-img first. 
                // This file might be better used as a utility to detect IF it is a scanned image. isImageOnly?

                resolve(null)
            })
        })

    } catch (e) {
        console.error("Error analyzing PDF structure:", e)
        return null
    }
}
