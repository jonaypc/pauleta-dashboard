# 📸 Guía Visual: Dónde crear Facturas Rectificativas

## Paso 1: Ve al listado de Facturas

1. En el menú lateral izquierdo, haz click en **"Facturas"**
2. Llegarás a la página con el listado de todas las facturas

```
URL: https://tu-dominio.vercel.app/facturas
```

---

## Paso 2: Busca la factura de abril

1. **Opción A - Filtro por fecha**:
   - En la barra superior, busca los filtros de fecha
   - Pon fecha desde: `01/04/2026`
   - Pon fecha hasta: `30/04/2026`

2. **Opción B - Filtro por cliente**:
   - Usa el desplegable "Cliente" y selecciona la cadena de supermercados

3. **Opción C - Búsqueda directa**:
   - Si recuerdas el número, búscalo en la caja de búsqueda

---

## Paso 3: Entra al DETALLE de la factura

⚠️ **IMPORTANTE**: No te quedes en la lista, debes **hacer click EN EL NÚMERO** de la factura

```
Ejemplo: Si la factura es "FC-0123", haz click en "FC-0123"
```

Esto te llevará a la página de detalle:
```
URL: https://tu-dominio.vercel.app/facturas/[id-largo-uuid]
```

---

## Paso 4: Localiza el botón "Crear Rectificativa"

En la **página de DETALLE** de la factura, arriba a la derecha verás varios botones:

```
┌─────────────────────────────────────────────────────────┐
│  [← Volver]                                             │
│                                                          │
│  FC-0123                    [Emitida]                   │
│                                                          │
│                     [Imprimir Original]  [Imprimir Copia]│
│                     [Enviar Email]       [Albarán]      │
│                     [Crear Rectificativa] ← AQUÍ        │
└─────────────────────────────────────────────────────────┘
```

El botón **"Crear Rectificativa"** tiene:
- Icono: 📄 (FileX)
- Texto: "Crear Rectificativa"
- Estilo: Botón con borde (outline)

---

## ⚠️ El botón NO aparece si:

❌ La factura está en estado **"Borrador"**
   → Solución: Emítela primero

❌ La factura está **"Anulada"**
   → No se puede rectificar una factura anulada

❌ Ya es una **factura rectificativa**
   → No se pueden rectificar las rectificativas

❌ Estás en el **LISTADO** (no en el detalle)
   → Solución: Click en el NÚMERO de la factura

---

## Paso 5: Click en "Crear Rectificativa"

Se abrirá un diálogo (ventana emergente) con:

```
┌────────────────────────────────────────────────┐
│  Crear Factura Rectificativa                  │
│  ────────────────────────────────────────────  │
│                                                 │
│  Motivo de la rectificación *                  │
│  [Devolución de mercancía]                     │
│  [Error en la facturación]                     │
│  [Descuento posterior]                         │
│  ...                                            │
│                                                 │
│  O escribe un motivo personalizado:            │
│  ┌────────────────────────────────────┐        │
│  │                                     │        │
│  └────────────────────────────────────┘        │
│                                                 │
│  Líneas a rectificar  [Devolución completa]    │
│  ┌─────────────────────────────────────────┐   │
│  │ Producto  │ Cant. │ Precio │ Rectificar│   │
│  │ Mango     │ 100   │ 2.50€  │ [    ]    │   │
│  │ Fresa     │  50   │ 2.00€  │ [    ]    │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│              [Cancelar] [Crear Factura...]     │
└────────────────────────────────────────────────┘
```

---

## Paso 6: Rellenar el formulario

### A. Motivo
Click en **"Devolución de mercancía"** (el primero)

O escribe tu propio motivo:
```
"Devolución producto sin rotación - acuerdo comercial"
```

### B. Cantidades
En cada línea que quieras rectificar, pon el número **CON SIGNO NEGATIVO**:

```
Ejemplo:
- Si vendiste 100 polos y te devuelven 50 → escribe: -50
- Si vendiste 24 polos y te devuelven todos → escribe: -24
```

⚠️ **MUY IMPORTANTE**: El signo negativo (-) es obligatorio

### C. Click "Crear Factura Rectificativa"

---

## ✅ Verificación: ¿Funcionó?

Después de crear la rectificativa, deberías:

1. **Ver la nueva factura**:
   - Te redirige automáticamente a la nueva rectificativa
   - Número nuevo (ej: FC-0234)
   - Badge rojo: "Rectificativa"
   - Total negativo (ej: -120,00 €)

2. **En el listado**:
   - Ve a Facturas
   - Verás tu nueva factura con badge "Rect." en rojo
   - Importes negativos

---

## 🐛 Problemas comunes

### "No veo el botón"
✓ Verifica que estás en el DETALLE (URL termina en `/facturas/uuid-largo`)
✓ Verifica que la factura está Emitida o Cobrada
✓ Refresca la página (Ctrl+F5)

### "No aparece el diálogo"
✓ Revisa la consola del navegador (F12)
✓ Puede haber un error de JavaScript

### "Error al crear"
✓ Verifica que pusiste cantidades con signo negativo (-)
✓ Verifica que escribiste un motivo

---

## 📞 Si aún no lo ves

Envíame:
1. Captura de pantalla de la página donde estás
2. URL de la página (copia de la barra de direcciones)
3. Estado de la factura (Borrador/Emitida/Cobrada/Anulada)
