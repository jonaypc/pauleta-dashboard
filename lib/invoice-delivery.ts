import type { Cliente } from "@/types"

type CustomerDelivery = Pick<
    Cliente,
    "nombre" | "persona_contacto" | "direccion_entrega" |
    "cp_entrega" | "ciudad_entrega" | "provincia_entrega"
>

type InvoiceDeliveryOverride = {
    establecimiento_entrega?: string | null
    direccion_entrega_factura?: string | null
}

/**
 * Delivery details come from the customer's original saved card. A specific
 * invoice can override either field, without changing the customer record.
 *
 * Many historic invoices do not have the newer invoice-level delivery columns,
 * so never require those columns to be populated before showing delivery.
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
        // In customer records, "persona_contacto" often names the delivery
        // establishment (e.g. a SPAR store), even if no street was entered.
        establecimiento: cliente.persona_contacto?.trim() ||
            (direccion ? cliente.nombre?.trim() || "" : ""),
        direccion,
    }
}

export function resolveInvoiceDelivery(
    cliente: CustomerDelivery | null | undefined,
    factura?: InvoiceDeliveryOverride | null
) {
    const defaults = getInvoiceDeliveryDefaults(cliente)
    const establecimiento = factura?.establecimiento_entrega?.trim() || defaults.establecimiento
    const direccion = factura?.direccion_entrega_factura?.trim() || defaults.direccion

    return {
        establecimiento,
        direccion,
        visible: Boolean(establecimiento || direccion),
    }
}
