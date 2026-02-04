import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

export const dynamic = 'force-dynamic'

// Cliente sin cookies para cron/API routes
function createCronClient() {
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            cookies: {
                get: () => undefined,
                set: () => {},
                remove: () => {},
            }
        }
    )
}

// Esta ruta será llamada por Vercel Cron
// Configurar en vercel.json: "crons": [{ "path": "/api/cron/check-pagos", "schedule": "0 8 * * *" }]

export async function GET(request: NextRequest) {
    try {
        // Verificar autorización (CRON_SECRET)
        const authHeader = request.headers.get("authorization")
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const supabase = createCronClient()
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

        const historialToUpsert = []

        for (const pago of pagos) {
            const diasRestantes = pago.dia_inicio - hoy

            // Si faltan 3, 2, 1 o 0 días (o incluso si ya pasó unos días, para asegurar)
            // Vamos a generar el registro para el mes actual si estamos cerca de la fecha.
            // Fecha de vencimiento exacta para este mes:
            const fechaVencimiento = new Date(thisYear, thisMonth, pago.dia_inicio, 12, 0, 0)

            // Si el día de inicio es mayor a hoy + 3, todavía no toca generación masiva
            // Pero si estamos en el rango [hoy, hoy+3], generamos.
            if (diasRestantes >= 0 && diasRestantes <= 3) {

                // NOTIFICACIONES
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
                        enviada: false,
                        fecha_envio: new Date().toISOString(),
                        metadata: { pago_id: pago.id }
                    })
                }

                // HISTORIAL (Generar deuda pendiente)
                // Usamos upsert para no duplicar si ya se corrió el cron ayer
                historialToUpsert.push({
                    pago_fijo_id: pago.id,
                    fecha_vencimiento: fechaVencimiento.toISOString().split('T')[0], // YYYY-MM-DD
                    importe: pago.importe,
                    estado: 'pendiente'
                })
            }
        }

        // 3. Guardar notificaciones
        if (notificacionesToCreate.length > 0) {
            await supabase.from("notificaciones").insert(notificacionesToCreate)
        }

        // 4. Guardar historial (Upsert: on_conflict por pago_fijo_id + fecha_vencimiento)
        if (historialToUpsert.length > 0) {
            const { error: histError } = await supabase
                .from("historial_pagos_fijos")
                .upsert(historialToUpsert, { onConflict: 'pago_fijo_id,fecha_vencimiento', ignoreDuplicates: true })

            if (histError) console.error("Error upserting history:", histError)
        }

        return NextResponse.json({
            success: true,
            processed: pagos.length,
            notifications: notificacionesToCreate.length,
            history_entries: historialToUpsert.length
        })

    } catch (error: unknown) {
        console.error("Cron error:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
