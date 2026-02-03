"use client"

import { useState } from "react"
import { Plus, Settings2, ListChecks } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PagosFijosTable } from "./PagosFijosTable"
import { ControlPagosTable } from "./ControlPagosTable"
import { PagoFijoForm } from "./PagoFijoForm"
import type { PagoFijo } from "@/types"

interface PagosFijosManagerProps {
    pagosFijos: PagoFijo[]
    historialPagos: any[]
}

export function PagosFijosManager({ pagosFijos, historialPagos }: PagosFijosManagerProps) {
    const [open, setOpen] = useState(false)
    const [editingPago, setEditingPago] = useState<PagoFijo | undefined>(undefined)

    const handleEdit = (pago: PagoFijo) => {
        setEditingPago(pago)
        setOpen(true)
    }

    const handleCreate = () => {
        setEditingPago(undefined)
        setOpen(true)
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <Button onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nuevo Pago Fijo
                </Button>
            </div>

            <Tabs defaultValue="control" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="control" className="flex items-center gap-2">
                        <ListChecks className="h-4 w-4" />
                        Control Mensual
                    </TabsTrigger>
                    <TabsTrigger value="configuracion" className="flex items-center gap-2">
                        <Settings2 className="h-4 w-4" />
                        Configuración Recurrente
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="control" className="space-y-4">
                    <div className="rounded-lg bg-muted/50 p-4 mb-4">
                        <p className="text-sm text-muted-foreground">
                            Aquí puedes ver los pagos fijos que vencen próximamente y marcarlos como pagados cuando realices la transferencia.
                        </p>
                    </div>
                    <ControlPagosTable data={historialPagos} />
                </TabsContent>

                <TabsContent value="configuracion">
                    <PagosFijosTable pagos={pagosFijos} onEdit={handleEdit} />
                </TabsContent>
            </Tabs>

            <PagoFijoForm
                open={open}
                onOpenChange={(val) => {
                    setOpen(val)
                    if (!val) setEditingPago(undefined)
                }}
                pagoToEdit={editingPago}
            />
        </div>
    )
}
