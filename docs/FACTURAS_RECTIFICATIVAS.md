# Facturas Rectificativas (Abonos / Devoluciones)

## Qué es una factura rectificativa

Una **factura rectificativa** (también llamada abono o nota de crédito) es un documento contable que corrige o anula total o parcialmente una factura previamente emitida.

En tu caso de la cadena de supermercados que devuelve mercancía, es el método legal y fiscalmente correcto para:
1. Documentar la devolución de mercancía
2. Ajustar la facturación del mes
3. Reducir el importe que te debe el cliente

## Normativa aplicable

Según el **Real Decreto 1619/2012** (Reglamento de Facturación), las facturas rectificativas deben:
- Hacer referencia a la factura original que rectifican
- Incluir el motivo de la rectificación
- Estar numeradas con la serie normal (no son facturas "especiales")
- Conservar toda la información de facturación habitual

## Cómo crear una factura rectificativa

### Paso 1: Acceder a la factura original
1. Ve a **Facturas** en el menú
2. Busca la factura del mes de abril que corresponda a la tienda que devuelve mercancía
3. Haz clic en el número de factura para ver el detalle

### Paso 2: Crear la rectificativa
1. En la página de detalle de la factura, verás el botón **"Crear Rectificativa"**
   - Solo aparece para facturas emitidas o cobradas
   - No aparece para facturas en borrador o anuladas
   - No aparece si la factura ya es una rectificativa (no se pueden rectificar rectificativas)

2. Haz clic en **"Crear Rectificativa"**

### Paso 3: Configurar la rectificativa

#### A. Seleccionar el motivo
Puedes elegir uno de los motivos predefinidos:
- **Devolución de mercancía** ← El tuyo
- Error en la facturación
- Descuento posterior
- Modificación de base imponible
- Duplicado

O escribir un motivo personalizado.

#### B. Especificar las líneas a rectificar

Para cada producto de la factura original:
1. **Cantidad a rectificar**: Introduce la cantidad con **signo negativo**
   - Ejemplo: Si vendiste 100 polos y te devuelven 50, pon `-50`
   - El negativo indica que es una devolución
   
2. **Precio unitario**: Se rellena automáticamente con el precio de la factura original
   - Puedes modificarlo si el precio ha cambiado

3. **Botón "Devolución completa"**: Si todas las líneas se devuelven al 100%, este botón rellena automáticamente todas las cantidades con valores negativos

### Paso 4: Revisar y crear

1. Revisa que los datos sean correctos
2. Haz clic en **"Crear Factura Rectificativa"**
3. Se generará automáticamente:
   - Nueva factura con número correlativo de tu serie
   - Estado: **Emitida** automáticamente
   - Importes negativos (restará de tu facturación)
   - Referencia a la factura original

## Ejemplo práctico: Tu caso

### Situación
- Cliente: Cadena de supermercados (4 tiendas, mismo CIF)
- Mes de venta: Abril 2026
- Facturas emitidas: Una por tienda (o consolidada mensual)
- Devolución: 2 tiendas devuelven mercancía en agosto

### Proceso correcto

1. **Identifica las facturas**:
   - Busca las facturas de abril de las 2 tiendas que devuelven
   - Si hiciste una factura consolidada mensual, úsala como base

2. **Crea una rectificativa por cada factura**:
   - Factura Tienda A (Abril): Crea rectificativa con productos devueltos
   - Factura Tienda B (Abril): Crea rectificativa con productos devueltos

3. **Completa los datos**:
   ```
   Motivo: "Devolución de mercancía - producto sin rotación"
   
   Líneas:
   - Polo Mango 100ml: Cantidad -24 (devuelven 24 unidades)
   - Polo Fresa 100ml: Cantidad -12 (devuelven 12 unidades)
   ```

4. **Resultado fiscal**:
   - La factura rectificativa se emite en **agosto** (fecha actual)
   - Hace referencia a la factura de **abril** (fecha original)
   - El importe negativo se descuenta de la facturación de agosto
   - En tu modelo 415 (IGIC), declaras ambas: la original en T1 y la rectificativa en T3

## Impacto en el sistema

### Stock
✅ Se ajusta automáticamente:
- La factura original **restó** stock cuando se emitió
- La rectificativa **suma** stock al crearse (cantidades negativas = entrada)

### Facturación
- **Total facturado**: Incluye las rectificativas (con importes negativos)
- **Informes financieros**: Calculan correctamente el neto
- **Dashboard**: Muestra el impacto real en la facturación del mes

### Relación con cobros
- Si la factura original está cobrada, la rectificativa genera un **saldo a favor del cliente**
- Puedes:
  - Devolverle el dinero
  - Descontarlo de la siguiente factura
  - Registrar un cobro negativo para cuadrar cuentas

## Presentación al cliente

### Documento PDF
La factura rectificativa se genera en PDF con:
- Encabezado: **"FACTURA RECTIFICATIVA"** (en rojo)
- Referencia: "Rectifica: FC-XXXX del DD/MM/AAAA"
- Motivo destacado en rojo
- Importes negativos claramente visibles

### Envío
Puedes enviarla por email igual que una factura normal:
- Botón "Enviar Email" en la página de detalle
- Se adjunta el PDF automáticamente
- El tracking funciona igual

## Vista en el listado de facturas

Las facturas rectificativas se identifican con:
- Badge rojo: **"Rect."** junto al número
- Importes negativos en la columna de total
- Mismo estado que las ordinarias (emitida/cobrada)

## Consultas SQL útiles

Si necesitas exportar datos para contabilidad:

```sql
-- Ver todas las rectificativas de un mes
SELECT 
  numero,
  fecha,
  total,
  motivo_rectificacion,
  (SELECT numero FROM facturas WHERE id = factura_rectificada_id) as factura_original
FROM facturas
WHERE tipo_factura = 'rectificativa'
  AND fecha >= '2026-08-01'
  AND fecha < '2026-09-01';

-- Ver total neto de una factura (original + rectificativas)
SELECT get_total_neto_factura('factura_id_aqui');

-- Ver facturas con sus rectificativas asociadas
SELECT * FROM v_facturas_con_rectificativas
WHERE fecha >= '2026-04-01';
```

## Restricciones del sistema

❌ **No puedes**:
- Crear una rectificativa de una factura en borrador
- Crear una rectificativa de otra rectificativa
- Eliminar una factura si tiene rectificativas asociadas
- Eliminar una factura con cobros registrados

✅ **Puedes**:
- Hacer rectificativas parciales (solo algunas líneas)
- Hacer múltiples rectificativas de la misma factura
- Rectificar facturas cobradas
- Rectificar precios (no solo cantidades)

## Fiscalidad - Modelo 415 (IGIC)

En tu declaración trimestral del IGIC:
- **Casilla T1**: Facturación ordinaria (positiva)
- **Casilla T3**: Modificaciones de base imponible (rectificativas)

Las rectificativas se declaran en el trimestre en que se emiten, no en el de la factura original.

## ¿Necesitas ayuda?

- Documentación normativa: [Real Decreto 1619/2012](https://www.boe.es/buscar/act.php?id=BOE-A-2012-14696)
- Consultas AEAT Canarias: [Sede Electrónica](https://sede.agenciatributariacanaria.org/)
- Soporte técnico: GitHub Issues del proyecto
