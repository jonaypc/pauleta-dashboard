
import { createClient } from "@/lib/supabase/client"
import { Proveedor } from "@/types"
import { useState, useEffect, useCallback } from "react"
import { useToast } from "@/hooks/use-toast"
import { deleteProveedorAction } from "@/lib/actions/proveedores"

export function useProveedores() {
    const [proveedores, setProveedores] = useState<Proveedor[]>([])
    const [loading, setLoading] = useState(true)
    const { toast } = useToast()
    const supabase = createClient()

    const fetchProveedores = useCallback(async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('proveedores')
                .select('*')
                .order('nombre', { ascending: true })

            if (error) throw error
            setProveedores(data || [])
        } catch (error) {
            console.error('Error fetching proveedores:', error)
            toast({
                title: "Error",
                description: "Error al cargar proveedores",
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }, [supabase, toast])

    useEffect(() => {
        fetchProveedores()
    }, [fetchProveedores])

    const createProveedor = async (data: Partial<Proveedor>) => {
        try {
            const { data: newProveedor, error } = await supabase
                .from('proveedores')
                .insert([data])
                .select()
                .single()

            if (error) throw error
            setProveedores(prev => [...prev, newProveedor].sort((a, b) => a.nombre.localeCompare(b.nombre)))
            toast({
                description: "Proveedor creado correctamente"
            })
            return newProveedor
        } catch (error) {
            console.error('Error creating proveedor:', error)
            toast({
                title: "Error",
                description: "Error al crear proveedor",
                variant: "destructive"
            })
            return null
        }
    }

    const updateProveedor = async (id: string, data: Partial<Proveedor>) => {
        try {
            const { data: updatedProveedor, error } = await supabase
                .from('proveedores')
                .update(data)
                .eq('id', id)
                .select()
                .single()

            if (error) throw error
            setProveedores(prev => prev.map(p => p.id === id ? updatedProveedor : p))
            toast({
                description: "Proveedor actualizado correctamente"
            })
            return updatedProveedor
        } catch (error) {
            console.error('Error updating proveedor:', error)
            toast({
                title: "Error",
                description: "Error al actualizar proveedor",
                variant: "destructive"
            })
            return null
        }
    }

    const deleteProveedor = async (id: string) => {
        try {
            const result = await deleteProveedorAction(id)

            if (!result.success) {
                throw new Error(result.error)
            }

            setProveedores(prev => prev.filter(p => p.id !== id))
            toast({
                description: "Proveedor eliminado"
            })
            return true
        } catch (error: any) {
            console.error('Error deleting proveedor:', error)
            toast({
                title: "No se pudo eliminar",
                description: error.message || "Error desconocido",
                variant: "destructive"
            })
            return false
        }
    }

    return {
        proveedores,
        loading,
        fetchProveedores,
        createProveedor,
        updateProveedor,
        deleteProveedor
    }
}
