"use client"

import * as React from "react"
import { addDays, format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"
import { es } from "date-fns/locale"
import { useRouter, useSearchParams } from "next/navigation"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

export function DateRangePicker({
    className,
}: React.HTMLAttributes<HTMLDivElement>) {
    const router = useRouter()
    const searchParams = useSearchParams()

    // Inicializar estado desde URL o por defecto (mes actual)
    const defaultFrom = searchParams.get("from") ? new Date(searchParams.get("from")!) : new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    const defaultTo = searchParams.get("to") ? new Date(searchParams.get("to")!) : new Date()

    const [date, setDate] = React.useState<DateRange | undefined>({
        from: defaultFrom,
        to: defaultTo,
    })

    // Actualizar URL cuando cambia la fecha
    React.useEffect(() => {
        if (date?.from && date?.to) {
            // CORRECCION TS: Convertir a string para evitar conflictos de tipos
            const params = new URLSearchParams(searchParams.toString())
            params.set("from", format(date.from, "yyyy-MM-dd"))
            params.set("to", format(date.to, "yyyy-MM-dd"))
            router.replace(`?${params.toString()}`)
        }
    }, [date, router, searchParams])

    return (
        <div className={cn("grid gap-2", className)}>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                            "w-[300px] justify-start text-left font-normal",
                            !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date?.from ? (
                            date.to ? (
                                <>
                                    {format(date.from, "P", { locale: es })} -{" "}
                                    {format(date.to, "P", { locale: es })}
                                </>
                            ) : (
                                format(date.from, "P", { locale: es })
                            )
                        ) : (
                            <span>Seleccionar fechas</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={date?.from}
                        selected={date}
                        onSelect={setDate}
                        numberOfMonths={2}
                        locale={es}
                    />
                </PopoverContent>
            </Popover>
        </div>
    )
}
