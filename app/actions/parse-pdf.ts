"use server"

const pdf = require("pdf-parse");

export async function parsePdfAction(formData: FormData) {
    const file = formData.get("file") as File
    if (!file) {
        return { success: false, error: "No file provided" }
    }

    try {
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // pdf-parse can return messy info objects, let's only take what we need
        // and ensure it's serializable.
        const data = await pdf(buffer)

        if (!data || typeof data.text !== 'string') {
            return { success: false, error: "No se pudo extraer texto del PDF." }
        }

        return {
            success: true,
            text: data.text,
            numpages: data.numpages || 0
        }
    } catch (error: any) {
        console.error("PDF Parse Error:", error)
        return { success: false, error: "Error al leer el PDF. Asegúrate de que no esté protegido o dañado." }
    }
}
