"use client"

import * as React from "react"
import {
    format,
    addDays,
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    subMonths,
    startOfYear,
    endOfYear,
    subYears,
    startOfQuarter,
    endOfQuarter,
    subQuarters
} from "date-fns"
import { es } from "date-fns/locale"
import { Calendar as CalendarIcon, Check } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Command,
    CommandGroup,
    CommandItem,
    CommandList,
} from "@/components/ui/command"

interface DatePickerWithRangeProps {
    className?: string
    date?: DateRange
    onDateChange?: (date: DateRange | undefined) => void
}

export function DatePickerWithRange({
    className,
    date,
    onDateChange,
}: DatePickerWithRangeProps) {
    const [open, setOpen] = React.useState(false)

    const presets = [
        {
            label: "Hoy",
            getValue: () => {
                const today = new Date()
                return { from: today, to: today }
            },
        },
        {
            label: "Ayer",
            getValue: () => {
                const yesterday = addDays(new Date(), -1)
                return { from: yesterday, to: yesterday }
            },
        },
        {
            label: "Esta semana",
            getValue: () => {
                const today = new Date()
                return {
                    from: startOfWeek(today, { locale: es, weekStartsOn: 1 }),
                    to: endOfWeek(today, { locale: es, weekStartsOn: 1 }),
                }
            },
        },
        {
            label: "Semana pasada",
            getValue: () => {
                const today = new Date()
                const lastWeek = addDays(today, -7)
                return {
                    from: startOfWeek(lastWeek, { locale: es, weekStartsOn: 1 }),
                    to: endOfWeek(lastWeek, { locale: es, weekStartsOn: 1 }),
                }
            },
        },
        {
            label: "Este mes",
            getValue: () => {
                const today = new Date()
                return {
                    from: startOfMonth(today),
                    to: endOfMonth(today),
                }
            },
        },
        {
            label: "Mes pasado",
            getValue: () => {
                const today = new Date()
                const lastMonth = subMonths(today, 1)
                return {
                    from: startOfMonth(lastMonth),
                    to: endOfMonth(lastMonth),
                }
            },
        },
        {
            label: "Este trimestre",
            getValue: () => {
                const today = new Date()
                return {
                    from: startOfQuarter(today),
                    to: endOfQuarter(today),
                }
            },
        },
        {
            label: "Trimestre pasado",
            getValue: () => {
                const today = new Date()
                const lastQuarter = subQuarters(today, 1)
                return {
                    from: startOfQuarter(lastQuarter),
                    to: endOfQuarter(lastQuarter),
                }
            },
        },
        {
            label: "Este año",
            getValue: () => {
                const today = new Date()
                return {
                    from: startOfYear(today),
                    to: endOfYear(today),
                }
            },
        },
        {
            label: "Año pasado",
            getValue: () => {
                const today = new Date()
                const lastYear = subYears(today, 1)
                return {
                    from: startOfYear(lastYear),
                    to: endOfYear(lastYear),
                }
            },
        },
    ]

    return (
        <div className={cn("grid gap-2", className)}>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                            "w-[260px] justify-start text-left font-normal",
                            !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date?.from ? (
                            date.to ? (
                                <>
                                    {format(date.from, "LLL dd, y", { locale: es })} -{" "}
                                    {format(date.to, "LLL dd, y", { locale: es })}
                                </>
                            ) : (
                                format(date.from, "LLL dd, y", { locale: es })
                            )
                        ) : (
                            <span>Seleccionar fechas</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                    <div className="flex flex-col sm:flex-row">
                        <div className="border-b sm:border-r sm:border-b-0">
                            <Command className="w-full sm:w-[160px]">
                                <CommandList>
                                    <CommandGroup heading="Rangos rápidos">
                                        {presets.map((preset) => (
                                            <CommandItem
                                                key={preset.label}
                                                onSelect={() => {
                                                    onDateChange?.(preset.getValue())
                                                    setOpen(false) // Opcional: cerrar al seleccionar preset
                                                }}
                                                className="cursor-pointer"
                                            >
                                                {preset.label}
                                                <Check
                                                    className={cn(
                                                        "ml-auto h-4 w-4",
                                                        // Lógica simple para ver si coincide (opcional)
                                                        "opacity-0"
                                                    )}
                                                />
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </div>
                        <div className="p-3">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={date?.from}
                                selected={date}
                                onSelect={onDateChange}
                                numberOfMonths={2}
                                locale={es}
                            />
                        </div>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    )
}
