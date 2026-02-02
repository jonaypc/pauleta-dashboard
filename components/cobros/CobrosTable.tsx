"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import type { Cobro, MetodoPago } from "@/types"

interface CobrosTableProps {
    cobros: (Cobro & { factura?: { numero: string; cliente?: { nombre: string } } })[]
}

// Formatea el precio con el símbolo del euro
function formatPrecio(precio: number): string {
    return new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency: "EUR",
    }).format(precio)
}

// Formatea fecha a formato español
function formatFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    })
}

// Mapea método de pago a variante de badge
function getMetodoVariant(metodo: MetodoPago | null): "transferencia" | "efectivo" | "bizum" | "tarjeta" | "outline" {
    if (!metodo) return "outline"
    return metodo
}

// Mapea método a texto legible
function getMetodoLabel(metodo: MetodoPago | null): string {
    if (!metodo) return "Sin especificar"
    const labels: Record<MetodoPago, string> = {
        transferencia: "Transferencia",
        efectivo: "Efectivo",
        bizum: "Bizum",
        tarjeta: "Tarjeta",
    }
    return labels[metodo]
}

export function CobrosTable({ cobros }: CobrosTableProps) {
    return (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-border bg-muted/50">
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                            Fecha
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                            Factura
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                            Cliente
                        </th>
                        <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                            Importe
                        </th>
                        <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                            Método
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                            Referencia
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {cobros.length === 0 ? (
                        <tr>
                            <td
                                colSpan={6}
                                className="px-4 py-8 text-center text-muted-foreground"
                            >
                                No hay cobros registrados
                            </td>
                        </tr>
                    ) : (
                        cobros.map((cobro) => (
                            <tr
                                key={cobro.id}
                                className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors"
                            >
                                <td className="px-4 py-3 text-muted-foreground">
                                    {formatFecha(cobro.fecha)}
                                </td>
                                <td className="px-4 py-3">
                                    {cobro.factura ? (
                                        <Link
                                            href={`/facturas/${cobro.factura_id}`}
                                            className="font-medium text-primary hover:underline"
                                        >
                                            {cobro.factura.numero}
                                        </Link>
                                    ) : (
                                        <span className="text-muted-foreground">-</span>
                                    )}
                                </td>
                                <td className="px-4 py-3">
                                    {cobro.factura?.cliente?.nombre || "-"}
                                </td>
                                <td className="px-4 py-3 text-right font-medium tabular-nums text-green-600">
                                    +{formatPrecio(cobro.importe)}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <Badge
                                        variant={getMetodoVariant(cobro.metodo)}
                                        className="text-xs"
                                    >
                                        {getMetodoLabel(cobro.metodo)}
                                    </Badge>
                                </td>
                                <td className="px-4 py-3 text-muted-foreground">
                                    {cobro.referencia || "-"}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    )
}
