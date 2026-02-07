"use server"
import { createAdminClient } from "@/lib/supabase/server"

export async function runFullDebugAction() {
    try {
        console.log("Starting Full Webhook Emulation...")
        const supabase = await createAdminClient()

        // 1. Test Storage Upload
        const dummyContent = "Hello Webhook Debug"
        const fileName = `debug_test_${Date.now()}.txt`
        const filePath = `facturas_gastos/${fileName}`

        console.log("Attempting Upload to:", filePath)
        const { error: uploadError, data: uploadData } = await supabase.storage
            .from('gastos')
            .upload(filePath, dummyContent, { contentType: 'text/plain' })

        if (uploadError) {
            console.error("Storage Upload Failed:", uploadError)
            return { success: false, step: 'storage', error: uploadError }
        }

        console.log("Upload Success:", uploadData)

        // 2. Get Public URL
        const { data: publicUrlData } = supabase.storage.from('gastos').getPublicUrl(filePath)
        const publicUrl = publicUrlData.publicUrl

        // 3. Test DB Insert
        const { error: insertError, data: insertData } = await supabase.from('gastos').insert({
            fecha: new Date().toISOString(),
            importe: 0.10,
            numero: "DEBUG-FULL-" + Date.now(),
            estado: 'pendiente',
            proveedor_id: null,
            base_imponible: 0.10,
            iva: 0,
            // NOTA: Usamos notas para concepto tambien
            notas: `Debug Full Test.\nConcepto: Test de Storage + DB.\nURL: ${publicUrl}`,
            archivo_url: publicUrl
        }).select().single()

        if (insertError) {
            console.error("DB Insert Failed:", insertError)
            return { success: false, step: 'db', error: insertError }
        }

        return { success: true, data: insertData, url: publicUrl }

    } catch (e: any) {
        console.error("Debug Action Execption:", e)
        return { success: false, step: 'exception', error: e.message }
    }
}
