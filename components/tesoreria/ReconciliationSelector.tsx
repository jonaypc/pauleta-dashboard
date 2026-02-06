"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { formatCurrency, formatDate } from "@/lib/utils"
import { FileText, ShoppingBag, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { reconcileMovement } from "@/lib/actions/tesoreria"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

interface Suggestion {
    id: string
    type: 'gasto' | 'factura'
    date: string
    amount: number
    entity: string
    reference: string
    matchScore: number
}

interface ReconciliationSelectorProps {
    movementId: string
    movementImporte: number
    suggestions: Suggestion[]
}

export function ReconciliationSelector({ movementId, movementImporte, suggestions }: ReconciliationSelectorProps) {
    const router = useRouter()
    const { toast } = useToast()
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [isSubmitting, setIsSubmitting] = useState(false)

    const isPositive = movementImporte > 0
    const absMovementAmount = Math.abs(movementImporte)

    // Sort suggestions by score
    const sortedSuggestions = [...suggestions].sort((a, b) => b.matchScore - a.matchScore)

    const totalSelected = sortedSuggestions
        .filter(s => selectedIds.includes(s.id))
        .reduce((sum, s) => sum + s.amount, 0)

    const difference = Math.abs(absMovementAmount - totalSelected)
    const isBalanced = difference < 0.05

    const handleToggle = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        )
    }

    const handleConciliar = async () => {
        if (selectedIds.length === 0) return

        setIsSubmitting(true)
        try {
            const firstType = sortedSuggestions.find(s => s.id === selectedIds[0])?.type || (isPositive ? 'factura' : 'gasto')
            await reconcileMovement(movementId, firstType, selectedIds)

            toast({
                title: "Conciliación exitosa",
                description: `Se han vinculado ${selectedIds.length} elementos correctamente.`
            })
            router.push("/tesoreria")
            router.refresh()
        } catch (error: any) {
            toast({
                title: "Error al conciliar",
                description: error.message,
                variant: "destructive"
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    {suggestions.length > 0 ? (
                        <><CheckCircle2 className="h-5 w-5 text-green-500" /> Coincidencias y Pendientes ({suggestions.length})</>
                    ) : (
                        <><AlertCircle className="h-5 w-5 text-amber-500" /> No se encontraron facturas pendientes</>
                    )}
                </h3>

                {selectedIds.length > 0 && (
                    <div className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-2 animate-in fade-in zoom-in ${isBalanced ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                        Total Seleccionado: {formatCurrency(totalSelected)}
                        {isBalanced ? (
                            <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> CUADRA</span>
                        ) : (
                            <span>(Dif: {formatCurrency(difference)})</span>
                        )}
                    </div>
                )}
            </div>

            <div className="grid gap-4">
                {sortedSuggestions.map((s) => {
                    const isSelected = selectedIds.includes(s.id)
                    const isBestMatch = s.matchScore >= 100

                    return (
                        <Card
                            key={s.id}
                            className={`transition-all cursor-pointer select-none ${isSelected ? 'border-primary ring-1 ring-primary bg-primary/5' : 'hover:border-primary/50 border-dashed'
                                } ${isBestMatch && !isSelected ? 'border-green-200 bg-green-50/20' : ''}`}
                            onClick={() => handleToggle(s.id)}
                        >
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className="flex gap-4 items-center flex-1">
                                    <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={() => handleToggle(s.id)}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${s.type === 'gasto' ? 'bg-amber-100' : 'bg-blue-100'
                                        }`}>
                                        {s.type === 'gasto' ?
                                            <ShoppingBag className={`h-5 w-5 ${s.type === 'gasto' ? 'text-amber-600' : 'text-blue-600'}`} /> :
                                            <FileText className="h-5 w-5 text-blue-600" />
                                        }
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold truncate">{s.entity}</span>
                                            <Badge variant="secondary" className="text-[10px] py-0">
                                                {s.type === 'gasto' ? 'COMPRA' : 'VENTA'}
                                            </Badge>
                                            {isBestMatch && (
                                                <Badge className="bg-green-500 hover:bg-green-600 text-[9px] h-4 leading-none uppercase">Match</Badge>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {s.reference || "Sin número"} • {formatDate(s.date)}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 ml-4">
                                    <div className="text-right">
                                        <p className="font-bold tabular-nums">{formatCurrency(s.amount)}</p>
                                        {isBestMatch && <p className="text-[10px] text-green-600 font-medium">COINCIDENCIA</p>}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            <div className="sticky bottom-0 bg-background/80 backdrop-blur-sm p-4 border-t flex justify-end gap-3 z-10">
                <Button
                    variant="outline"
                    onClick={() => router.back()}
                    disabled={isSubmitting}
                >
                    Cancelar
                </Button>
                <Button
                    onClick={handleConciliar}
                    disabled={selectedIds.length === 0 || isSubmitting}
                    className="min-w-[150px]"
                >
                    {isSubmitting ? (
                        <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Procesando...</>
                    ) : (
                        `Conciliar ${selectedIds.length > 0 ? `(${selectedIds.length})` : ''}`
                    )}
                </Button>
            </div>
        </div>
    )
}
