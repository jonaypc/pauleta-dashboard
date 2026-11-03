// Change only the invoice status; retain the client and other active filters.
export function invoiceStatusHref(query: Record<string, string | undefined>, estado: string): string {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && key !== "page") params.set(key, value)
    }
    // An explicit empty value means Todos; omission defaults to Emitidas.
    params.set("estado", estado)
    return `/facturas?${params.toString()}`
}
