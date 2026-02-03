"use client"

import { useState, useEffect } from "react"
import { Bell, CreditCard, AlertTriangle, FileText, CheckCircle, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { createClient } from "@/lib/supabase/client"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import type { Notificacion } from "@/types"

export function NotificationsMenu() {
    const supabase = createClient()
    const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
    const [hasUnread, setHasUnread] = useState(false)
    const [isOpen, setIsOpen] = useState(false)

    useEffect(() => {
        const fetchNotificaciones = async () => {
            const { data } = await supabase
                .from("notificaciones")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(10)

            if (data) {
                setNotificaciones(data)
                // Lógica simple para MVP: si hay alguna no leída (enviada=false en este contexto simplificado
                // o simplemente si hay nuevas desde la última vez que abrimos - simulado)
                // Aquí usaremos el campo 'enviada' como flag de "leído" visual para el MVP si queremos,
                // o simplemente mostramos el punto si hay notificaciones recientes (< 24h).

                // Para simplificar: Si hay alguna notificación creada en las últimas 24h, mostramos punto.
                const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
                const recent = data.some(n => new Date(n.created_at) > oneDayAgo)
                setHasUnread(recent)
            }
        }

        fetchNotificaciones()

        // Suscripción a cambios en tiempo real (opcional para MVP, pero recomendado)
        const channel = supabase
            .channel('realtime-notificaciones')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificaciones' }, (payload) => {
                setNotificaciones(prev => [payload.new as Notificacion, ...prev])
                setHasUnread(true)
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [supabase])

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open)
        if (open) {
            // Al abrir, quitamos el punto de "no leído" visualmente
            setHasUnread(false)
        }
    }

    const getIcon = (tipo: string) => {
        switch (tipo) {
            case "pago_proximo":
                return <AlertTriangle className="h-4 w-4 text-pauleta-yellow" />
            case "factura_vencida":
                return <AlertTriangle className="h-4 w-4 text-pauleta-red" />
            case "factura_emitida":
                return <FileText className="h-4 w-4 text-blue-500" />
            case "cobro_registrado":
                return <CheckCircle className="h-4 w-4 text-pauleta-green" />
            default:
                return <Info className="h-4 w-4 text-gray-500" />
        }
    }

    return (
        <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {hasUnread && (
                        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-pauleta-red animate-pulse" />
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notificaciones</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <ScrollArea className="h-[300px]">
                    {notificaciones.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                            No tienes notificaciones
                        </div>
                    ) : (
                        <div className="flex flex-col gap-1 p-1">
                            {notificaciones.map((notificacion) => (
                                <DropdownMenuItem key={notificacion.id} className="flex flex-col items-start gap-1 p-3 cursor-default focus:bg-transparent">
                                    <div className="flex w-full items-start gap-3">
                                        <div className="mt-0.5 rounded-full bg-muted p-1">
                                            {getIcon(notificacion.tipo)}
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <p className="text-sm font-medium leading-none">
                                                {notificacion.mensaje}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {formatDistanceToNow(new Date(notificacion.created_at), {
                                                    addSuffix: true,
                                                    locale: es,
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                </DropdownMenuItem>
                            ))}
                        </div>
                    )}
                </ScrollArea>
                {notificaciones.length > 0 && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="w-full text-center text-xs text-muted-foreground justify-center cursor-pointer">
                            Ver historial completo
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
