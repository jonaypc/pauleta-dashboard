"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { addDays } from "date-fns"
import { DateRange } from "react-day-picker"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"

export function FacturasFilter() {
    const router = useRouter()
    const searchParams = useSearchParams()

    // Parse initial date from URL
    const from = searchParams.get("from")
    const to = searchParams.get("to")

    const date: DateRange | undefined = from ? {
        from: new Date(from),
        to: to ? new Date(to) : undefined
    } : undefined

    const handleDateChange = (newDate: DateRange | undefined) => {
        const params = new URLSearchParams(searchParams.toString())

        if (newDate?.from) {
            // Adjust for timezone offset to ensure the date string is correct (YYYY-MM-DD)
            // Or simply use the date object and format it as ISO string date part
            const fromStr = newDate.from.toLocaleDateString("en-CA") // YYYY-MM-DD
            params.set("from", fromStr)

            if (newDate.to) {
                const toStr = newDate.to.toLocaleDateString("en-CA")
                params.set("to", toStr)
            } else {
                params.delete("to")
            }
        } else {
            params.delete("from")
            params.delete("to")
        }

        router.push(`/facturas?${params.toString()}`)
    }

    return (
        <DatePickerWithRange
            date={date}
            onDateChange={handleDateChange}
            className="w-full sm:w-auto"
        />
    )
}
