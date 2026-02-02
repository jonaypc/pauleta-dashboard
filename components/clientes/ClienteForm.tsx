"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/hooks/use-toast"
import { Save, X, Building2, MapPin, Phone, FileText } from "lucide-react"
import type { Cliente, ClienteFormData } from "@/types"

interface ClienteFormProps {
  cliente?: Cliente
  onCancel?: () => void
}

export function ClienteForm({ cliente, onCancel }: ClienteFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const isEditing = !!cliente

  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<ClienteFormData>({
    nombre: cliente?.nombre || "",
    cif: cliente?.cif || "",
    direccion: cliente?.direccion || "",
    codigo_postal: cliente?.codigo_postal || "",
    ciudad: cliente?.ciudad || "",
    provincia: cliente?.provincia || "",
    telefono: cliente?.telefono || "",
    email: cliente?.email || "",
    persona_contacto: cliente?.persona_contacto || "",
    notas: cliente?.notas || "",
  })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (isEditing) {
        const { error } = await supabase
          .from("clientes")
          .update(formData)
          .eq("id", cliente.id)

        if (error) throw error

        toast({
          title: "Cliente actualizado",
          description: "Los datos del cliente se han guardado correctamente",
          variant: "success",
        })
      } else {
        const { error } = await supabase.from("clientes").insert([formData])

        if (error) throw error

        toast({
          title: "Cliente creado",
          description: "El nuevo cliente se ha añadido correctamente",
          variant: "success",
        })
      }

      router.push("/clientes")
      router.refresh()
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Error desconocido"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Datos principales */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5" />
            Datos de la empresa
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="nombre" required>
              Nombre / Razón social
            </Label>
            <Input
              id="nombre"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              placeholder="Nombre del cliente o empresa"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cif">CIF / NIF</Label>
            <Input
              id="cif"
              name="cif"
              value={formData.cif}
              onChange={handleChange}
              placeholder="B12345678"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="persona_contacto">Persona de contacto</Label>
            <Input
              id="persona_contacto"
              name="persona_contacto"
              value={formData.persona_contacto}
              onChange={handleChange}
              placeholder="Nombre del contacto"
            />
          </div>
        </CardContent>
      </Card>

      {/* Dirección */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="h-5 w-5" />
            Dirección
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="direccion">Dirección</Label>
            <Input
              id="direccion"
              name="direccion"
              value={formData.direccion}
              onChange={handleChange}
              placeholder="Calle, número, piso..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="codigo_postal">Código postal</Label>
            <Input
              id="codigo_postal"
              name="codigo_postal"
              value={formData.codigo_postal}
              onChange={handleChange}
              placeholder="35000"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ciudad">Ciudad</Label>
            <Input
              id="ciudad"
              name="ciudad"
              value={formData.ciudad}
              onChange={handleChange}
              placeholder="Las Palmas de Gran Canaria"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="provincia">Provincia</Label>
            <Input
              id="provincia"
              name="provincia"
              value={formData.provincia}
              onChange={handleChange}
              placeholder="Las Palmas"
            />
          </div>
        </CardContent>
      </Card>

      {/* Contacto */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Phone className="h-5 w-5" />
            Contacto
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="telefono">Teléfono</Label>
            <Input
              id="telefono"
              name="telefono"
              type="tel"
              value={formData.telefono}
              onChange={handleChange}
              placeholder="+34 600 000 000"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="cliente@email.com"
            />
          </div>
        </CardContent>
      </Card>

      {/* Notas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5" />
            Notas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="notas">Notas internas</Label>
            <textarea
              id="notas"
              name="notas"
              value={formData.notas}
              onChange={handleChange}
              placeholder="Notas adicionales sobre el cliente..."
              rows={3}
              className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </CardContent>
      </Card>

      {/* Botones */}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel || (() => router.back())}
          disabled={isLoading}
        >
          <X className="mr-2 h-4 w-4" />
          Cancelar
        </Button>
        <Button type="submit" loading={isLoading}>
          <Save className="mr-2 h-4 w-4" />
          {isEditing ? "Guardar cambios" : "Crear cliente"}
        </Button>
      </div>
    </form>
  )
}
