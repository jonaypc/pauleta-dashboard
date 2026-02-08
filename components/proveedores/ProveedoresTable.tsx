
"use client"

import { useState } from "react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Proveedor } from "@/types"
import { MoreHorizontal, Pencil, Trash, Eye, Search, Plus } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface ProveedoresTableProps {
    data: Proveedor[]
    onDelete: (id: string) => void
}

export function ProveedoresTable({ data, onDelete }: ProveedoresTableProps) {
    const router = useRouter()
    const [filter, setFilter] = useState("")

    const filteredData = data.filter(item =>
        item.nombre.toLowerCase().includes(filter.toLowerCase()) ||
        item.cif?.toLowerCase().includes(filter.toLowerCase()) ||
        item.email?.toLowerCase().includes(filter.toLowerCase())
    )

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar proveedores..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="pl-8"
                    />
                </div>
            </div>

            <div className="rounded-md border bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>CIF</TableHead>
                            <TableHead>Contacto</TableHead>
                            <TableHead>Categoría</TableHead>
                            <TableHead className="w-[80px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    No se encontraron proveedores.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredData.map((proveedor) => (
                                <TableRow key={proveedor.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex flex-col">
                                            <span>{proveedor.nombre}</span>
                                            {proveedor.direccion && (
                                                <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                                    {proveedor.direccion}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>{proveedor.cif || "-"}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col text-sm">
                                            {proveedor.email && <span>{proveedor.email}</span>}
                                            {proveedor.telefono && <span className="text-muted-foreground">{proveedor.telefono}</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {proveedor.categoria_default ? (
                                            <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                                                {proveedor.categoria_default}
                                            </span>
                                        ) : "-"}
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Abrir menú</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => router.push(`/proveedores/${proveedor.id}`)}>
                                                    <Eye className="mr-2 h-4 w-4" /> Ver ficha
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => router.push(`/proveedores/${proveedor.id}?edit=true`)}>
                                                    <Pencil className="mr-2 h-4 w-4" /> Editar
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    className="text-red-600"
                                                    onClick={() => {
                                                        if (confirm("¿Seguro que quieres eliminar este proveedor?")) {
                                                            onDelete(proveedor.id)
                                                        }
                                                    }}
                                                >
                                                    <Trash className="mr-2 h-4 w-4" /> Eliminar
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
            <div className="text-xs text-muted-foreground text-center">
                Mostrando {filteredData.length} de {data.length} proveedores
            </div>
        </div>
    )
}
