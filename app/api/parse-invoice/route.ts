import { NextRequest, NextResponse } from "next/server"
import { analyzeTextWithGPT, analyzeImageWithGPT } from "@/lib/ai/invoice-parser"

// Configurar tiempo máximo de ejecución en Vercel (segundos)
export const maxDuration = 60;

export async function POST(request: NextRequest) {
    try {
        // Verificar API key (aunque la lib también lo hace, mejor fallar rápido)
        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json({
                success: false,
                error: "OPENAI_API_KEY no configurada. Añádela en .env.local"
            }, { status: 500 })
        }

        const formData = await request.formData()
        const file = formData.get("file") as File

        if (!file) {
            return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 })
        }

        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        console.log("File received:", { name: file.name, type: file.type, size: file.size })

        const isImage = file.type.includes("image") ||
            file.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|bmp)$/)

        const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")

        if (isImage) {
            console.log("Processing Image file...")
            const imageBase64 = buffer.toString('base64')
            const mimeType = file.type || 'image/jpeg'

            const parsed = await analyzeImageWithGPT(imageBase64, mimeType)

            return NextResponse.json({
                success: true,
                text: "[Imagen analizada con IA]",
                parsed,
                method: "vision-analysis"
            })
        } else if (isPdf) {
            console.log("Processing PDF file with pdfjs-dist (SERVER SIDE)...")
            try {
                // Polyfill simple para DOMMatrix (necesario para pdfjs-dist en entorno Node)
                if (!global.DOMMatrix) {
                    // @ts-ignore
                    global.DOMMatrix = class DOMMatrix {
                        constructor() {
                            // @ts-ignore
                            this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0;
                        }
                        translate() { return this; }
                        scale() { return this; }
                    }
                }

                // Direct usage of pdfjs-dist (Legacy build for Node)
                // @ts-ignore
                const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");

                // Force bundling of worker
                // @ts-ignore
                try { require("pdfjs-dist/legacy/build/pdf.worker.js"); } catch (e) { }

                const uint8Array = new Uint8Array(buffer);
                const loadingTask = pdfjsLib.getDocument({
                    data: uint8Array,
                    // Contexto Node: fonts deshabilitadas y factoria dummy
                    disableFontFace: true,
                    verbosity: 0,
                    // @ts-ignore
                    StandardFontDataFactory: class StandardFontDataFactory {
                        fetch() { return null; }
                    }
                });

                const pdfDocument = await loadingTask.promise
                let text = ""

                // Extract text from first 5 pages max
                const maxPages = Math.min(pdfDocument.numPages, 5)
                for (let i = 1; i <= maxPages; i++) {
                    const page = await pdfDocument.getPage(i)
                    const content = await page.getTextContent()
                    const strings = content.items.map((item: any) => item.str)
                    text += strings.join(" ") + "\n"
                }

                text = text.trim()
                console.log(`PDF Text extracted length: ${text.length} chars`)

                // Si hay muy poco texto, probablemente sea una imagen escaneada
                if (text.length < 50) {
                    return NextResponse.json({
                        success: false,
                        error: "El PDF parece ser una imagen escaneada (sin texto seleccionable). Por favor, sube una foto (JPG/PNG) de la factura.",
                        debug: { reason: "insufficient_text", textLength: text.length }
                    }, { status: 422 })
                }

                // Analizar texto extraído
                const parsed = await analyzeTextWithGPT(text)

                return NextResponse.json({
                    success: true,
                    text: text.substring(0, 100) + "...",
                    parsed,
                    method: "pdf-text-analysis"
                })

            } catch (pdfError: any) {
                console.error("PDF Parse Error (CRITICAL):", pdfError)
                return NextResponse.json({
                    success: false,
                    error: "No se pudo leer el PDF automáticamente. Por favor, convierte el archivo a Imagen (JPG/PNG) y vuelve a intentarlo.",
                    debug: { error: pdfError.message || "Unknown PDF error" }
                }, { status: 422 })
            }
        } else {
            return NextResponse.json({
                success: false,
                error: `Tipo de archivo no soportado. Recibido: ${file.name} (${file.type})`,
                debug: { name: file.name, type: file.type }
            }, { status: 400 })
        }

    } catch (error: any) {
        console.error("Invoice Parse Error:", error)
        return NextResponse.json({
            success: false,
            error: error.message || "Error interno al analizar la factura."
        }, { status: 500 })
    }
}
