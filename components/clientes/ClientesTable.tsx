"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "@/hooks/use-toast"
import { MoreHorizontal, Pencil, Trash2, Eye, Mail, Phone } from "lucide-react"
import type { Cliente } from "@/types"

interface ClientesTableProps {
  clientes: Cliente[]
}

export function ClientesTable({ clientes }: ClientesTableProps) {
  const router = useRouter()
  const supabase = createClient()
  const [clienteAEliminar, setClienteAEliminar] = useState<Cliente | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!clienteAEliminar) return

    setIsDeleting(true)
    const { error } = await supabase
      .from("clientes")
      .update({ activo: false })
      .eq("id", clienteAEliminar.id)

    if (error) {
      toast({
        title: "Error",
        description: "No se pudo desactivar el cliente",
        variant: "destructive",
      })
    } else {
      toast({
        title: "Cliente desactivado",
        description: `${clienteAEliminar.nombre} ha sido desactivado`,
        variant: "success",
      })
      router.refresh()
    }

    setIsDeleting(false)
    setClienteAEliminar(null)
  }

  return (
    <>
      <div className="rounded-lg border bg-card">
        <table className="table-pauleta">
          <thead>
            <tr>
              <th>Cliente</th>
              <th className="hidden md:table-cell">CIF</th>
              <th className="hidden lg:table-cell">Contacto</th>
              <th className="hidden sm:table-cell">Ciudad</th>
              <th>Estado</th>
              <th className="w-[50px]"></th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((cliente) => (
              <tr key={cliente.id}>
                <td>
                  <div>
                    <p className="font-medium">
                      {cliente.persona_contacto || cliente.nombre}
                    </p>
                    {cliente.persona_contacto && cliente.nombre && (
                      <p className="text-xs text-muted-foreground">
                        {cliente.nombre}
                      </p>
                    )}
                  </div>
                </td>
                <td className="hidden md:table-cell">
                  {cliente.cif || (
                    <span className="text-muted-foreground">-</span>
                  )}
                </td>
                <td className="hidden lg:table-cell">
                  <div className="flex flex-col gap-1">
                    {cliente.email && (
                      <div className="flex items-center gap-1 text-xs">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span className="truncate max-w-[150px]">{cliente.email}</span>
                      </div>
                    )}
                    {cliente.telefono && (
                      <div className="flex items-center gap-1 text-xs">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <span>{cliente.telefono}</span>
                      </div>
                    )}
                    {!cliente.email && !cliente.telefono && (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </div>
                </td>
                <td className="hidden sm:table-cell">
                  {cliente.ciudad || (
                    <span className="text-muted-foreground">-</span>
                  )}
                </td>
                <td>
                  <Badge variant={cliente.activo ? "cobrada" : "anulada"}>
                    {cliente.activo ? "Activo" : "Inactivo"}
                  </Badge>
                </td>
                <td>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/clientes/${cliente.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          Ver detalles
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/clientes/${cliente.id}?editar=true`}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setClienteAEliminar(cliente)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Desactivar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de confirmación */}
      <AlertDialog
        open={!!clienteAEliminar}
        onOpenChange={() => setClienteAEliminar(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              El cliente &quot;{clienteAEliminar?.nombre}&quot; será desactivado
              y no aparecerá en las listas. Podrás reactivarlo más adelante.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? "Desactivando..." : "Desactivar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
