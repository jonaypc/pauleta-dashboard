"use client"

import { useState } from "react"
import { SmartExpenseImporter, ExtractedExpenseData } from "@/components/gastos/SmartExpenseImporter"
import { GastoForm } from "@/components/gastos/GastoForm"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function NuevoGastoPage() {
    // Si tenemos datos extraídos, mostramos el formulario
    // Si no, mostramos el importador
    const [extractedData, setExtractedData] = useState<ExtractedExpenseData | null>(null)

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/gastos">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        {extractedData ? "Verificar Datos del Gasto" : "Registrar Nuevo Gasto"}
                    </h1>
                    <p className="text-muted-foreground">
                        {extractedData
                            ? "Confirma que los datos extraídos son correctos antes de guardar"
                            : "Sube una factura o introduce los datos manualmente"
                        }
                    </p>
                </div>
            </div>

            {!extractedData ? (
                <div className="space-y-8">
                    {/* Opción 1: Smart Import */}
                    <SmartExpenseImporter onDataExtracted={setExtractedData} />

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">O introducir manualmente</span>
                        </div>
                    </div>

                    {/* Opción 2: Formulario Manual (sin datos) */}
                    <div className="bg-card p-6 rounded-lg border shadow-sm">
                        <GastoForm />
                    </div>
                </div>
            ) : (
                <div className="bg-card p-6 rounded-lg border shadow-sm">
                    <div className="flex justify-end mb-4">
                        <Button variant="outline" size="sm" onClick={() => setExtractedData(null)}>
                            Subir otro archivo
                        </Button>
                    </div>
                    {/* Formulario pre-llenado */}
                    <GastoForm initialData={extractedData} />
                </div>
            )}
        </div>
    )
}
