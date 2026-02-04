"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface PaginationControlsProps {
    hasNextPage: boolean
    hasPrevPage: boolean
    totalCount: number
    currentPage: number
    pageSize: number
}

export function PaginationControls({
    hasNextPage,
    hasPrevPage,
    totalCount,
    currentPage,
    pageSize,
}: PaginationControlsProps) {
    const router = useRouter()
    const searchParams = useSearchParams()

    const totalPages = Math.ceil(totalCount / pageSize)

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between px-2 gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Mostrar</span>
                <select
                    className="h-8 w-[70px] rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={pageSize}
                    onChange={(e) => {
                        const params = new URLSearchParams(searchParams.toString())
                        params.set("limit", e.target.value)
                        params.set("page", "1") // Reset to first page
                        router.push(`?${params.toString()}`)
                    }}
                >
                    <option value="10">10</option>
                    <option value="15">15</option>
                    <option value="20">20</option>
                    <option value="50">50</option>
                </select>
                <span>resultados</span>
                <span className="ml-2">
                    (Página {currentPage} de {totalPages} • Total {totalCount})
                </span>
            </div>

            <div className="flex gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    disabled={!hasPrevPage}
                    onClick={() => {
                        const params = new URLSearchParams(searchParams.toString())
                        params.set("page", String(currentPage - 1))
                        router.push(`?${params.toString()}`)
                    }}
                >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Anterior
                </Button>

                <Button
                    variant="outline"
                    size="sm"
                    disabled={!hasNextPage}
                    onClick={() => {
                        const params = new URLSearchParams(searchParams.toString())
                        params.set("page", String(currentPage + 1))
                        router.push(`?${params.toString()}`)
                    }}
                >
                    Siguiente
                    <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
            </div>
        </div>
    )
}
