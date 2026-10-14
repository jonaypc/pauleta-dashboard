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
const { getInvoiceDeliveryDefaults } = moduleWrapper.exports

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

test("does not invent a delivery location when none is configured", () => {
    assert.deepEqual(getInvoiceDeliveryDefaults({
        nombre: "Cliente fiscal",
        persona_contacto: "Responsable de compras",
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
