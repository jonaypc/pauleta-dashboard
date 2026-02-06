"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { DateRange } from "react-day-picker"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { startOfYear, endOfDay } from "date-fns"

export function DateRangeFilter() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [date, setDate] = useState<DateRange | undefined>()

    // Sync state with URL params on mount
    useEffect(() => {
        const fromParam = searchParams.get("from")
        const toParam = searchParams.get("to")

        if (fromParam && toParam) {
            setDate({
                from: new Date(fromParam),
                to: new Date(toParam)
            })
        } else {
            // Default: This Year
            setDate({
                from: startOfYear(new Date()),
                to: new Date()
            })
        }
    }, [searchParams])

    const handleDateChange = (newDate: DateRange | undefined) => {
        setDate(newDate)

        if (newDate?.from) {
            const params = new URLSearchParams(searchParams.toString())
            params.set("from", newDate.from.toISOString().split('T')[0])

            if (newDate.to) {
                params.set("to", newDate.to.toISOString().split('T')[0])
            } else {
                params.delete("to")
            }

            router.push(`?${params.toString()}`)
        }
    }

    return (
        <DatePickerWithRange
            date={date}
            onDateChange={handleDateChange}
            className="w-full sm:w-auto"
        />
    )
}
