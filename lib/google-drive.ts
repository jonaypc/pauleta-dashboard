import { google } from 'googleapis'

// Configuración del cliente de Google Drive
function getGoogleDriveClient() {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
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
 * Lista las subcarpetas de una carpeta (para año y mes)
 */
export async function listFolders(parentId: string): Promise<DriveFolder[]> {
    const drive = getGoogleDriveClient()

    const response = await drive.files.list({
        q: `'${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id, name)',
        orderBy: 'name',
    })

    return (response.data.files || []).map(f => ({
        id: f.id!,
        name: f.name!,
    }))
}

/**
 * Lista los archivos (PDFs, imágenes) en una carpeta
 */
export async function listFiles(folderId: string): Promise<DriveFile[]> {
    const drive = getGoogleDriveClient()

    const response = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false and (mimeType = 'application/pdf' or mimeType contains 'image/')`,
        fields: 'files(id, name, mimeType, modifiedTime, parents)',
        orderBy: 'modifiedTime desc',
        pageSize: 100,
    })

    return (response.data.files || []).map(f => ({
        id: f.id!,
        name: f.name!,
        mimeType: f.mimeType!,
        modifiedTime: f.modifiedTime!,
        parents: f.parents as string[] | undefined,
    }))
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
 * Recorre toda la estructura año/mes y devuelve todos los archivos
 * Estructura esperada: /root/2024/01/, /root/2024/02/, etc.
 */
export async function scanAllInvoices(rootFolderId: string): Promise<{
    file: DriveFile
    year: string
    month: string
}[]> {
    const results: { file: DriveFile; year: string; month: string }[] = []

    // Listar carpetas de años
    const yearFolders = await listFolders(rootFolderId)

    for (const yearFolder of yearFolders) {
        // Verificar que el nombre parece un año (4 dígitos)
        if (!/^\d{4}$/.test(yearFolder.name)) continue

        // Listar carpetas de meses dentro del año
        const monthFolders = await listFolders(yearFolder.id)

        for (const monthFolder of monthFolders) {
            // Verificar que el nombre parece un mes (01-12) o nombre de mes
            const monthMatch = monthFolder.name.match(/^(\d{1,2})$/) ||
                monthFolder.name.toLowerCase().match(/^(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)$/)

            if (!monthMatch) continue

            // Convertir nombre de mes a número si es necesario
            let monthNum = monthMatch[1]
            const monthNames: Record<string, string> = {
                'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04',
                'mayo': '05', 'junio': '06', 'julio': '07', 'agosto': '08',
                'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12'
            }
            if (monthNames[monthNum]) {
                monthNum = monthNames[monthNum]
            }
            monthNum = monthNum.padStart(2, '0')

            // Listar archivos en la carpeta del mes
            const files = await listFiles(monthFolder.id)

            for (const file of files) {
                results.push({
                    file,
                    year: yearFolder.name,
                    month: monthNum,
                })
            }
        }
    }

    return results
}
