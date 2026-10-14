import type { Cliente } from "@/types"

type CustomerDelivery = Pick<
    Cliente,
    "nombre" | "persona_contacto" | "direccion_entrega" |
    "cp_entrega" | "ciudad_entrega" | "provincia_entrega"
>

/**
 * Default delivery data for a new invoice. The customer keeps the canonical
 * address; invoices store a snapshot that can be manually overridden.
 */
export function getInvoiceDeliveryDefaults(cliente: CustomerDelivery | null | undefined) {
    if (!cliente) return { establecimiento: "", direccion: "" }

    const street = cliente.direccion_entrega?.trim() || ""
    const cityLine = [
        [cliente.cp_entrega?.trim(), cliente.ciudad_entrega?.trim()].filter(Boolean).join(" "),
        cliente.provincia_entrega?.trim() ? `(${cliente.provincia_entrega.trim()})` : "",
    ].filter(Boolean).join(" ")

    const direccion = [street, cityLine].filter(Boolean).join(", ")

    return {
        // The establishment/contact label is meaningful only when a separate
        // delivery location is configured on the customer.
        establecimiento: direccion
            ? (cliente.persona_contacto?.trim() || cliente.nombre?.trim() || "")
            : "",
        direccion,
    }
}
