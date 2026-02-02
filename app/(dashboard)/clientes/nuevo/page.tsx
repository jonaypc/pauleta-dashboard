import { ClienteForm } from "@/components/clientes/ClienteForm"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export const metadata = {
  title: "Nuevo cliente",
}

export default function NuevoClientePage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/clientes">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nuevo cliente</h1>
          <p className="text-muted-foreground">
            Añade un nuevo cliente a Pauleta Canaria
          </p>
        </div>
      </div>

      {/* Formulario */}
      <div className="max-w-2xl">
        <ClienteForm />
      </div>
    </div>
  )
}
