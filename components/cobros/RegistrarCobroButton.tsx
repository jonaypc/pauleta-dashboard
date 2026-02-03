"use client"

import { useState } from "react"
import { Plus, Search, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"
import { CobroForm } from "./CobroForm"
import { formatCurrency } from "@/lib/utils"
import type { Factura } from "@/types"

export function RegistrarCobroButton() {
    const [open, setOpen] = useState(false)
    const [step, setStep] = useState<"search" | "form">("search")
    const [busqueda, setBusqueda] = useState("")
    const [facturas, setFacturas] = useState<(Factura & { cliente: { nombre: string } })[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [selectedFactura, setSelectedFactura] = useState<(Factura & { cliente: { nombre: string } }) | null>(null)

    const supabase = createClient()

    const buscarFacturas = async () => {
        setIsLoading(true)
        try {
            const { data, error } = await supabase
                .from("facturas")
                .select("*, cliente:clientes(nombre)")
                .eq("estado", "emitida")
                .or(`numero.ilike.%${busqueda}%, cliente.nombre.ilike.%${busqueda}%`)
                .order("fecha", { ascending: false })
                .limit(10)

            if (error) throw error
            setFacturas(data as any || [])
        } catch (error) {
            console.error("Error buscando facturas:", error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleSelectFactura = (factura: any) => {
        setSelectedFactura(factura)
        setStep("form")
    }

    const reset = () => {
        setOpen(false)
        setStep("search")
        setBusqueda("")
        setFacturas([])
        setSelectedFactura(null)
    }

    return (
        <>
            <Dialog open={open} onOpenChange={(val) => !val ? reset() : setOpen(val)}>
                <DialogTrigger asChild>
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Registrar Cobro
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Registrar nuevo cobro</DialogTitle>
                    </DialogHeader>

                    {step === "search" ? (
                        <div className="space-y-4 py-4">
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Buscar factura o cliente..."
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && buscarFacturas()}
                                />
                                <Button onClick={buscarFacturas} disabled={isLoading} size="icon">
                                    <Search className="h-4 w-4" />
                                </Button>
                            </div>

                            <div className="max-h-60 overflow-y-auto space-y-2">
                                {facturas.length > 0 ? (
                                    facturas.map((f) => (
                                        <button
                                            key={f.id}
                                            onClick={() => handleSelectFactura(f)}
                                            className="w-full text-left p-3 rounded-md border hover:bg-muted transition-colors flex justify-between items-center group"
                                        >
                                            <div>
                                                <div className="font-medium group-hover:text-primary">{f.numero}</div>
                                                <div className="text-xs text-muted-foreground">{f.cliente?.nombre}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold">{formatCurrency(f.total)}</div>
                                                <div className="text-[10px] text-amber-600 font-medium uppercase">Emitida</div>
                                            </div>
                                        </button>
                                    ))
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground text-sm border border-dashed rounded-md">
                                        {isLoading ? "Buscando..." : busqueda ? "No se encontraron facturas emitidas" : "Busca facturas por número o cliente"}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="py-4">
                            {/* Aquí mostramos un resumen de lo seleccionado y permitimos volver */}
                            <div className="mb-4 p-3 bg-muted rounded-md flex justify-between items-center text-sm">
                                <div>
                                    <span className="font-semibold">{selectedFactura?.numero}</span> - {selectedFactura?.cliente?.nombre}
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => setStep("search")}> Cambiar </Button>
                            </div>

                            {/* Reusamos CobroForm envolviéndolo o integrándolo. 
                                Pero CobroForm es un Dialog... 
                                Refactorizaré CobroForm para que el contenido sea un componente separado.
                            */}
                            <p className="text-sm text-center text-muted-foreground italic">
                                Cargando formulario de cobro...
                            </p>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Modal de Cobro real (se abre cuando step es form y tenemos factura) */}
            {selectedFactura && step === "form" && (
                <CobroForm
                    open={step === "form"}
                    onOpenChange={(val) => !val && reset()}
                    facturaId={selectedFactura.id}
                    facturaNumero={selectedFactura.numero}
                    pendiente={selectedFactura.total}
                    onSuccess={() => {
                        reset()
                        window.location.reload()
                    }}
                />
            )}
        </>
    )
}
