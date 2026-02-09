"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Search, User } from "lucide-react"
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
import type { Cliente } from "@/types"

interface ClienteComboboxProps {
    clientes: Cliente[]
    value: string
    onValueChange: (value: string) => void
    placeholder?: string
}

export function ClienteCombobox({
    clientes,
    value,
    onValueChange,
    placeholder = "Buscar cliente...",
}: ClienteComboboxProps) {
    const [open, setOpen] = React.useState(false)

    // Encontrar el cliente seleccionado
    const selectedCliente = clientes.find((cliente) => cliente.id === value)

    // Formatear nombre para mostrar
    const getDisplayName = (cliente: Cliente) => {
        if (cliente.persona_contacto) {
            return `${cliente.persona_contacto} (${cliente.nombre})`
        }
        return cliente.nombre
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between font-normal"
                >
                    {selectedCliente ? (
                        <span className="truncate">
                            {getDisplayName(selectedCliente)}
                        </span>
                    ) : (
                        <span className="text-muted-foreground">
                            {placeholder}
                        </span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
                <Command>
                    <CommandInput placeholder="Escribir para buscar..." />
                    <CommandList>
                        <CommandEmpty>
                            <div className="py-3 text-center">
                                <User className="mx-auto h-8 w-8 text-muted-foreground/50" />
                                <p className="mt-2 text-sm text-muted-foreground">
                                    No se encontraron clientes
                                </p>
                            </div>
                        </CommandEmpty>
                        <CommandGroup>
                            {clientes.map((cliente) => (
                                <CommandItem
                                    key={cliente.id}
                                    value={`${cliente.nombre} ${cliente.persona_contacto || ""}`}
                                    onSelect={() => {
                                        onValueChange(cliente.id)
                                        setOpen(false)
                                    }}
                                    className="cursor-pointer"
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === cliente.id
                                                ? "opacity-100"
                                                : "opacity-0"
                                        )}
                                    />
                                    <div className="flex flex-col">
                                        <span className="font-medium">
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
