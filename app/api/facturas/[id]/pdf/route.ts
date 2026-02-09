import { NextRequest, NextResponse } from "next/server"
import chromium from "@sparticuz/chromium"
import puppeteer from "puppeteer-core"

export const maxDuration = 30 // Tiempo máximo para serverless function

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const id = params.id

    // Obtener la URL base para renderizar la página de impresión
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
        process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
        request.nextUrl.origin

    const printUrl = `${baseUrl}/print/facturas/${id}`

    try {
        // Lanzar navegador
        const browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: true,
        })

        const page = await browser.newPage()

        // Navegar a la página de impresión (con cookies de sesión si es necesario)
        await page.goto(printUrl, {
            waitUntil: "networkidle0",
            timeout: 30000,
        })

        // Esperar a que cargue el contenido
        await page.waitForSelector('.invoice', { timeout: 10000 })

        // Generar PDF con formato A4
        const pdfBuffer = await page.pdf({
            format: "A4",
            printBackground: true,
            margin: { top: 0, right: 0, bottom: 0, left: 0 },
        })

        await browser.close()

        // Devolver PDF
        return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `inline; filename="factura-${id}.pdf"`,
                "Cache-Control": "no-cache, no-store, must-revalidate",
            },
        })
    } catch (error: any) {
        console.error("Error generating PDF:", error)
        return NextResponse.json(
            { error: "Error generando PDF", details: error.message },
            { status: 500 }
        )
    }
}
