const assert = require("node:assert/strict")
const { test } = require("node:test")
const ts = require("typescript")
const fs = require("node:fs")
const path = require("node:path")

const src = fs.readFileSync(path.resolve(__dirname, "../lib/invoice-delivery.ts"), "utf8")
const compiled = ts.transpileModule(src, {
    compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
    },
}).outputText
const moduleWrapper = { exports: {} }
new Function("module", "exports", compiled)(moduleWrapper, moduleWrapper.exports)
const { getInvoiceDeliveryDefaults, resolveInvoiceDelivery } = moduleWrapper.exports

test("copies the customer delivery address into a new invoice", () => {
    const customer = {
        nombre: "Distribuidor",
        persona_contacto: "Estación Mogán",
        direccion_entrega: "Ctra. Vieja, 87",
        cp_entrega: "35139",
        ciudad_entrega: "Mogán",
        provincia_entrega: "Las Palmas",
    }
    assert.deepEqual(getInvoiceDeliveryDefaults(customer), {
        establecimiento: "Estación Mogán",
        direccion: "Ctra. Vieja, 87, 35139 Mogán (Las Palmas)",
    })
})

test("falls back to the customer name when only an address was configured", () => {
    assert.deepEqual(getInvoiceDeliveryDefaults({
        nombre: "Comercio",
        persona_contacto: null,
        direccion_entrega: "Calle Mayor, 1",
        cp_entrega: null,
        ciudad_entrega: null,
        provincia_entrega: null,
    }), { establecimiento: "Comercio", direccion: "Calle Mayor, 1" })
})

test("shows configured establishment even when the customer has no street address", () => {
    assert.deepEqual(getInvoiceDeliveryDefaults({
        nombre: "Cliente fiscal",
        persona_contacto: "Tienda / punto de entrega",
        direccion_entrega: null,
        cp_entrega: null,
        ciudad_entrega: null,
        provincia_entrega: null,
    }), { establecimiento: "Tienda / punto de entrega", direccion: "" })
})

test("does not invent a delivery location when neither site nor address is configured", () => {
    assert.deepEqual(getInvoiceDeliveryDefaults({
        nombre: "Cliente fiscal",
        persona_contacto: null,
        direccion_entrega: null,
        cp_entrega: null,
        ciudad_entrega: null,
        provincia_entrega: null,
    }), { establecimiento: "", direccion: "" })
    assert.deepEqual(getInvoiceDeliveryDefaults(undefined), { establecimiento: "", direccion: "" })
})

test("supports partial delivery address fields", () => {
    assert.deepEqual(getInvoiceDeliveryDefaults({
        nombre: "Farmacia",
        persona_contacto: null,
        direccion_entrega: null,
        cp_entrega: "35100",
        ciudad_entrega: "San Bartolomé de Tirajana",
        provincia_entrega: null,
    }), { establecimiento: "Farmacia", direccion: "35100 San Bartolomé de Tirajana" })
})

test("historical invoices with empty delivery columns use the original customer card", () => {
    const customer = {
        nombre: "Empresa distribuidora",
        persona_contacto: "Sucursal Costa",
        direccion_entrega: "Calle de la Costa 4",
        cp_entrega: "35100",
        ciudad_entrega: "Maspalomas",
        provincia_entrega: "Las Palmas",
    }
    assert.deepEqual(resolveInvoiceDelivery(customer, {
        establecimiento_entrega: null,
        direccion_entrega_factura: null,
    }), {
        establecimiento: "Sucursal Costa",
        direccion: "Calle de la Costa 4, 35100 Maspalomas (Las Palmas)",
        visible: true,
    })
})

test("invoice overrides never change the original customer's delivery address", () => {
    const customer = {
        nombre: "Distribuidor",
        persona_contacto: "Sucursal habitual",
        direccion_entrega: "Calle Original 1",
        cp_entrega: "35000",
        ciudad_entrega: "Las Palmas",
        provincia_entrega: null,
    }
    assert.deepEqual(resolveInvoiceDelivery(customer, {
        establecimiento_entrega: "Punto eventual",
        direccion_entrega_factura: "Puerto 7",
    }), { establecimiento: "Punto eventual", direccion: "Puerto 7", visible: true })
    assert.equal(customer.direccion_entrega, "Calle Original 1")
})

test("existing invoices with contact-only customers still show the delivery column", () => {
    assert.deepEqual(resolveInvoiceDelivery({
        nombre: "Empresa farmacia",
        persona_contacto: "Farmacia centro",
        direccion_entrega: "",
        cp_entrega: "",
        ciudad_entrega: "",
        provincia_entrega: "",
    }, {}), { establecimiento: "Farmacia centro", direccion: "", visible: true })
})

test("truly unconfigured customers do not get an empty delivery panel", () => {
    assert.deepEqual(resolveInvoiceDelivery({
        nombre: "Empresa sin punto de entrega",
        persona_contacto: null,
        direccion_entrega: null,
        cp_entrega: null,
        ciudad_entrega: null,
        provincia_entrega: null,
    }, {}), { establecimiento: "", direccion: "", visible: false })
})
