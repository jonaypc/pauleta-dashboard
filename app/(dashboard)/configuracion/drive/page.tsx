"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { Loader2, RefreshCw, FolderSync, CheckCircle, AlertCircle, Clock, HardDrive } from "lucide-react"
import Link from "next/link"

interface DriveConfig {
    id: string
    folder_id: string
    folder_name: string | null
    last_sync_at: string | null
    is_active: boolean
}

interface SyncLog {
    id: string
    file_name: string
    file_path: string
    status: string
    processed_at: string
}

export default function DriveConfigPage() {
    const { toast } = useToast()
    const supabase = createClient()

    const [config, setConfig] = useState<DriveConfig | null>(null)
    const [folderId, setFolderId] = useState("")
    const [folderName, setFolderName] = useState("")
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [isSyncing, setIsSyncing] = useState(false)
    const [recentLogs, setRecentLogs] = useState<SyncLog[]>([])
    const [syncResult, setSyncResult] = useState<any>(null)

    const loadConfig = useCallback(async () => {
        const { data } = await supabase
            .from('drive_config')
            .select('*')
            .eq('is_active', true)
            .single()

        if (data) {
            setConfig(data)
            setFolderId(data.folder_id)
            setFolderName(data.folder_name || "")
        }
        setIsLoading(false)
    }, [supabase])

    const loadRecentLogs = useCallback(async () => {
        const { data } = await supabase
            .from('drive_sync_log')
            .select('*')
            .order('processed_at', { ascending: false })
            .limit(10)

        if (data) setRecentLogs(data)
    }, [supabase])

    useEffect(() => {
        loadConfig()
        loadRecentLogs()
    }, [loadConfig, loadRecentLogs])

    const saveConfig = async () => {
        setIsSaving(true)
        try {
            if (config) {
                await supabase
                    .from('drive_config')
                    .update({ folder_id: folderId, folder_name: folderName })
                    .eq('id', config.id)
            } else {
                await supabase
                    .from('drive_config')
                    .insert({ folder_id: folderId, folder_name: folderName, is_active: true })
            }
            toast({ title: "Configuración guardada" })
            loadConfig()
        } catch (error) {
            toast({ title: "Error al guardar", variant: "destructive" })
        }
        setIsSaving(false)
    }

    const triggerSync = async (reset = false) => {
        setIsSyncing(true)
        setSyncResult(null)
        try {
            const params = new URLSearchParams({ manual: 'true' })
            if (reset) params.set('reset', 'true')
            const response = await fetch(`/api/sync-drive?${params}`)
            const result = await response.json()
            setSyncResult(result)
            loadRecentLogs()
            loadConfig()

            if (result.success) {
                toast({
                    title: reset ? "Log reseteado y sincronizado" : "Sincronización completada",
                    description: `${result.processed?.length || 0} archivos procesados`
                })
            } else {
                toast({
                    title: "Error en sincronización",
                    description: result.error,
                    variant: "destructive"
                })
            }
        } catch (error: any) {
            toast({ title: "Error de conexión", variant: "destructive" })
        }
        setIsSyncing(false)
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                    <HardDrive className="h-6 w-6" />
                    Sincronización con Google Drive
                </h1>
                <p className="text-muted-foreground">
                    Configura una carpeta de Google Drive para importar facturas automáticamente.
                </p>
            </div>

            {/* Configuración */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Configuración de Carpeta</CardTitle>
                    <CardDescription>
                        Ingresa el ID de la carpeta de Google Drive donde tienes organizadas las facturas por año/mes.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="folderId">ID de Carpeta de Drive</Label>
                            <Input
                                id="folderId"
                                placeholder="1a2b3c4d5e6f7g8h9i0j..."
                                value={folderId}
                                onChange={(e) => setFolderId(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                Puedes encontrarlo en la URL de Drive: drive.google.com/drive/folders/<strong>ID_AQUÍ</strong>
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="folderName">Nombre (opcional)</Label>
                            <Input
                                id="folderName"
                                placeholder="Facturas Pauleta"
                                value={folderName}
                                onChange={(e) => setFolderName(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button onClick={saveConfig} disabled={isSaving || !folderId}>
                            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Guardar Configuración
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Estado y Sincronización */}
            {config && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <FolderSync className="h-5 w-5" />
                            Estado de Sincronización
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-3">
                                {config.is_active ? (
                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                ) : (
                                    <AlertCircle className="h-5 w-5 text-amber-500" />
                                )}
                                <div>
                                    <p className="font-medium">{config.folder_name || "Carpeta configurada"}</p>
                                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        Última sincronización: {config.last_sync_at
                                            ? new Date(config.last_sync_at).toLocaleString('es-ES')
                                            : "Nunca"}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={() => triggerSync(false)} disabled={isSyncing}>
                                    {isSyncing ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <RefreshCw className="h-4 w-4 mr-2" />
                                    )}
                                    Sincronizar Ahora
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        if (confirm('Esto borrará todo el historial de sincronización y reprocesará todos los archivos. ¿Continuar?')) {
                                            triggerSync(true)
                                        }
                                    }}
                                    disabled={isSyncing}
                                    title="Borra el historial y vuelve a procesar todo desde cero"
                                >
                                    Resetear y Sincronizar
                                </Button>
                            </div>
                        </div>

                        {syncResult && (
                            <div className={`p-4 rounded-lg border ${syncResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                <p className="font-medium mb-2">
                                    {syncResult.success ? '✅ Sincronización exitosa' : '❌ Error en sincronización'}
                                </p>
                                {syncResult.success && (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                                            <div>
                                                <span className="text-muted-foreground">Escaneados:</span>
                                                <span className="ml-1 font-medium">{syncResult.total_scanned}</span>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground">Nuevos:</span>
                                                <span className="ml-1 font-medium">{syncResult.new_files}</span>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground">Procesados:</span>
                                                <span className="ml-1 font-medium">{syncResult.processed?.length || 0}</span>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground">Pendientes:</span>
                                                <span className="ml-1 font-medium">{syncResult.remaining}</span>
                                            </div>
                                        </div>

                                        {syncResult.logs && syncResult.logs.length > 0 && (
                                            <details className="text-xs">
                                                <summary className="cursor-pointer text-muted-foreground hover:text-foreground font-medium mb-1">
                                                    Ver logs de escaneo
                                                </summary>
                                                <div className="bg-white/50 p-2 rounded border border-black/5 font-mono max-h-40 overflow-y-auto whitespace-pre-wrap">
                                                    {syncResult.logs.map((log: string, i: number) => (
                                                        <div key={i} className="py-0.5 border-b border-black/5 last:border-0">
                                                            {log}
                                                        </div>
                                                    ))}
                                                </div>
                                            </details>
                                        )}
                                    </div>
                                )}
                                {!syncResult.success && (
                                    <p className="text-sm text-red-600">{syncResult.error}</p>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Archivos Recientes */}
            {recentLogs.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Archivos Sincronizados Recientemente</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {recentLogs.map(log => (
                                <div key={log.id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                                    <div className="flex items-center gap-2">
                                        <Badge variant={log.status === 'processed' ? 'default' : log.status === 'error' ? 'destructive' : 'secondary'}>
                                            {log.status}
                                        </Badge>
                                        <span className="text-sm truncate max-w-[300px]">{log.file_name}</span>
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                        {new Date(log.processed_at).toLocaleString('es-ES')}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4">
                            <Button variant="outline" size="sm" asChild>
                                <Link href="/gastos">Ver todos los gastos importados</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Instrucciones de Configuración */}
            <Card className="border-blue-200 bg-blue-50/50">
                <CardHeader>
                    <CardTitle className="text-lg text-blue-800">📋 Pasos para Configurar</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-blue-900 space-y-2">
                    <ol className="list-decimal list-inside space-y-1">
                        <li>Ve a Google Cloud Console y crea un proyecto</li>
                        <li>Habilita la API de Google Drive</li>
                        <li>Crea una cuenta de servicio y descarga las credenciales JSON</li>
                        <li>Añade las credenciales a las variables de entorno en Vercel</li>
                        <li>Comparte tu carpeta de facturas con el email de la cuenta de servicio</li>
                        <li>Pega el ID de la carpeta arriba y guarda</li>
                    </ol>
                </CardContent>
            </Card>
        </div>
    )
}
