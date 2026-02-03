import { PDFImporterDebugger } from "@/components/facturas/PDFImporterDebugger"

export const metadata = {
    title: "Importar Facturas PDF",
}

export default function ImportarPDFPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Importar Facturas PDF</h1>
                <p className="text-muted-foreground">
                    Herramienta de diagnóstico para procesar facturas de QuickBooks.
                </p>
            </div>

            <PDFImporterDebugger />
        </div>
    )
}
