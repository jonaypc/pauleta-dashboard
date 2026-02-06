"use client"

import { useState, useEffect } from "react"
import { SmartExpenseImporter, ExtractedExpenseData } from "@/components/gastos/SmartExpenseImporter"
import { GastoForm } from "@/components/gastos/GastoForm"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, FileText, ChevronRight, CheckCircle2, Loader2 } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

interface QueuedExpense extends ExtractedExpenseData {
    queueId: string
    saved: boolean
}

export default function NuevoGastoPage() {
    // Si tenemos datos extraídos, mostramos el formulario
    // Si no, mostramos el importador
    const [extractedData, setExtractedData] = useState<ExtractedExpenseData | null>(null)
    const [expenseQueue, setExpenseQueue] = useState<QueuedExpense[]>([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [savedCount, setSavedCount] = useState(0)
    const [pagosFijos, setPagosFijos] = useState<{ id: string, concepto: string }[]>([])

    // Cargar pagos fijos al inicio
    useEffect(() => {
        const loadPagosFijos = async () => {
            const supabase = createClient()
            const { data } = await supabase
                .from("pagos_fijos")
                .select("id, concepto")
                .eq("activo", true)
                .order("concepto")

            if (data) setPagosFijos(data)
        }
        loadPagosFijos()
    }, [])

    const findMatchingFixedPayment = (proveedor: string | null | undefined, pagos: { id: string, concepto: string }[]) => {
        if (!proveedor) return null;
        const cleanProveedor = proveedor.toLowerCase().trim();
        if (!cleanProveedor) return null;

        // Buscar coincidencia, priorizando la más larga si hay varias?
        // Simple includes por ahora.
        return pagos.find(p => {
            const cleanConcepto = p.concepto.toLowerCase().trim();
            // Match si el proveedor incluye el concepto (ej: "Vodafone España" incluye "Vodafone")
            // O si el concepto incluye al proveedor (menos común pero posible)
            return cleanProveedor.includes(cleanConcepto) || cleanConcepto.includes(cleanProveedor);
        })?.id || null;
    }

    const handleSingleExtracted = (data: ExtractedExpenseData) => {
        // Intentar autocompletar pago fijo
        const matchId = findMatchingFixedPayment(data.nombre_proveedor, pagosFijos);
        const dataWithMatch = matchId ? { ...data, pago_fijo_id: matchId } : data;

        // Si ya hay una cola, agregar a ella
        if (expenseQueue.length > 0) {
            const newItem: QueuedExpense = {
                ...dataWithMatch,
                queueId: `exp-${Date.now()}`,
                saved: false
            }
            setExpenseQueue(prev => [...prev, newItem])
        } else {
            setExtractedData({
                ...dataWithMatch,
                queueId: `single-${Date.now()}`
            } as any)
        }
    }

    const handleMultipleExtracted = (dataList: ExtractedExpenseData[]) => {
        const queue: QueuedExpense[] = dataList.map((data, idx) => {
            const matchId = findMatchingFixedPayment(data.nombre_proveedor, pagosFijos);
            return {
                ...data,
                pago_fijo_id: matchId || data.pago_fijo_id, // Usar match o mantener lo que venga (generalmente null)
                queueId: `exp-${Date.now()}-${idx}`,
                saved: false
            }
        })
        setExpenseQueue(queue)
        setCurrentIndex(0)
        setSavedCount(0)

        // Cargar el primero en el formulario
        if (queue.length > 0) {
            setExtractedData(queue[0])
        }
    }

    const handleGastoSaved = () => {
        if (expenseQueue.length > 0) {
            // Marcar como guardado
            setExpenseQueue(prev => prev.map((item, idx) =>
                idx === currentIndex ? { ...item, saved: true } : item
            ))
            setSavedCount(prev => prev + 1)

            // Ir al siguiente
            const nextIndex = currentIndex + 1
            if (nextIndex < expenseQueue.length) {
                setCurrentIndex(nextIndex)
                setExtractedData(expenseQueue[nextIndex])
            } else {
                // Todos guardados
                setExtractedData(null)
            }
        } else {
            // Modo individual, resetear
            setExtractedData(null)
        }
    }

    const selectFromQueue = (index: number) => {
        if (!expenseQueue[index].saved) {
            setCurrentIndex(index)
            setExtractedData(expenseQueue[index])
        }
    }

    const resetAll = () => {
        setExtractedData(null)
        setExpenseQueue([])
        setCurrentIndex(0)
        setSavedCount(0)
    }

    const pendingCount = expenseQueue.filter(e => !e.saved).length

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/gastos">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                </Button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold tracking-tight">
                        {extractedData
                            ? expenseQueue.length > 1
                                ? `Gasto ${currentIndex + 1} de ${expenseQueue.length}`
                                : "Verificar Datos del Gasto"
                            : "Registrar Nuevo Gasto"
                        }
                    </h1>
                    <p className="text-muted-foreground">
                        {extractedData
                            ? "Confirma que los datos extraídos son correctos antes de guardar"
                            : "Sube una o varias facturas, o introduce los datos manualmente"
                        }
                    </p>
                </div>
                {expenseQueue.length > 0 && (
                    <Badge variant={pendingCount > 0 ? "default" : "secondary"} className="text-sm">
                        {savedCount}/{expenseQueue.length} guardados
                    </Badge>
                )}
            </div>

            {/* Cola de gastos múltiples */}
            {expenseQueue.length > 1 && (
                <Card>
                    <CardHeader className="py-3">
                        <CardTitle className="text-sm font-medium flex items-center justify-between">
                            <span>Facturas en cola ({pendingCount} pendientes)</span>
                            <Button variant="ghost" size="sm" onClick={resetAll}>
                                Cancelar todo
                            </Button>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                        <div className="flex gap-2 overflow-x-auto pb-2">
                            {expenseQueue.map((item, idx) => (
                                <button
                                    key={item.queueId}
                                    onClick={() => selectFromQueue(idx)}
                                    disabled={item.saved}
                                    className={`flex-shrink-0 p-3 rounded-lg border transition-all min-w-[140px] text-left ${idx === currentIndex
                                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                                        : item.saved
                                            ? 'border-green-200 bg-green-50 opacity-60'
                                            : 'border-muted hover:border-primary/50 hover:bg-muted/50'
                                        }`}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        {item.saved ? (
                                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                                        ) : idx === currentIndex ? (
                                            <Loader2 className="h-4 w-4 text-primary animate-pulse" />
                                        ) : (
                                            <FileText className="h-4 w-4 text-muted-foreground" />
                                        )}
                                        <span className="text-xs font-medium">#{idx + 1}</span>
                                    </div>
                                    <p className="text-xs truncate text-muted-foreground">
                                        {item.nombre_proveedor || item.archivo_file?.name || 'Sin nombre'}
                                    </p>
                                    {item.importe && (
                                        <p className="text-sm font-semibold mt-1">
                                            {item.importe.toFixed(2)} €
                                        </p>
                                    )}
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {!extractedData ? (
                <div className="space-y-8">
                    {/* Smart Import con soporte múltiple */}
                    <SmartExpenseImporter
                        onDataExtracted={handleSingleExtracted}
                        onMultipleExtracted={handleMultipleExtracted}
                        allowMultiple={true}
                    />

                    {/* Resumen si se completaron todos */}
                    {expenseQueue.length > 0 && savedCount === expenseQueue.length && (
                        <Card className="border-green-200 bg-green-50">
                            <CardContent className="py-6 text-center">
                                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                                <h3 className="font-semibold text-lg text-green-700">
                                    ¡{savedCount} gastos guardados correctamente!
                                </h3>
                                <p className="text-green-600 text-sm mt-1">
                                    Todos los gastos han sido procesados y guardados.
                                </p>
                                <div className="flex gap-3 justify-center mt-4">
                                    <Button variant="outline" onClick={resetAll}>
                                        Cargar más facturas
                                    </Button>
                                    <Button asChild>
                                        <Link href="/gastos">
                                            Ver todos los gastos
                                            <ChevronRight className="ml-1 h-4 w-4" />
                                        </Link>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {expenseQueue.length === 0 && (
                        <>
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-background px-2 text-muted-foreground">O introducir manualmente</span>
                                </div>
                            </div>

                            {/* Formulario Manual (sin datos) */}
                            <div className="bg-card p-6 rounded-lg border shadow-sm">
                                <GastoForm pagosFijos={pagosFijos} />
                            </div>
                        </>
                    )}
                </div>
            ) : (
                <div className="bg-card p-6 rounded-lg border shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            {extractedData.archivo_file && (
                                <Badge variant="outline" className="font-normal">
                                    <FileText className="h-3 w-3 mr-1" />
                                    {extractedData.archivo_file.name}
                                </Badge>
                            )}
                        </div>
                        <Button variant="outline" size="sm" onClick={resetAll}>
                            {expenseQueue.length > 1 ? "Cancelar todo" : "Subir otro archivo"}
                        </Button>
                    </div>

                    {/* Indicador de calidad de extracción */}
                    {extractedData && (
                        <div className="mb-4 p-3 rounded-lg bg-muted/50">
                            <p className="text-sm font-medium mb-2">Datos detectados automáticamente:</p>
                            <div className="flex flex-wrap gap-2">
                                <Badge variant={extractedData.nombre_proveedor ? "default" : "outline"}>
                                    Proveedor: {extractedData.nombre_proveedor || "No detectado"}
                                </Badge>
                                <Badge variant={extractedData.fecha ? "default" : "outline"}>
                                    Fecha: {extractedData.fecha ? new Date(extractedData.fecha).toLocaleDateString('es-ES') : "No detectada"}
                                </Badge>
                                <Badge variant={extractedData.importe ? "default" : "outline"}>
                                    Importe: {extractedData.importe ? `${extractedData.importe.toFixed(2)} €` : "No detectado"}
                                </Badge>
                                <Badge variant={extractedData.numero ? "default" : "outline"}>
                                    Nº Factura: {extractedData.numero || "No detectado"}
                                </Badge>
                                {extractedData.cif_proveedor && (
                                    <Badge variant="secondary">
                                        CIF: {extractedData.cif_proveedor}
                                    </Badge>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Formulario pre-llenado */}
                    <GastoForm
                        initialData={extractedData}
                        onSaveSuccess={expenseQueue.length > 1 ? handleGastoSaved : undefined}
                        pagosFijos={pagosFijos}
                    />
                </div>
            )}
        </div>
    )
}
