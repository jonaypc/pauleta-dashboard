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
        <div className="flex items-center justify-between px-2">
            <div className="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages} ({totalCount} resultados)
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
