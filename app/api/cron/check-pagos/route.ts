import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Esta ruta será llamada por Vercel Cron
// Configurar en vercel.json: "crons": [{ "path": "/api/cron/check-pagos", "schedule": "0 8 * * *" }]

export async function GET(request: NextRequest) {
    try {
        // Verificar autorización (CRON_SECRET)
        const authHeader = request.headers.get("authorization")
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const supabase = await createClient()
        const hoy = new Date().getDate()
        const thisMonth = new Date().getMonth() // 0-11
        const thisYear = new Date().getFullYear()

        // 1. Obtener pagos fijos activos
        const { data: pagos } = await supabase
            .from("pagos_fijos")
            .select("*")
            .eq("activo", true)

        if (!pagos || pagos.length === 0) {
            return NextResponse.json({ message: "No active payments" })
        }

        const notificacionesToCreate = []

        // 2. Revisar cuáles vencen pronto (próximos 3 días)
        // Nota: Simplificación - solo chequeamos días del mes actual.
        // Para ser perfecto habría que manejar cambio de mes (día 30 vs día 1)

        for (const pago of pagos) {
            const diasRestantes = pago.dia_inicio - hoy

            // Si faltan 3, 2, 1 o 0 días
            if (diasRestantes >= 0 && diasRestantes <= 3) {
                // Verificar si ya notificamos este mes para este pago
                // (Esto requiere una tabla de logs o metadatos más complejos)
                // Por simplificación en este MVP:
                // Solo enviamos si es exactamente el día de inicio - 3 (aviso previo)
                // O el día de inicio (hoy)

                let mensaje = ""
                if (diasRestantes === 0) {
                    mensaje = `HOY vence el pago de: ${pago.concepto}`
                } else if (diasRestantes === 3) {
                    mensaje = `En 3 días vence: ${pago.concepto}`
                }

                if (mensaje) {
                    notificacionesToCreate.push({
                        tipo: "pago_proximo",
                        mensaje,
                        enviada: false, // El sistema de notificaciones en UI las mostrará
                        fecha_envio: new Date().toISOString(),
                        metadata: { pago_id: pago.id }
                    })
                }
            }
        }

        // 3. Guardar notificaciones
        if (notificacionesToCreate.length > 0) {
            const { error } = await supabase.from("notificaciones").insert(notificacionesToCreate)
            if (error) throw error
        }

        return NextResponse.json({
            success: true,
            processed: pagos.length,
            notifications: notificacionesToCreate.length,
        })

    } catch (error: unknown) {
        console.error("Cron error:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
