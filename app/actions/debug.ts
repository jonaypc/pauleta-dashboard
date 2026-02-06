"use server"
import { simulateWebhook } from "@/lib/debug-webhook"

export async function runSimulationAction() {
    return await simulateWebhook()
}
