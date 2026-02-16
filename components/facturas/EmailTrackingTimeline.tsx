"use client"

import { Mail, MailCheck, Eye, AlertCircle, RotateCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { EmailTracking } from "@/types"
import { useState } from "react"
import { toast } from "@/hooks/use-toast"

interface EmailTrackingTimelineProps {
  trackings: EmailTracking[]
  facturaId: string
  clienteEmail?: string | null
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getEstadoBadge(estado: string) {
  switch (estado) {
    case 'enviado':
      return <Badge variant="emitida" dot className="text-xs">Enviado</Badge>
    case 'entregado':
      return <Badge variant="emitida" dot className="text-xs">Entregado</Badge>
    case 'abierto':
      return <Badge variant="cobrada" dot className="text-xs">Leído</Badge>
    case 'clickeado':
      return <Badge variant="cobrada" dot className="text-xs">Clickeado</Badge>
    case 'rebotado':
      return <Badge variant="anulada" dot className="text-xs">Rebotado</Badge>
    case 'error':
      return <Badge variant="anulada" dot className="text-xs">Error</Badge>
    default:
      return <Badge variant="borrador" dot className="text-xs">{estado}</Badge>
  }
}

export function EmailTrackingTimeline({
  trackings,
  facturaId,
  clienteEmail,
}: EmailTrackingTimelineProps) {
  const [isResending, setIsResending] = useState(false)

  const handleResend = async () => {
    setIsResending(true)
    try {
      const res = await fetch(`/api/facturas/${facturaId}/send`, { method: "POST" })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      toast({
        title: "Email reenviado",
        description: data.message,
        variant: "success",
      })

      // Recargar la página para ver el nuevo tracking
      window.location.reload()
    } catch (error: any) {
      toast({
        title: "Error al reenviar",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsResending(false)
    }
  }

  if (trackings.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Estado de envío
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Esta factura no ha sido enviada por email.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Estado de envío
          </CardTitle>
          {clienteEmail && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={handleResend}
              disabled={isResending}
            >
              <RotateCw className={`h-3 w-3 mr-1 ${isResending ? "animate-spin" : ""}`} />
              Reenviar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {trackings.map((tracking) => (
          <div key={tracking.id} className="space-y-3">
            {/* Destinatario */}
            <div className="text-xs text-muted-foreground">
              Para: <span className="font-medium text-foreground">{tracking.email_to}</span>
            </div>

            {/* Estado actual */}
            <div className="flex items-center gap-2">
              {getEstadoBadge(tracking.estado)}
              {tracking.estado === 'abierto' && tracking.abierto_count > 1 && (
                <span className="text-xs text-muted-foreground">
                  ({tracking.abierto_count} veces)
                </span>
              )}
            </div>

            {/* Timeline */}
            <div className="space-y-0 ml-1">
              {/* Enviado */}
              <TimelineItem
                icon={<Mail className="h-3.5 w-3.5" />}
                label="Enviado"
                date={tracking.enviado_at}
                active={true}
                color="text-blue-500"
              />

              {/* Entregado */}
              <TimelineItem
                icon={<MailCheck className="h-3.5 w-3.5" />}
                label="Entregado"
                date={tracking.entregado_at}
                active={!!tracking.entregado_at}
                color="text-blue-500"
              />

              {/* Abierto */}
              <TimelineItem
                icon={<Eye className="h-3.5 w-3.5" />}
                label={tracking.abierto_count > 1 ? `Leído (${tracking.abierto_count}x)` : "Leído"}
                date={tracking.abierto_at}
                active={!!tracking.abierto_at}
                color="text-green-500"
                isLast
              />

              {/* Error si aplica */}
              {(tracking.estado === 'error' || tracking.estado === 'rebotado') && (
                <TimelineItem
                  icon={<AlertCircle className="h-3.5 w-3.5" />}
                  label={tracking.estado === 'rebotado' ? 'Rebotado' : 'Error'}
                  date={tracking.created_at}
                  active={true}
                  color="text-red-500"
                  detail={tracking.error_mensaje || undefined}
                  isLast
                />
              )}
            </div>

            {/* Separador entre múltiples envíos */}
            {trackings.indexOf(tracking) < trackings.length - 1 && (
              <div className="border-t border-dashed my-3" />
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function TimelineItem({
  icon,
  label,
  date,
  active,
  color,
  detail,
  isLast,
}: {
  icon: React.ReactNode
  label: string
  date: string | null
  active: boolean
  color: string
  detail?: string
  isLast?: boolean
}) {
  return (
    <div className="flex items-start gap-3 relative">
      {/* Línea vertical */}
      {!isLast && (
        <div className="absolute left-[7px] top-[18px] w-[1px] h-[calc(100%+4px)] bg-border" />
      )}

      {/* Icono */}
      <div className={`flex-shrink-0 mt-0.5 ${active ? color : "text-muted-foreground/30"}`}>
        {icon}
      </div>

      {/* Contenido */}
      <div className="flex-1 pb-3">
        <div className={`text-xs font-medium ${active ? "text-foreground" : "text-muted-foreground/40"}`}>
          {label}
        </div>
        {date && active && (
          <div className="text-[11px] text-muted-foreground">
            {formatDateTime(date)}
          </div>
        )}
        {detail && (
          <div className="text-[11px] text-red-500 mt-0.5">
            {detail}
          </div>
        )}
      </div>
    </div>
  )
}
