import { createAdminClient } from "@/lib/supabase/server"

// Simulation of webhook Logic for debugging
export async function simulateWebhook() {
    console.log("Starting simulation...")
    const supabase = await createAdminClient()

    // Check if we can write to DB with admin client
    const { data, error } = await supabase.from('gastos').insert({
        fecha: new Date().toISOString(),
        importe: 1.00,
        numero: "TEST-WEBHOOK-SIMULATION",
        estado: 'pendiente',
        notas: "Simulation Test. This is a test from the debug script to verify createAdminClient permissions."
    }).select()

    if (error) {
        console.error("Simulation Failed - DB Insert Error:", error)
        return { success: false, error }
    } else {
        console.log("Simulation Success - Inserted:", data)
        return { success: true, data }
    }
}
