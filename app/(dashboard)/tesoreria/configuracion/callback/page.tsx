"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { completeBankConnection } from "@/lib/actions/tesoreria"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, XCircle, Loader2, ArrowRight } from "lucide-react"
import Link from "next/link"

export default function BankCallbackPage() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
    const [errorMsg, setErrorMsg] = useState("")

    useEffect(() => {
        const ref = searchParams.get("ref")
        const requisitionId = searchParams.get("id") // GoCardless suele pasar el ID

        async function verify() {
            if (!requisitionId) {
                setStatus('error')
                setErrorMsg("No se recibió el identificador de la conexión.")
                return
            }

            try {
                const result = await completeBankConnection(requisitionId)
                if (result.success) {
                    setStatus('success')
                } else {
                    setStatus('error')
                    setErrorMsg(`El banco devolvió un estado inesperado: ${result.status}`)
                }
            } catch (error: any) {
                setStatus('error')
                setErrorMsg(error.message)
            }
        }

        verify()
    }, [searchParams])

    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <Card className="max-w-md w-full">
                <CardHeader className="text-center">
                    {status === 'loading' && (
                        <div className="flex justify-center py-4">
                            <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
                        </div>
                    )}
                    {status === 'success' && (
                        <div className="flex justify-center py-4 text-green-500">
                            <CheckCircle2 className="h-16 w-16" />
                        </div>
                    )}
                    {status === 'error' && (
                        <div className="flex justify-center py-4 text-red-500">
                            <XCircle className="h-16 w-16" />
                        </div>
                    )}
                    <CardTitle className="text-2xl mt-4">
                        {status === 'loading' && "Verificando Conexión..."}
                        {status === 'success' && "¡Conexión Exitosa!"}
                        {status === 'error' && "Fallo en la Conexión"}
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-6">
                    <p className="text-muted-foreground">
                        {status === 'loading' && "Estamos confirmando los permisos con tu banco. Un momento..."}
                        {status === 'success' && "Tu cuenta de Cajamar se ha vinculado correctamente. A partir de mañana empezaremos a recibir tus movimientos automáticamente."}
                        {status === 'error' && (errorMsg || "Hubo un problema al intentar vincular tu cuenta. Por favor, inténtalo de nuevo.")}
                    </p>

                    <div className="pt-4">
                        <Button asChild className="w-full">
                            <Link href="/tesoreria">
                                Ir a Tesorería <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
