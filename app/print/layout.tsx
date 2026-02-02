export default function PrintLayout({
    children,
}: {
    children: React.ReactNode
}) {
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
