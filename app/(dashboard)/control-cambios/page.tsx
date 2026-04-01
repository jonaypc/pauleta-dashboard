import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Plus } from "lucide-react"
import { ControlCambiosTable } from "@/components/control-cambios/ControlCambiosTable"

export const metadata = {
  title: "Control de Cambios",
}

export default async function ControlCambiosPage() {
  const supabase = await createClient()

  const { data: registros } = await supabase
    .from("control_cambios")
    .select("*, cliente:clientes(nombre, persona_contacto)")
    .order("fecha", { ascending: false })
    .limit(50)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Control de Cambios</h1>
          <p className="text-muted-foreground">
            Registro de productos retirados y entregados
          </p>
        </div>
        <Button asChild>
          <Link href="/control-cambios/nuevo">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo registro
          </Link>
        </Button>
      </div>

      <ControlCambiosTable registros={registros || []} />
    </div>
  )
}
