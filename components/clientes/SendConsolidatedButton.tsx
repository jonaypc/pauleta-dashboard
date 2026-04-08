"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Eye, FileStack, FileText, Loader2, Mail } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"

interface SendConsolidatedButtonProps {
    clienteId: string
    clienteNombre: string
    clienteEmail: string | null
}

function getMonthOptions() {
    const options: { value: string; label: string }[] = []
    const now = new Date()
    for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
        const label = d.toLocaleDateString("es-ES", { month: "long", year: "numeric" })
        options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) })
    }
    return options
}

interface FacturaPreview {
    id: string
    numero: string
    fecha: string
    total: number
    estado: string
}

export function SendConsolidatedButton({ clienteId, clienteNombre, clienteEmail }: SendConsolidatedButtonProps) {
    const [selectedMonth, setSelectedMonth] = useState("")
    const [facturas, setFacturas] = useState<FacturaPreview[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isSending, setIsSending] = useState(false)
    const supabase = createClient()
    const monthOptions = getMonthOptions()

    const handleMonthChange = async (value: string) => {
        setSelectedMonth(value)
        setIsLoading(true)
        try {
            const [year, month] = value.split("-").map(Number)
            const fechaDesde = `${year}-${String(month).padStart(2, "0")}-01`
            const lastDay = new Date(year, month, 0).getDate()
            const fechaHasta = `${year}-${String(month).padStart(2, "0")}-${lastDay}`

            const { data, error } = await supabase
                .from("facturas")
                .select("id, numero, fecha, total, estado")
                .eq("cliente_id", clienteId)
                .gte("fecha", fechaDesde)
                .lte("fecha", fechaHasta)
                .neq("estado", "anulada")
                .order("fecha", { ascending: true })

            if (error) throw error
            setFacturas(data || [])
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Error al buscar facturas",
                variant: "destructive",
            })
            setFacturas([])
        } finally {
            setIsLoading(false)
        }
    }

    const handleSend = async () => {
        if (facturas.length === 0) return

        if (!confirm(`¿Enviar resumen de ${facturas.length} facturas a ${clienteEmail}?`)) return

        setIsSending(true)
        try {
            const response = await fetch("/api/facturas/send-consolidated", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ facturaIds: facturas.map(f => f.id) }),
            })
            const data = await response.json()
            if (!response.ok) throw new Error(data.error || "Error al enviar resumen")

            toast({
                title: "Resumen enviado",
                description: `${data.enviadas} facturas enviadas como resumen a ${data.clienteEmail}`,
                variant: "success",
            })
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Error al enviar resumen consolidado",
                variant: "destructive",
            })
        } finally {
            setIsSending(false)
        }
    }

    const totalFacturas = facturas.reduce((sum, f) => sum + f.total, 0)
    const formattedTotal = new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency: "EUR",
    }).format(totalFacturas)

    if (!clienteEmail) return null

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                    <FileStack className="h-5 w-5" />
                    Enviar resumen de facturas
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <label className="text-sm font-medium text-muted-foreground">Selecciona el mes</label>
                    <Select value={selectedMonth} onValueChange={handleMonthChange}>
                        <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Elige un mes..." />
                        </SelectTrigger>
                        <SelectContent>
                            {monthOptions.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {isLoading && (
                    <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                )}

                {!isLoading && selectedMonth && facturas.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                        No hay facturas para este periodo
                    </p>
                )}

                {!isLoading && facturas.length > 0 && (
                    <>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {facturas.map(f => (
                                <div key={f.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                                    <div>
                                        <span className="font-medium">{f.numero}</span>
                                        <span className="ml-2 text-muted-foreground">
                                            {new Date(f.fecha).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" })}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant={f.estado as any} className="text-xs">
                                            {f.estado}
                                        </Badge>
                                        <span className="font-medium tabular-nums">
                                            {new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(f.total)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center justify-between border-t pt-3">
                            <span className="text-sm font-medium">
                                {facturas.length} factura{facturas.length > 1 ? "s" : ""}
                            </span>
                            <span className="text-lg font-bold text-primary">{formattedTotal}</span>
                        </div>

                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={async () => {
                                    const res = await fetch("/api/facturas/preview-consolidated", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ facturaIds: facturas.map(f => f.id) }),
                                    })
                                    const blob = await res.blob()
                                    const url = URL.createObjectURL(blob)
                                    window.open(url, "_blank")
                                }}
                            >
                                <Eye className="mr-2 h-4 w-4" />
                                Ver email
                            </Button>
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={async () => {
                                    const res = await fetch("/api/facturas/preview-consolidated", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ facturaIds: facturas.map(f => f.id), format: "pdf" }),
                                    })
                                    const blob = await res.blob()
                                    const url = URL.createObjectURL(blob)
                                    window.open(url, "_blank")
                                }}
                            >
                                <FileText className="mr-2 h-4 w-4" />
                                Ver PDF
                            </Button>
                        </div>

                        <Button
                            className="w-full"
                            onClick={handleSend}
                            disabled={isSending}
                        >
                            {isSending ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Mail className="mr-2 h-4 w-4" />
                            )}
                            {isSending ? "Enviando resumen..." : `Enviar resumen a ${clienteEmail}`}
                        </Button>
                    </>
                )}
            </CardContent>
        </Card>
    )
}
