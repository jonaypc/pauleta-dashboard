import { google } from 'googleapis'

// Configuración del cliente de Google Drive
function getGoogleDriveClient() {
    const email = process.env.GOOGLE_CLIENT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
    const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')

    if (!email || !key) {
        throw new Error('Missing Google service account credentials')
    }

    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: email,
            private_key: key,
        },
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    })

    return google.drive({ version: 'v3', auth })
}

export interface DriveFile {
    id: string
    name: string
    mimeType: string
    modifiedTime: string
    parents?: string[]
}

export interface DriveFolder {
    id: string
    name: string
}

/**
 * Lista las subcarpetas de una carpeta (para año y mes) con paginación
 */
export async function listFolders(parentId: string): Promise<DriveFolder[]> {
    const drive = getGoogleDriveClient()
    let folders: DriveFolder[] = []
    let pageToken: string | undefined = undefined

    do {
        const response: any = await drive.files.list({
            q: `'${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
            fields: 'nextPageToken, files(id, name)',
            orderBy: 'name',
            pageSize: 100,
            pageToken: pageToken,
        })

        if (response.data.files) {
            folders = folders.concat(response.data.files.map((f: any) => ({
                id: f.id!,
                name: f.name!,
            })))
        }
        pageToken = response.data.nextPageToken || undefined
    } while (pageToken)

    return folders
}

/**
 * Lista los archivos con paginación
 */
export async function listFiles(folderId: string): Promise<DriveFile[]> {
    const drive = getGoogleDriveClient()
    let files: DriveFile[] = []
    let pageToken: string | undefined = undefined

    do {
        const response: any = await drive.files.list({
            q: `'${folderId}' in parents and trashed = false and (mimeType = 'application/pdf' or mimeType contains 'image/')`,
            fields: 'nextPageToken, files(id, name, mimeType, modifiedTime, parents)',
            orderBy: 'modifiedTime desc',
            pageSize: 100,
            pageToken: pageToken,
        })

        if (response.data.files) {
            files = files.concat(response.data.files.map((f: any) => ({
                id: f.id!,
                name: f.name!,
                mimeType: f.mimeType!,
                modifiedTime: f.modifiedTime!,
                parents: f.parents as string[] | undefined,
            })))
        }
        pageToken = response.data.nextPageToken || undefined
    } while (pageToken)

    return files
}

/**
 * Descarga un archivo como Buffer
 */
export async function downloadFile(fileId: string): Promise<Buffer> {
    const drive = getGoogleDriveClient()

    const response = await drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'arraybuffer' }
    )

    return Buffer.from(response.data as ArrayBuffer)
}

/**
 * Obtiene metadata de un archivo
 */
export async function getFileMetadata(fileId: string): Promise<DriveFile | null> {
    const drive = getGoogleDriveClient()

    try {
        const response = await drive.files.get({
            fileId,
            fields: 'id, name, mimeType, modifiedTime, parents',
        })

        if (!response.data.id) return null

        return {
            id: response.data.id,
            name: response.data.name!,
            mimeType: response.data.mimeType!,
            modifiedTime: response.data.modifiedTime!,
            parents: response.data.parents as string[] | undefined,
        }
    } catch {
        return null
    }
}

/**
 * Verifica si se puede acceder a una carpeta
 */
export async function validateFolderAccess(folderId: string): Promise<boolean> {
    const drive = getGoogleDriveClient()
    try {
        await drive.files.get({
            fileId: folderId,
            fields: 'id, name'
        })
        return true
    } catch (error) {
        console.error('Error validating folder access:', error)
        return false
    }
}

/**
 * Recorre toda la estructura año/mes y devuelve todos los archivos
 */
export async function scanAllInvoices(rootFolderId: string): Promise<{
    files: { file: DriveFile; year: string; month: string }[];
    logs: string[]
}> {
    const results: { file: DriveFile; year: string; month: string }[] = []
    const logs: string[] = []

    const addLog = (msg: string) => {
        console.log(msg)
        logs.push(msg)
    }

    // Validación preliminar
    const canAccess = await validateFolderAccess(rootFolderId)
    if (!canAccess) {
        throw new Error(`No se puede acceder a la carpeta con ID: ${rootFolderId}. Verifica: 1. Que el ID sea correcto. 2. Que hayas COMPARTIDO la carpeta con el email de la Service Account.`)
    }

    addLog(`[DRIVE_SCAN] Scanning root folder: ${rootFolderId}`)
    const yearFolders = await listFolders(rootFolderId)
    addLog(`[DRIVE_SCAN] Found ${yearFolders.length} year folders: ${yearFolders.map(f => f.name).join(', ')}`)

    for (const yearFolder of yearFolders) {
        // Verificar que el nombre parece un año (4 dígitos), permitiendo espacios
        // Ej: "2024", " 2024 ", "Año 2024"
        const cleanName = yearFolder.name.trim()
        const yearMatch = cleanName.match(/(\d{4})/)

        if (!yearMatch) {
            addLog(`[DRIVE_SCAN] Skipping folder (not a year): ${yearFolder.name}`)
            continue
        }

        const year = yearMatch[1]
        addLog(`[DRIVE_SCAN] Processing year: ${year} (Folder: ${yearFolder.name})`)

        // Listar carpetas de meses dentro del año
        const monthFolders = await listFolders(yearFolder.id)
        addLog(`[DRIVE_SCAN] Found ${monthFolders.length} month folders in ${year}`)

        for (const monthFolder of monthFolders) {
            const cleanMonthName = monthFolder.name.trim().toLowerCase()

            // Verificar que el nombre parece un mes (01-12) o nombre de mes
            const monthMatch = cleanMonthName.match(/^(\d{1,2})/) ||
                cleanMonthName.match(/^(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/)

            if (!monthMatch) {
                console.log(`[DRIVE_SCAN] Skipping folder (not a month): ${monthFolder.name}`)
                continue
            }

            // Convertir nombre de mes a número si es necesario
            let monthNum = monthMatch[1]
            const monthNames: Record<string, string> = {
                'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04',
                'mayo': '05', 'junio': '06', 'julio': '07', 'agosto': '08',
                'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12'
            }
            if (isNaN(parseInt(monthNum))) {
                // Es nombre de mes
                if (monthNames[cleanMonthName]) {
                    monthNum = monthNames[cleanMonthName]
                }
            }

            monthNum = monthNum.padStart(2, '0')

            // Listar archivos en la carpeta del mes
            const files = await listFiles(monthFolder.id)
            if (files.length > 0) {
                addLog(`[DRIVE_SCAN] Found ${files.length} files in ${year}/${monthNum}`)
            }

            for (const file of files) {
                results.push({
                    file,
                    year: year,
                    month: monthNum,
                })
            }
        }
    }

    addLog(`[DRIVE_SCAN] Finished scan. Total files found: ${results.length}`)
    return { files: results, logs }
}
