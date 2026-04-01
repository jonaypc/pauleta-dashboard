"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDate } from "@/lib/utils"
import type { ControlCambio } from "@/types"

interface ControlCambiosTableProps {
  registros: ControlCambio[]
}

export function ControlCambiosTable({ registros }: ControlCambiosTableProps) {
  if (registros.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        No hay registros de control de cambios
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead className="hidden md:table-cell text-center">Retirado</TableHead>
            <TableHead className="hidden md:table-cell text-center">Entregado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {registros.map((registro) => (
            <TableRow key={registro.id} className="cursor-pointer hover:bg-muted/50">
              <TableCell>
                <Link href={`/control-cambios/${registro.id}`} className="block">
                  {formatDate(registro.fecha)}
                </Link>
              </TableCell>
              <TableCell>
                <Link href={`/control-cambios/${registro.id}`} className="block">
                  <div className="font-medium">
                    {registro.cliente?.persona_contacto || registro.cliente?.nombre || "—"}
                  </div>
                  {registro.cliente?.persona_contacto && (
                    <div className="text-xs text-muted-foreground">{registro.cliente.nombre}</div>
                  )}
                </Link>
              </TableCell>
              <TableCell className="hidden md:table-cell text-center">
                <Link href={`/control-cambios/${registro.id}`} className="block">
                  <Badge variant="destructive">{registro.total_retirado}</Badge>
                </Link>
              </TableCell>
              <TableCell className="hidden md:table-cell text-center">
                <Link href={`/control-cambios/${registro.id}`} className="block">
                  <Badge variant="cobrada">{registro.total_entregado}</Badge>
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
