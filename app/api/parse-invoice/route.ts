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
            console.log("Processing PDF file with pdf-parse (SERVER SIDE)...")
            try {
                // Lazy load pdf-parse to avoid initialization errors if not needed
                // @ts-ignore
                const pdfParser = require("pdf-parse");

                const pdfData = await pdfParser(buffer)

                // Extra defensive check for result
                if (!pdfData || typeof pdfData.text !== 'string') {
                    throw new Error("Invalid PDF data returned from parser")
                }

                const text = pdfData.text.trim()
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
