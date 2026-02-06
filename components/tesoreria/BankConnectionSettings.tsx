"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import NextImage from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search, Landmark, ExternalLink, Loader2, RefreshCcw, CheckCircle2, AlertCircle } from "lucide-react"
import { initiateBankConnection, getBankInstitutions } from "@/lib/actions/tesoreria"
import { useToast } from "@/hooks/use-toast"

interface Institution {
    id: string
    name: string
    logo: string
    bic: string
}

export function BankConnectionSettings() {
    const { toast } = useToast()
    const [search, setSearch] = useState("Cajamar")
    const [institutions, setInstitutions] = useState<Institution[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isConnecting, setIsConnecting] = useState<string | null>(null)

    useEffect(() => {
        async function load() {
            setIsLoading(true)
            try {
                const data = await getBankInstitutions()
                setInstitutions(data)
            } catch (error) {
                console.error(error)
            } finally {
                setIsLoading(false)
            }
        }
        load()
    }, [])

    const filtered = institutions.filter(i =>
        i.name.toLowerCase().includes(search.toLowerCase()) ||
        i.bic?.toLowerCase().includes(search.toLowerCase())
    )

    const handleConnect = async (instId: string) => {
        setIsConnecting(instId)
        try {
            const { url } = await initiateBankConnection(instId)
            if (url) {
                // Redirigir al banco
                window.location.href = url
            }
        } catch (error: any) {
            toast({
                title: "Error al conectar",
                description: "Verifica que las API Keys de GoCardless estén configuradas.",
                variant: "destructive"
            })
        } finally {
            setIsConnecting(null)
        }
    }

    return (
        <Card className="border-blue-100 bg-blue-50/5">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <Landmark className="h-5 w-5 text-blue-600" />
                            Conexión Bancaria Automática
                        </CardTitle>
                        <CardDescription>
                            Conecta tus cuentas de Cajamar vía PSD2 para recibir movimientos cada 24h.
                        </CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-blue-100/50 text-blue-700 border-blue-200">
                        NUEVA FASE
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar tu banco (ej: Cajamar, Santander...)"
                        className="pl-10"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {filtered.length > 0 ? (
                            filtered.slice(0, 5).map((inst) => (
                                <div
                                    key={inst.id}
                                    className="flex items-center justify-between p-4 rounded-lg border bg-background hover:border-blue-300 transition-all group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-md border flex items-center justify-center bg-white overflow-hidden p-1">
                                            {inst.logo ? (
                                                <NextImage
                                                    src={inst.logo}
                                                    alt={inst.name}
                                                    width={48}
                                                    height={48}
                                                    className="h-full w-full object-contain"
                                                    unoptimized
                                                />
                                            ) : (
                                                <Landmark className="h-6 w-6 text-muted-foreground" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm group-hover:text-blue-700">{inst.name}</p>
                                            <p className="text-xs text-muted-foreground uppercase">{inst.bic || 'BIC No disponible'}</p>
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        onClick={() => handleConnect(inst.id)}
                                        disabled={!!isConnecting}
                                    >
                                        {isConnecting === inst.id ? (
                                            <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Conectando...</>
                                        ) : (
                                            <><ExternalLink className="h-4 w-4 mr-2" /> Vincular Cuenta</>
                                        )}
                                    </Button>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 border-2 border-dashed rounded-lg bg-muted/20">
                                <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                                <p className="text-sm text-muted-foreground">No encontramos ese banco. Prueba con otro nombre.</p>
                            </div>
                        )}
                    </div>
                )}

                <div className="p-4 rounded-lg bg-amber-50 border border-amber-100 flex gap-3 items-start">
                    <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                    <div className="text-xs text-amber-800 space-y-1">
                        <p className="font-bold uppercase tracking-tight">Importante: Requisitos de Conexión</p>
                        <p>Para que esto funcione, necesitamos las API Keys de GoCardless configuradas en el servidor.</p>
                        <p className="underline font-medium">Esta conexión caduca cada 90 días por ley europea PSD2.</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
