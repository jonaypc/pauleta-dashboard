# 🔍 Diagnóstico: Por qué no veo el botón "Crear Rectificativa"

## ✅ Checklist de verificación

Marca lo que ya comprobaste:

### 1. Migración ejecutada
- [ ] Ejecuté `fix-tipo-factura.sql` en Supabase SQL Editor
- [ ] Vi el resultado mostrando que se actualizaron las facturas
- [ ] La query de verificación muestra `tipo_factura = 'ordinaria'` para todas

### 2. Código desplegado
- [ ] Los cambios están en GitHub (commit 0fae5d0)
- [ ] Vercel desplegó automáticamente (verifica en dashboard.vercel.com)
- [ ] Esperé al menos 2-3 minutos después del push

### 3. Caché limpiado
- [ ] Presioné Ctrl+Shift+R (recarga forzada)
- [ ] Probé en ventana de incógnito
- [ ] Probé desde otro dispositivo (iPad)

### 4. Página correcta
- [ ] Estoy en el DETALLE de la factura (URL termina en `/facturas/uuid-largo`)
- [ ] NO estoy en el listado (`/facturas`)
- [ ] Veo toda la info: cliente, líneas, totales

### 5. Estado de la factura
- [ ] La factura está **Emitida** o **Cobrada** (no Borrador/Anulada)
- [ ] Tiene un badge verde/azul arriba

---

## 🧪 Test rápido con consola del navegador

Abre la consola (F12) y pega esto:

```javascript
// Verificar si el componente está cargado
console.log('CrearRectificativaDialog:', typeof window);

// Ver qué datos tiene la factura
const facturaData = document.querySelector('[data-factura-id]');
console.log('Factura en página:', facturaData);
```

---

## 📊 Verificación SQL en Supabase

Ejecuta esto para ver el estado real de tus facturas:

```sql
-- Ver facturas que DEBERÍAN mostrar el botón
SELECT 
  numero,
  fecha,
  estado,
  tipo_factura,
  CASE 
    WHEN estado IN ('emitida', 'cobrada') AND (tipo_factura IS NULL OR tipo_factura = 'ordinaria')
    THEN '✅ Debería mostrar botón'
    ELSE '❌ NO muestra botón'
  END as debe_mostrar_boton
FROM facturas
ORDER BY fecha DESC
LIMIT 10;
```

---

## 🚨 Si NADA de lo anterior funciona

Entonces el problema puede ser:

### Opción A: El componente no se importó correctamente

Verifica que en la página veas esto en el código fuente:
1. Click derecho → Ver código fuente
2. Busca (Ctrl+F): `CrearRectificativaDialog`
3. ¿Lo encuentras? → El componente está cargado
4. ¿No lo encuentras? → Vercel no desplegó correctamente

### Opción B: Hay un error de JavaScript

1. Abre consola (F12)
2. Pestaña "Console"
3. ¿Ves errores en rojo?
4. Copia y pégame los errores

### Opción C: El build falló en Vercel

1. Ve a [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Busca tu proyecto "pauleta-dashboard"
3. Click en el último deployment
4. ¿Está en verde (Success) o rojo (Failed)?

---

## 🛠️ Solución temporal: Crear manualmente

Si necesitas crear la rectificativa URGENTEMENTE mientras arreglamos esto:

```sql
-- SOLO úsalo si es URGENTE, mejor esperar al fix
-- Reemplaza los valores entre < >

-- 1. Obtener el siguiente número de factura
SELECT 
  serie_factura || LPAD((ultimo_num_factura + 1)::TEXT, 4, '0') as siguiente_numero
FROM empresa;

-- 2. Crear la factura rectificativa manualmente
INSERT INTO facturas (
  numero,
  fecha,
  cliente_id,
  base_imponible,
  igic,
  total,
  estado,
  tipo_factura,
  factura_rectificada_id,
  motivo_rectificacion,
  notas
) VALUES (
  '<NUMERO_DEL_PASO_1>',  -- Ej: 'FC-0234'
  CURRENT_DATE,
  '<UUID_DEL_CLIENTE>',   -- UUID del cliente
  -100.00,                -- Base imponible NEGATIVA
  -7.00,                  -- IGIC negativo
  -107.00,                -- Total negativo
  'emitida',
  'rectificativa',
  '<UUID_FACTURA_ORIGINAL>', -- UUID de la factura que rectificas
  'Devolución de mercancía',
  'Factura rectificativa creada manualmente - devolución supermercado'
);

-- 3. Añadir las líneas (repite para cada producto devuelto)
INSERT INTO lineas_factura (
  factura_id,
  producto_id,
  descripcion,
  cantidad,
  precio_unitario,
  igic,
  subtotal
) VALUES (
  '<UUID_FACTURA_RECIEN_CREADA>',
  '<UUID_PRODUCTO>',
  'Polo Mango 100ml',
  -24,              -- Cantidad NEGATIVA
  2.50,             -- Precio unitario
  7,                -- % IGIC
  -64.20            -- Subtotal negativo (incluye IGIC)
);

-- 4. Actualizar contador en empresa
UPDATE empresa
SET ultimo_num_factura = ultimo_num_factura + 1;
```

**⚠️ IMPORTANTE**: Esto es solo si necesitas la rectificativa HOY mismo y no puede esperar.

---

## 📞 Siguiente paso

Dime cuál de estas situaciones es la tuya:

1. **"Vercel aún no desplegó"** → Espera 5 minutos más
2. **"Hay errores en la consola"** → Pégame los errores
3. **"El componente no está en el código fuente"** → Forzamos redeploy
4. **"Necesito la rectificativa YA, no puedo esperar"** → Usamos SQL manual
