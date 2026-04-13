import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { scanAllInvoices, downloadFile, DriveFile } from '@/lib/google-drive'

export const maxDuration = 60

// Secret para proteger el endpoint (debe coincidir con Vercel Cron)
const CRON_SECRET = process.env.CRON_SECRET

// Procesar pocos archivos por llamada para no exceder timeout de Vercel Hobby (10s)
const MAX_FILES_PER_RUN = 3

export async function GET(request: NextRequest) {
    // Verificar autorización
    const authHeader = request.headers.get('authorization')
    const isManual = request.nextUrl.searchParams.get('manual') === 'true'

    if (!isManual && authHeader !== `Bearer ${CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const forceReset = request.nextUrl.searchParams.get('reset') === 'true'

    try {
        // Si se pide reset, limpiar TODO el sync log
        if (forceReset) {
            await supabase.from('drive_sync_log').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        }

        // Obtener configuración de Drive (DB)
        const { data: config } = await supabase
            .from('drive_config')
            .select('*')
            .eq('is_active', true)
            .maybeSingle()

        // ID de carpeta: Prioridad ENV > DB
        const configFolderId = (process.env.GOOGLE_DRIVE_FOLDER_ID || config?.folder_id)?.trim()

        if (!configFolderId) {
            return NextResponse.json({
                error: 'No hay carpeta de Drive configurada (Revisa .env o drive_config)',
                setup_required: true
            }, { status: 400 })
        }

        // SIEMPRE limpiar registros de error antes de escanear (permite reintento)
        await supabase
            .from('drive_sync_log')
            .delete()
            .eq('status', 'error')

        // Limpiar registros "processed" huérfanos (sin gasto real asociado)
        // Esto corrige el bug anterior donde se contaban como procesados sin crear gasto
        const { data: orphanLogs } = await supabase
            .from('drive_sync_log')
            .select('id, gasto_id')
            .eq('status', 'processed')
            .is('gasto_id', null)

        if (orphanLogs && orphanLogs.length > 0) {
            await supabase
                .from('drive_sync_log')
                .delete()
                .in('id', orphanLogs.map(l => l.id))
        }

        // Filtrar por año si se especifica (por defecto: año actual)
        const yearFilter = request.nextUrl.searchParams.get('year') || new Date().getFullYear().toString()

        // Escanear archivos en la estructura año/mes
        const scanResult = await scanAllInvoices(configFolderId, yearFilter)
        const allFiles = scanResult.files
        const scanLogs = scanResult.logs

        // Obtener archivos ya procesados exitosamente
        const { data: processedFiles } = await supabase
            .from('drive_sync_log')
            .select('drive_file_id')
            .in('status', ['processed', 'duplicate', 'skipped'])

        const processedIds = new Set((processedFiles || []).map(f => f.drive_file_id))

        // Filtrar solo archivos nuevos (no procesados exitosamente)
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

                // Determinar si necesita revisión manual (no se pudo extraer datos)
                const tieneImporte = parsedData.importe || parsedData.total
                const tieneProveedor = parsedData.nombre_proveedor || parsedData.proveedor
                const needsReview = !tieneImporte && !tieneProveedor

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

                // Segunda línea de defensa: buscar por nombre de archivo en notas
                if (!existingGastoId) {
                    const { data: duplicateByFileName } = await supabase
                        .from('gastos')
                        .select('id')
                        .ilike('notas', `%${file.name}%`)
                        .maybeSingle()

                    if (duplicateByFileName) {
                        existingGastoId = duplicateByFileName.id
                        console.log(`[SYNC] Duplicate detected by filename for ${file.name} (Gasto ID: ${existingGastoId})`)
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
                const notaBase = `Importado desde Drive: ${year}/${month}/${file.name}`
                const nota = needsReview
                    ? `⚠️ REVISIÓN NECESARIA - No se pudo leer el archivo automáticamente. ${notaBase}`
                    : notaBase

                const { data: gasto, error: gastoError } = await supabase
                    .from('gastos')
                    .insert({
                        proveedor_id: proveedorId,
                        numero: parsedData.numero || null,
                        fecha: fechaGasto,
                        importe: parsedData.importe || parsedData.total || 0,
                        base_imponible: parsedData.base_imponible || 0,
                        impuestos: parsedData.iva || parsedData.impuestos || 0,
                        tipo_impuesto: parsedData.tipo_impuesto ?? 7,
                        estado: 'pendiente',
                        archivo_url: archivoUrl,
                        notas: nota,
                    })
                    .select('id')
                    .single()

                if (gastoError) {
                    console.error(`[SYNC] Error creating gasto for ${file.name}:`, gastoError)

                    // Registrar error en sync log
                    await supabase.from('drive_sync_log').insert({
                        drive_file_id: file.id,
                        file_name: file.name,
                        file_path: `${year}/${month}/${file.name}`,
                        year,
                        month,
                        gasto_id: null,
                        status: 'error',
                        error_message: gastoError.message,
                    })

                    results.errors.push({
                        file: file.name,
                        error: `Error al crear gasto: ${gastoError.message}`,
                    })
                    continue
                }

                // Registrar éxito en sync log
                await supabase.from('drive_sync_log').insert({
                    drive_file_id: file.id,
                    file_name: file.name,
                    file_path: `${year}/${month}/${file.name}`,
                    year,
                    month,
                    gasto_id: gasto.id,
                    status: 'processed',
                    error_message: null,
                })

                results.processed.push({
                    file: file.name,
                    path: `${year}/${month}`,
                    gasto_id: gasto.id,
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
        // Actualizar última sincronización (solo si existe registro en BD)
        if (config) {
            await supabase
                .from('drive_config')
                .update({ last_sync_at: new Date().toISOString() })
                .eq('id', config.id)
        }

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
