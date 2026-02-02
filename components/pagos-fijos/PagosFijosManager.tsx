"use client"

import { useState } from "react"
import { PagosFijosTable } from "./PagosFijosTable"
import { PagoFijoForm } from "./PagoFijoForm"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import type { PagoFijo } from "@/types"

interface PagosFijosManagerProps {
    initialPagos: PagoFijo[]
}

export function PagosFijosManager({ initialPagos }: PagosFijosManagerProps) {
    const [pagos, setPagos] = useState<PagoFijo[]>(initialPagos)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingPago, setEditingPago] = useState<PagoFijo | null>(null)

    const handleEdit = (pago: PagoFijo) => {
        setEditingPago(pago)
        setIsDialogOpen(true)
    }

    const handleCreate = () => {
        setEditingPago(null)
        setIsDialogOpen(true)
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo Pago Fijo
                </Button>
            </div>

            <PagosFijosTable pagos={initialPagos} onEdit={handleEdit} />

            <PagoFijoForm
                open={isDialogOpen}
                onOpenChange={(open) => {
                    setIsDialogOpen(open)
                    if (!open) setEditingPago(null)
                }}
                pagoToEdit={editingPago}
            />
        </div>
    )
}
