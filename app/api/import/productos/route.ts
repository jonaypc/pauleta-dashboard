import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import * as XLSX from "xlsx"
import fs from "fs"
import path from "path"

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
        return NextResponse.json({ error: "Faltan claves en .env.local" }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    })

    try {
        // 0. LIMPIEZA: Borrar todos los productos existentes
        const { error: deleteError } = await supabase.from("productos").delete().neq("id", "00000000-0000-0000-0000-000000000000")

        if (deleteError) {
            console.error("Error clearing products:", deleteError)
            return NextResponse.json({ error: "No se pudo limpiar la tabla de productos", details: deleteError }, { status: 500 })
        }

        // 1. Buscar el archivo
        const filePath = path.join(process.cwd(), "productos.xls")
        if (!fs.existsSync(filePath)) return NextResponse.json({ error: "Archivo productos.xls no encontrado en la raíz" }, { status: 404 })

        const fileBuffer = fs.readFileSync(filePath)
        const workbook = XLSX.read(fileBuffer, { type: "buffer" })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]

        // 1. Leer como matriz para encontrar la cabecera
        const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as any[][]

        // 2. Buscar índice de la fila de cabecera
        let headerIndex = -1
        let headers: string[] = []

        for (let i = 0; i < Math.min(20, rawRows.length); i++) {
            const row = rawRows[i].map(c => String(c).trim().toLowerCase())
            // Buscamos palabras clave típicas de cabecera de producto
            if (row.includes("producto") || row.includes("nombre") || row.includes("item") || row.includes("artículo")) {
                headerIndex = i
                headers = rawRows[i].map(c => String(c).trim())
                break
            }
        }

        if (headerIndex === -1) {
            // Si no encontramos, listamos las primeras filas para depurar
            return NextResponse.json({
                error: "No se encontró cabecera",
                muestras: rawRows.slice(0, 5)
            }, { status: 400 })
        }

        // 3. Procesar datos
        const results = {
            cabecera_encontrada: headers,
            fila_cabecera: headerIndex,
            total_procesados: 0,
            importados: 0,
            errores: 0
        }

        const getValue = (row: any[], colNames: string[]) => {
            for (const col of colNames) {
                const index = headers.findIndex(h => h.toLowerCase().trim() === col.toLowerCase().trim())
                if (index !== -1 && row[index] !== undefined && row[index] !== "") return String(row[index]).trim()

                // Intento parcial
                const partialIndex = headers.findIndex(h => h.toLowerCase().includes(col.toLowerCase()))
                if (partialIndex !== -1 && row[partialIndex] !== undefined && row[partialIndex] !== "") return String(row[partialIndex]).trim()
            }
            return ""
        }

        const dataRows = rawRows.slice(headerIndex + 1)

        for (const row of dataRows) {
            const nombre = getValue(row, ["Nombre", "Producto", "Item", "Artículo", "ArtÃculo", "Descripción"])
            const precioStr = getValue(row, ["Precio", "PVP", "Price", "Coste", "Unit Price"])

            if (!nombre) continue

            // Limpiar precio (quitar €, comas por puntos, etc)
            let precio = 0
            if (precioStr) {
                precio = parseFloat(precioStr.replace(/[^\d.,]/g, "").replace(",", "."))
                if (isNaN(precio)) precio = 0
            }

            const producto = {
                nombre: nombre,
                descripcion: getValue(row, ["Detalle", "Descripción", "Observaciones"]),
                precio: precio,
                unidad: getValue(row, ["Unidad", "Uds", "Unit"]) || "unidad",
                igic: 7, // Por defecto 7% en Canarias
                categoria: getValue(row, ["Categoría", "Grupo", "Familia", "Category"]),
                activo: true
            }

            results.total_procesados++

            const { error } = await supabase.from("productos").insert(producto)
            if (!error) results.importados++
            else {
                results.errores++
                console.error("Error importando producto:", nombre, error.message)
            }
        }

        return NextResponse.json({ mensaje: "Importación de productos completada", resultados: results })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
