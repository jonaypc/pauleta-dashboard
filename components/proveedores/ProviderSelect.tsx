
"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Plus } from "lucide-react"
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
import { useProveedores } from "@/hooks/useProveedores"

interface ProviderSelectProps {
    value?: string
    onSelect: (providerName: string, providerId?: string) => void
    error?: boolean
}

export function ProviderSelect({ value, onSelect, error }: ProviderSelectProps) {
    const [open, setOpen] = React.useState(false)
    const { proveedores, fetchProveedores } = useProveedores()
    const [search, setSearch] = React.useState("")

    React.useEffect(() => {
        if (proveedores.length === 0) {
            fetchProveedores()
        }
    }, [fetchProveedores, proveedores.length])

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn(
                        "w-full justify-between",
                        !value && "text-muted-foreground",
                        error && "border-destructive"
                    )}
                >
                    {value || "Seleccionar proveedor..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                    <CommandInput
                        placeholder="Buscar proveedor..."
                        onValueChange={setSearch}
                    />
                    <CommandList>
                        <CommandEmpty>
                            <div className="p-2 text-sm text-muted-foreground text-center">
                                No encontrado.
                                <Button
                                    variant="link"
                                    size="sm"
                                    className="px-1 h-auto font-semibold"
                                    onClick={() => {
                                        onSelect(search) // Select the search term as new provider name
                                        setOpen(false)
                                    }}
                                >
                                    Crear &quot;{search}&quot;
                                </Button>
                            </div>
                        </CommandEmpty>
                        <CommandGroup>
                            {proveedores.map((provider) => (
                                <CommandItem
                                    key={provider.id}
                                    value={provider.nombre}
                                    onSelect={(currentValue) => {
                                        onSelect(provider.nombre, provider.id)
                                        setOpen(false)
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === provider.nombre ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    <div className="flex flex-col">
                                        <span>{provider.nombre}</span>
                                        {provider.cif && <span className="text-[10px] text-muted-foreground">{provider.cif}</span>}
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
