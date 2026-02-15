import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
    try {
        const supabase = await createClient()

        const { data, error } = await supabase
            .from("recetas")
            .select("id, nombre, version, producto_id, rendimiento, activa")
            .eq("activa", true)
            .order("producto_id")
            .order("version", { ascending: false })

        if (error) {
            console.error("Error fetching recetas:", error)
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            )
        }

        return NextResponse.json({ data })
    } catch (error: any) {
        console.error("Error in recetas API:", error)
        return NextResponse.json(
            { error: error.message || "Error interno del servidor" },
            { status: 500 }
        )
    }
}
