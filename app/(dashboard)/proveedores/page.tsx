
"use client"

import { useProveedores } from "@/hooks/useProveedores"
import { ProveedoresTable } from "@/components/proveedores/ProveedoresTable"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { ProveedorForm } from "@/components/proveedores/ProveedorForm"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { useState } from "react"
import { Toaster } from "sonner"

export default function ProveedoresPage() {
    const { proveedores, loading, deleteProveedor, fetchProveedores } = useProveedores()
    const [open, setOpen] = useState(false)

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Proveedores</h1>
                    <p className="text-muted-foreground">Listado de empresas y proveedores registrados.</p>
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Nuevo Proveedor
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                            <DialogTitle>Añadir Proveedor</DialogTitle>
                            <DialogDescription>
                                Completa los datos para dar de alta un nuevo proveedor.
                            </DialogDescription>
                        </DialogHeader>
                        <ProveedorForm
                            onSuccess={() => {
                                setOpen(false)
                                fetchProveedores()
                            }}
                        />
                    </DialogContent>
                </Dialog>
            </div>

            {loading ? (
                <div className="space-y-3">
                    <div className="h-10 w-full bg-muted animate-pulse rounded-md" />
                    <div className="h-20 w-full bg-muted animate-pulse rounded-md" />
                    <div className="h-20 w-full bg-muted animate-pulse rounded-md" />
                </div>
            ) : (
                <ProveedoresTable
                    data={proveedores}
                    onDelete={async (id) => {
                        await deleteProveedor(id)
                        fetchProveedores()
                    }}
                />
            )}
        </div>
    )
}
