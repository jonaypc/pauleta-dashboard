import { createClient } from "@/lib/supabase/server"
import { ControlCambiosForm } from "@/components/control-cambios/ControlCambiosForm"

export const metadata = {
  title: "Nuevo Control de Cambios",
}

export default async function NuevoControlCambiosPage() {
  const supabase = await createClient()

  const { data: clientes } = await supabase
    .from("clientes")
    .select("*")
    .eq("activo", true)
    .order("nombre")

  const { data: productos } = await supabase
    .from("productos")
    .select("*")
    .eq("activo", true)
    .order("nombre")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Nuevo Control de Cambios</h1>
        <p className="text-muted-foreground">
          Registrar productos retirados y entregados
        </p>
      </div>

      <div className="max-w-3xl">
        <ControlCambiosForm
          clientes={clientes || []}
          productos={productos || []}
        />
      </div>
    </div>
  )
}
