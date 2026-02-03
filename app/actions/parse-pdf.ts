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

        const data = await pdf(buffer)

        return {
            success: true,
            text: data.text,
            info: data.info,
            numpages: data.numpages
        }
    } catch (error: any) {
        console.error("PDF Parse Error:", error)
        return { success: false, error: error.message || "Failed to parse PDF" }
    }
}
