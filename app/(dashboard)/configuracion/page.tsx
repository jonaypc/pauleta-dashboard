import { createClient } from "@/lib/supabase/server"
import { EmpresaForm } from "@/components/configuracion/EmpresaForm"
import Link from "next/link"
import { HardDrive, ChevronRight } from "lucide-react"

export const metadata = {
    title: "Configuración",
}

export default async function ConfiguracionPage() {
    const supabase = await createClient()

    const { data: empresa } = await supabase
        .from("empresa")
        .select("*")
        .single()

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Configuración</h1>
                    <p className="text-muted-foreground">
                        Gestiona los datos de tu empresa para facturas y albaranes.
                    </p>
                </div>
            </div>

            {/* Integraciones */}
            <div className="grid gap-4 md:grid-cols-2">
                <Link
                    href="/configuracion/drive"
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg hover:shadow-md transition-all group"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <HardDrive className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="font-semibold text-blue-900">Google Drive</p>
                            <p className="text-sm text-blue-600">Sincroniza facturas automáticamente</p>
                        </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-blue-400 group-hover:translate-x-1 transition-transform" />
                </Link>
            </div>

            <div className="grid gap-6">
                <EmpresaForm initialData={empresa} />
            </div>
        </div>
    )
}
