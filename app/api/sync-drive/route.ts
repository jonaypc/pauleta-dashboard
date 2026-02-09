import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { scanAllInvoices, downloadFile, DriveFile } from '@/lib/google-drive'

// Secret para proteger el endpoint (debe coincidir con Vercel Cron)
const CRON_SECRET = process.env.CRON_SECRET

// Máximo de archivos a procesar por ejecución (evitar timeouts)
const MAX_FILES_PER_RUN = 20

export async function GET(request: NextRequest) {
    // Verificar autorización
    const authHeader = request.headers.get('authorization')
    const isManual = request.nextUrl.searchParams.get('manual') === 'true'

    if (!isManual && authHeader !== `Bearer ${CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    try {
        // Obtener configuración de Drive (DB o Env)
        let configFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID

        if (!configFolderId) {
            const { data: config } = await supabase
                .from('drive_config')
                .select('*')
                .eq('is_active', true)
                .single()
            configFolderId = config?.folder_id
        }

        if (!configFolderId) {
            return NextResponse.json({
                error: 'No hay carpeta de Drive configurada (Revisa .env o drive_config)',
                setup_required: true
            }, { status: 400 })
        }

        // Escanear todos los archivos en la estructura año/mes
        const scanResult = await scanAllInvoices(configFolderId)
        const allFiles = scanResult.files
        const scanLogs = scanResult.logs

        // Obtener archivos ya procesados
        const { data: processedFiles } = await supabase
            .from('drive_sync_log')
            .select('drive_file_id')

        const processedIds = new Set((processedFiles || []).map(f => f.drive_file_id))

        // Filtrar solo archivos nuevos
        const newFiles = (allFiles as any[]).filter(f => !processedIds.has(f.file.id))

        // Limitar cantidad por ejecución
        const filesToProcess = newFiles.slice(0, MAX_FILES_PER_RUN)

        const remaining = newFiles.length - filesToProcess.length

        const results = {
            total_scanned: (allFiles as any[]).length,
            already_processed: processedIds.size,
            new_files: newFiles.length,
            processing_now: filesToProcess.length,
            remaining,
            logs: scanLogs,
            processed: [] as any[],
            errors: [] as any[],
        }

        // Procesar cada archivo
        for (const { file, year, month } of filesToProcess) {
            try {
                // Descargar archivo
                const fileBuffer = await downloadFile(file.id)

                // Crear un blob para enviar al parser
                const formData = new FormData()
                const uint8Array = new Uint8Array(fileBuffer)
                const blob = new Blob([uint8Array], { type: file.mimeType })
                formData.append('file', blob, file.name)

                // Llamar al endpoint de parsing existente
                const parseResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/parse-invoice`, {
                    method: 'POST',
                    body: formData,
                })

                // Extraer datos parseados correctamente
                let parsedData: any = {}
                if (parseResponse.ok) {
                    const jsonResponse = await parseResponse.json()
                    parsedData = jsonResponse.parsed || {}
                    console.log(`[SYNC] Parsed data for ${file.name}:`, JSON.stringify(parsedData))
                } else {
                    console.log(`[SYNC] Parse failed for ${file.name}, status: ${parseResponse.status}`)
                }

                // Subir archivo a Supabase Storage
                const fileName = `${Date.now()}-${file.name}`
                const filePath = `facturas_gastos/${year}/${month}/${fileName}`

                const { error: uploadError } = await supabase.storage
                    .from('gastos')
                    .upload(filePath, new Uint8Array(fileBuffer), {
                        contentType: file.mimeType,
                    })

                let archivoUrl = null
                if (!uploadError) {
                    const { data: { publicUrl } } = supabase.storage
                        .from('gastos')
                        .getPublicUrl(filePath)
                    archivoUrl = publicUrl
                }

                // Determinar fecha del gasto (del OCR o del path año/mes)
                const fechaGasto = parsedData.fecha || `${year}-${month}-01`

                // Gestionar proveedor automáticamente
                let proveedorId = null
                const proveedorNombre = parsedData.nombre_proveedor || parsedData.proveedor || null

                if (proveedorNombre) {
                    // Buscar proveedor existente
                    const { data: existingProvider } = await supabase
                        .from('proveedores')
                        .select('id')
                        .ilike('nombre', proveedorNombre)
                        .maybeSingle()

                    if (existingProvider) {
                        proveedorId = existingProvider.id
                    } else {
                        // Crear nuevo proveedor
                        const { data: newProvider } = await supabase
                            .from('proveedores')
                            .insert({
                                nombre: proveedorNombre,
                                cif: parsedData.cif_proveedor || null,
                            })
                            .select('id')
                            .single()

                        if (newProvider) {
                            proveedorId = newProvider.id
                        }
                    }
                }

                // Check for duplicate invoice (same provider + same number)
                let existingGastoId = null
                if (proveedorId && parsedData.numero) {
                    const { data: duplicateGasto } = await supabase
                        .from('gastos')
                        .select('id')
                        .eq('proveedor_id', proveedorId)
                        .eq('numero', parsedData.numero)
                        .maybeSingle()

                    if (duplicateGasto) {
                        existingGastoId = duplicateGasto.id
                        console.log(`[SYNC] Duplicate detected for ${file.name} (Gasto ID: ${existingGastoId})`)
                    }
                }

                if (existingGastoId) {
                    // Log duplicate find but do not insert
                    await supabase.from('drive_sync_log').insert({
                        drive_file_id: file.id,
                        file_name: file.name,
                        file_path: `${year}/${month}/${file.name}`,
                        year,
                        month,
                        gasto_id: existingGastoId,
                        status: 'duplicate',
                        error_message: 'Factura ya existe en base de datos',
                    })

                    results.processed.push({
                        file: file.name,
                        path: `${year}/${month}`,
                        gasto_id: existingGastoId,
                        status: 'duplicate'
                    })

                    // Skip to next iteration
                    continue
                }

                // Crear gasto con todos los datos extraídos
                const { data: gasto, error: gastoError } = await supabase
                    .from('gastos')
                    .insert({
                        proveedor_id: proveedorId,
                        numero: parsedData.numero || null,
                        fecha: fechaGasto,
                        importe: parsedData.importe || parsedData.total || 0,
                        base_imponible: parsedData.base_imponible || 0,
                        impuestos: parsedData.iva || parsedData.impuestos || 0,
                        tipo_impuesto: parsedData.tipo_impuesto ?? 7, // Allow 0, default 7 only if undefined
                        estado: 'pendiente',
                        archivo_url: archivoUrl,
                        notas: `Importado desde Drive: ${year}/${month}/${file.name}`,
                    })
                    .select('id')
                    .single()

                // Registrar en sync log
                await supabase.from('drive_sync_log').insert({
                    drive_file_id: file.id,
                    file_name: file.name,
                    file_path: `${year}/${month}/${file.name}`,
                    year,
                    month,
                    gasto_id: gasto?.id || null,
                    status: gastoError ? 'error' : 'processed',
                    error_message: gastoError?.message || null,
                })

                results.processed.push({
                    file: file.name,
                    path: `${year}/${month}`,
                    gasto_id: gasto?.id,
                })

            } catch (fileError: any) {
                // Registrar error en sync log
                await supabase.from('drive_sync_log').insert({
                    drive_file_id: file.id,
                    file_name: file.name,
                    file_path: `${year}/${month}/${file.name}`,
                    year,
                    month,
                    status: 'error',
                    error_message: fileError.message,
                })

                results.errors.push({
                    file: file.name,
                    error: fileError.message,
                })
            }
        }

        // Actualizar última sincronización
        await supabase
            .from('drive_config')
            .update({ last_sync_at: new Date().toISOString() })
            .eq('id', config.id)

        return NextResponse.json({
            success: true,
            ...results,
            remaining: newFiles.length - filesToProcess.length,
            message: results.remaining > 0
                ? `Procesados ${filesToProcess.length} archivos. Quedan ${results.remaining} pendientes.`
                : 'Sincronización completada.',
        })

    } catch (error: any) {
        console.error('Drive sync error:', error)
        return NextResponse.json({
            success: false,
            error: error.message,
        }, { status: 500 })
    }
}
