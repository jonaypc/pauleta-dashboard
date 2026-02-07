"use server"

import { createAdminClient } from "@/lib/supabase/server"

export async function testDbLog() {
    try {
        const supabase = await createAdminClient()
        const { data, error } = await supabase.from('webhook_logs').insert({
            source: 'manual-test',
            status: 'test',
            metadata: { message: 'Hello from manual test' }
        }).select().single()

        if (error) {
            return { success: false, error: error.message }
        }

        return { success: true, data }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}
