"use client"

import { useState } from "react"
import type { PagoFijo } from "@/types"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Pencil, Trash } from "lucide-react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { formatCurrency } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { toast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

interface PagosFijosTableProps {
    pagos: PagoFijo[]
    onEdit: (pago: PagoFijo) => void
}

export function PagosFijosTable({ pagos, onEdit }: PagosFijosTableProps) {
    const router = useRouter()
    const supabase = createClient()

    const handleDelete = async (id: string) => {
        try {
            const { error } = await supabase.from("pagos_fijos").delete().eq("id", id)

            if (error) throw error

            toast({
                title: "Pago fijo eliminado",
                description: "El pago fijo se ha eliminado correctamente",
                variant: "success",
            })
            router.refresh()
        } catch (error) {
            console.error("Error deleting pago fijo:", error)
            toast({
                title: "Error",
                description: "No se pudo eliminar el pago fijo",
                variant: "destructive",
            })
        }
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Concepto</TableHead>
                        <TableHead>Período</TableHead>
                        <TableHead className="text-right">Importe</TableHead>
                        <TableHead className="text-center">Tipo</TableHead>
                        <TableHead className="text-center">Estado</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {pagos.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                                No hay pagos fijos configurados.
                            </TableCell>
                        </TableRow>
                    ) : (
                        pagos.map((pago) => (
                            <TableRow key={pago.id}>
                                <TableCell className="font-medium">{pago.concepto}</TableCell>
                                <TableCell>
                                    <Badge variant="outline">
                                        Día {pago.dia_inicio} - {pago.dia_fin}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    {pago.variable ? (
                                        <span className="text-muted-foreground italic">Variable</span>
                                    ) : (
                                        formatCurrency(pago.importe)
                                    )}
                                </TableCell>
                                <TableCell className="text-center">
                                    <Badge variant={pago.variable ? "secondary" : "default"}>
                                        {pago.variable ? "Variable" : "Fijo"}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                    <Badge
                                        variant={pago.activo ? "success" : "secondary"}
                                        className={
                                            pago.activo
                                                ? "bg-green-100 text-green-700 hover:bg-green-200"
                                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                        }
                                    >
                                        {pago.activo ? "Activo" : "Inactivo"}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                            <DropdownMenuItem onClick={() => onEdit(pago)}>
                                                <Pencil className="mr-2 h-4 w-4" />
                                                Editar
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                className="text-red-600 focus:text-red-600"
                                                onClick={() => handleDelete(pago.id)}
                                            >
                                                <Trash className="mr-2 h-4 w-4" />
                                                Eliminar
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
