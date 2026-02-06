import { Suspense } from "react"
import { Metadata } from "next"
import { BankConnectionSettings } from "@/components/tesoreria/BankConnectionSettings"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Landmark, ShieldCheck, Zap } from "lucide-react"
import Link from "next/link"

export const metadata: Metadata = {
    title: "Configuración de Banco | Pauleta Canaria",
    description: "Configura la integración automática con tus bancos",
}

export default function TesoreriaConfigPage() {
    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/tesoreria">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Conectividad Bancaria</h1>
                    <p className="text-muted-foreground">Automatiza la sincronización de movimientos sin subir archivos.</p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-6">
                    <Suspense fallback={<div className="h-[400px] w-full bg-muted animate-pulse rounded-lg" />}>
                        <BankConnectionSettings />
                    </Suspense>
                </div>

                <div className="space-y-4">
                    <Card className="bg-slate-50 border-slate-200">
                        <CardHeader>
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <ShieldCheck className="h-4 w-4 text-green-600" />
                                Seguridad PSD2
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-xs text-muted-foreground space-y-3">
                            <p>Utilizamos el estándar europeo <strong>PSD2</strong> para garantizar que tus datos viajen cifrados y seguros.</p>
                            <ul className="list-disc pl-4 space-y-1">
                                <li>Solo acceso de lectura (no podemos hacer transferencias).</li>
                                <li>Tú autorizas el acceso directamente en la web de <strong>Cajamar</strong>.</li>
                                <li>Puedes revocar el acceso en cualquier momento desde tu banca online o desde aquí.</li>
                            </ul>
                        </CardContent>
                    </Card>

                    <Card className="bg-blue-50/50 border-blue-100">
                        <CardHeader>
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <Zap className="h-4 w-4 text-blue-600" />
                                ¿Cómo funciona?
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-xs text-muted-foreground space-y-2">
                            <p>Una vez vinculado, el sistema se conectará cada noche para descargar los nuevos movimientos.</p>
                            <p>Al día siguiente, verás las sugerencias de conciliación listas para validar, ahorrándote el trabajo de subir el extracto manualmente.</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}

function Card({ children, className }: { children: React.ReactNode, className?: string }) {
    return <div className={`rounded-xl border shadow-sm ${className}`}>{children}</div>
}
function CardHeader({ children, className }: { children: React.ReactNode, className?: string }) {
    return <div className={`p-4 pb-2 ${className}`}>{children}</div>
}
function CardTitle({ children, className }: { children: React.ReactNode, className?: string }) {
    return <h3 className={`text-base font-semibold leading-none ${className}`}>{children}</h3>
}
function CardContent({ children, className }: { children: React.ReactNode, className?: string }) {
    return <div className={`p-4 pt-0 ${className}`}>{children}</div>
}
function CardDescription({ children, className }: { children: React.ReactNode, className?: string }) {
    return <p className={`text-sm text-muted-foreground ${className}`}>{children}</p>
}
