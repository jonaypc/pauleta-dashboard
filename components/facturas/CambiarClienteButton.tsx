"use client"

import { useState } from "react"
import { Pencil, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { createClient } from "@/lib/supabase/client"
import { toast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

interface Cliente {
    id: string
    nombre: string
    cif?: string | null
    direccion?: string | null
    persona_contacto?: string | null
}

interface CambiarClienteButtonProps {
    facturaId: string
    facturaNumero: string
    clienteActualId?: string
    clientes: Cliente[]
}

export function CambiarClienteButton({
    facturaId,
    facturaNumero,
    clienteActualId,
    clientes,
}: CambiarClienteButtonProps) {
    const router = useRouter()
    const supabase = createClient()
    const [open, setOpen] = useState(false)
    const [selectedClienteId, setSelectedClienteId] = useState(clienteActualId || "")
    const [isLoading, setIsLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")

    const filteredClientes = clientes.filter(c => 
        c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.cif && c.cif.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.persona_contacto && c.persona_contacto.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    const handleCambiar = async () => {
        if (!selectedClienteId) {
            toast({
                title: "Error",
                description: "Selecciona un cliente",
                variant: "destructive",
            })
            return
        }

        setIsLoading(true)
        try {
            const { error } = await supabase
                .from("facturas")
                .update({ cliente_id: selectedClienteId })
                .eq("id", facturaId)

            if (error) throw error

            toast({
                title: "Cliente actualizado",
                description: `Se ha cambiado el cliente de la factura ${facturaNumero}`,
                variant: "success",
            })
            setOpen(false)
            router.refresh()
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "No se pudo actualizar el cliente",
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <Pencil className="mr-2 h-3 w-3" />
                    Cambiar cliente
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Cambiar cliente</DialogTitle>
                    <DialogDescription>
                        Selecciona el nuevo cliente para la factura {facturaNumero}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    {/* Buscador */}
                    <input
                        type="text"
                        placeholder="Buscar cliente..."
                        className="w-full px-3 py-2 border rounded-md text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    
                    {/* Lista de clientes */}
                    <div className="max-h-[300px] overflow-y-auto border rounded-md">
                        {filteredClientes.map((cliente) => (
                            <div
                                key={cliente.id}
                                className={`p-3 border-b last:border-b-0 cursor-pointer hover:bg-muted/50 transition-colors ${
                                    selectedClienteId === cliente.id ? "bg-primary/10 border-l-2 border-l-primary" : ""
                                }`}
                                onClick={() => setSelectedClienteId(cliente.id)}
                            >
                                {cliente.persona_contacto ? (
                                    <>
                                        <div className="font-medium text-sm">{cliente.persona_contacto}</div>
                                        <div className="text-xs text-muted-foreground">{cliente.nombre}</div>
                                    </>
                                ) : (
                                    <div className="font-medium text-sm">{cliente.nombre}</div>
                                )}
                                {cliente.cif && (
                                    <div className="text-xs text-muted-foreground">CIF: {cliente.cif}</div>
                                )}
                                {cliente.direccion && (
                                    <div className="text-xs text-muted-foreground truncate">{cliente.direccion}</div>
                                )}
                            </div>
                        ))}
                        {filteredClientes.length === 0 && (
                            <div className="p-4 text-center text-muted-foreground text-sm">
                                No se encontraron clientes
                            </div>
                        )}
                    </div>
                    
                    {/* Botones */}
                    <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
                            Cancelar
                        </Button>
                        <Button onClick={handleCambiar} disabled={isLoading || !selectedClienteId}>
                            {isLoading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            Guardar cambio
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
