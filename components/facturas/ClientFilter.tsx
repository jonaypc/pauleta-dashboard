"use client"

import * as React from "react"
import { Check, ChevronsUpDown, User, X } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface ClienteSummary {
    id: string
    nombre: string
    persona_contacto?: string | null
}

interface ClientFilterProps {
    clientes: ClienteSummary[]
}

export function ClientFilter({ clientes }: ClientFilterProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [open, setOpen] = React.useState(false)

    // Get current client from URL
    const currentClienteId = searchParams.get("cliente")

    const handleSelect = (clienteId: string) => {
        const params = new URLSearchParams(searchParams.toString())

        if (clienteId === currentClienteId) {
            // Deselect if already selected
            params.delete("cliente")
        } else {
            params.set("cliente", clienteId)
        }

        router.push(`/facturas?${params.toString()}`)
        setOpen(false)
    }

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation()
        const params = new URLSearchParams(searchParams.toString())
        params.delete("cliente")
        router.push(`/facturas?${params.toString()}`)
    }

    const selectedCliente = clientes.find(c => c.id === currentClienteId)

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full sm:w-[250px] justify-between"
                >
                    <div className="flex items-center gap-2 truncate">
                        <User className="h-4 w-4 shrink-0 opacity-50" />
                        {selectedCliente ? (
                            <span className="truncate">
                                {selectedCliente.persona_contacto
                                    ? `${selectedCliente.persona_contacto} (${selectedCliente.nombre})`
                                    : selectedCliente.nombre}
                            </span>
                        ) : (
                            "Filtrar por cliente..."
                        )}
                    </div>
                    {currentClienteId ? (
                        <div
                            role="button"
                            onClick={handleClear}
                            className="ml-2 rounded-full p-1 hover:bg-muted"
                        >
                            <X className="h-3 w-3 shrink-0 opacity-50" />
                        </div>
                    ) : (
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[250px] p-0">
                <Command>
                    <CommandInput placeholder="Buscar cliente..." />
                    <CommandList>
                        <CommandEmpty>No se encontró cliente.</CommandEmpty>
                        <CommandGroup>
                            {clientes.map((cliente) => (
                                <CommandItem
                                    key={cliente.id}
                                    value={cliente.persona_contacto
                                        ? `${cliente.persona_contacto} ${cliente.nombre}`
                                        : cliente.nombre}
                                    onSelect={() => handleSelect(cliente.id)}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            currentClienteId === cliente.id ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    <div className="flex flex-col">
                                        <span>
                                            {cliente.persona_contacto || cliente.nombre}
                                        </span>
                                        {cliente.persona_contacto && (
                                            <span className="text-xs text-muted-foreground">
                                                {cliente.nombre}
                                            </span>
                                        )}
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
