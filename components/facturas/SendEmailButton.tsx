"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { Mail, Loader2 } from "lucide-react"

interface SendEmailButtonProps {
    facturaId: string
    clienteEmail?: string | null
    disabled?: boolean
}

export function SendEmailButton({
    facturaId,
    clienteEmail,
    disabled = false,
}: SendEmailButtonProps) {
    const [isLoading, setIsLoading] = useState(false)

    const handleSendEmail = async () => {
        if (!clienteEmail) {
            toast({
                title: "Error",
                description: "El cliente no tiene email configurado",
                variant: "destructive",
            })
            return
        }

        setIsLoading(true)

        try {
            const response = await fetch(`/api/facturas/${facturaId}/send`, {
                method: "POST",
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || "Error al enviar email")
            }

            toast({
                title: "Email enviado",
                description: `La factura se ha enviado a ${clienteEmail}`,
                variant: "success",
            })
        } catch (error: unknown) {
            const errorMessage =
                error instanceof Error ? error.message : "Error desconocido"
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
        <Button
            variant="outline"
            onClick={handleSendEmail}
            disabled={disabled || isLoading || !clienteEmail}
            title={!clienteEmail ? "El cliente no tiene email" : undefined}
        >
            {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
                <Mail className="mr-2 h-4 w-4" />
            )}
            Enviar email
        </Button>
    )
}
