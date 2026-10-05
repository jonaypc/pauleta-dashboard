import { createAuthenticatedClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function PrintLayout({
    children,
}: {
    children: React.ReactNode
}) {
    await createAuthenticatedClient()

    return (
        <div className="print-root">
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    /* Ocultar Toaster y otros elementos del RootLayout */
                    body > *:not(.print-root) {
                        display: none !important;
                    }
                }
                `
            }} />
            {children}
        </div>
    )
}
