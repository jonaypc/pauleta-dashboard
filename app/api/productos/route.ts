import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
    try {
        const supabase = await createClient()

        const { data, error } = await supabase
            .from("productos")
            .select("id, nombre, codigo, categoria")
            .eq("activo", true)
            .order("nombre")

        if (error) {
            console.error("Error fetching productos:", error)
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            )
        }

        return NextResponse.json({ data })
    } catch (error: any) {
        console.error("Error in productos API:", error)
        return NextResponse.json(
            { error: error.message || "Error interno del servidor" },
            { status: 500 }
        )
    }
}
