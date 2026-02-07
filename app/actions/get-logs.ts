"use server"

import { createAdminClient } from "@/lib/supabase/server"

export async function getWebhookLogs() {
    try {
        const supabase = await createAdminClient()
        const { data, error } = await supabase
            .from('webhook_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50)

        if (error) {
            console.error("Error getting logs:", error)
            return { success: false, error: error.message }
        }

        return { success: true, data }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}
