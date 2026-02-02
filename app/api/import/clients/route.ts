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
        // 0. LIMPIEZA: Borrar todos los clientes existentes (Petición expresa del usuario)
        // Usamos un filtro "siempre verdadero" para borrar todo
        const { error: deleteError } = await supabase.from("clientes").delete().neq("id", "00000000-0000-0000-0000-000000000000")

        if (deleteError) {
            console.error("Error clearing clients:", deleteError)
            return NextResponse.json({ error: "No se pudo limpiar la base de datos", details: deleteError }, { status: 500 })
        }

        // 1. Buscar el archivo
        let filePath = path.join(process.cwd(), "public", "clientes.xls")
        if (!fs.existsSync(filePath)) filePath = path.join(process.cwd(), "clientes.xls")
        if (!fs.existsSync(filePath)) return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 })

        const fileBuffer = fs.readFileSync(filePath)
        const workbook = XLSX.read(fileBuffer, { type: "buffer" })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]

        // 1. Leer como matriz para encontrar la cabecera
        const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as string[][]

        // 2. Buscar índice de la fila de cabecera
        let headerIndex = -1
        let headers: string[] = []

        for (let i = 0; i < Math.min(20, rawRows.length); i++) {
            const row = rawRows[i].map(c => String(c).trim().toLowerCase())
            // Buscamos palabras clave típicas de cabecera
            if (row.includes("cliente") || row.includes("nombre") || row.includes("company") || row.includes("razón social")) {
                headerIndex = i
                headers = rawRows[i].map(c => String(c).trim())
                break
            }
        }

        if (headerIndex === -1) {
            return NextResponse.json({ error: "No se encontró la fila de cabecera (buscando 'Cliente' o 'Nombre')" }, { status: 400 })
        }

        // 3. Procesar datos usando la cabecera encontrada
        const results = {
            cabecera_encontrada: headers,
            fila_cabecera: headerIndex,
            total_procesados: 0,
            importados: 0,
            errores: 0
        }

        // Helper para buscar valor en la fila flexiblemente
        const getValue = (row: any[], colNames: string[]) => {
            for (const col of colNames) {
                const index = headers.findIndex(h => h.toLowerCase().includes(col.toLowerCase()))
                if (index !== -1 && row[index]) return String(row[index]).trim()
                // Intento exacto
                const exactIndex = headers.findIndex(h => h === col)
                if (exactIndex !== -1 && row[exactIndex]) return String(row[exactIndex]).trim()
            }
            return ""
        }

        const dataRows = rawRows.slice(headerIndex + 1)

        for (const row of dataRows) {
            const nombre = getValue(row, ["Nombre", "Cliente", "Customer", "Company", "Razon Social", "RazÃ³n Social"])

            if (!nombre) continue

            const cliente = {
                nombre: nombre,
                cif: getValue(row, ["NIF", "CIF", "VAT", "Tax", "Identificaci", "Resale"]),
                email: getValue(row, ["Email", "Correo", "E-mail"]),
                telefono: getValue(row, ["Telef", "Teléfono", "Phone", "Móvil", "Movil"]),
                direccion: getValue(row, ["Direcc", "Dirección", "Address", "Billing Address", "Domicilio"]),
                ciudad: getValue(row, ["Ciudad", "City", "Poblaci", "Municipio"]),
                codigo_postal: getValue(row, ["CP", "Zip", "CÃ³digo Postal", "Postal"]),
                provincia: getValue(row, ["Provincia", "Province", "State"]),
                notas: "Importado " + new Date().toLocaleDateString(),
                activo: true
            }

            results.total_procesados++

            const { error } = await supabase.from("clientes").insert(cliente)
            if (!error) results.importados++
            else {
                results.errores++
                console.error("Error importando", cliente.nombre, error.message)
            }
        }

        return NextResponse.json({ mensaje: "Importación completada", resultados: results })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
