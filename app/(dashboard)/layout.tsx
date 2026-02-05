import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DashboardLayout } from "@/components/layout/DashboardLayout"

export const dynamic = 'force-dynamic'

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Obtener datos del usuario de la tabla usuarios de forma segura
  let userData = null
  try {
    const { data } = await supabase
      .from("usuarios")
      .select("nombre, email, rol")
      .eq("id", user.id)
      .single()
    userData = data
  } catch (error) {
    console.error("Error fetching user data:", error)
  }

  return (
    <DashboardLayout user={userData || { email: user.email }}>
      {children}
    </DashboardLayout>
  )
}
