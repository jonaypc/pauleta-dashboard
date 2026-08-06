# Ejecutar Migración de Facturas Rectificativas

## Opción 1: Desde el Dashboard de Supabase (Recomendado)

1. Ve a [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto **Pauleta Canaria**
3. En el menú lateral, haz clic en **SQL Editor**
4. Haz clic en **+ New Query**
5. Copia y pega el contenido completo del archivo:
   ```
   supabase/migrations/20260806000000_facturas_rectificativas.sql
   ```
6. Haz clic en **Run** (o presiona Ctrl+Enter)
7. Verifica que aparezca "Success. No rows returned"

## Opción 2: Usando Supabase CLI

Si tienes Supabase CLI configurado localmente:

```bash
npx supabase db push
```

O ejecuta la migración específica:

```bash
npx supabase db execute --file supabase/migrations/20260806000000_facturas_rectificativas.sql
```

## Verificar que funcionó

Ejecuta esta consulta en el SQL Editor:

```sql
-- Verificar que las columnas se crearon
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'facturas'
  AND column_name IN ('tipo_factura', 'factura_rectificada_id', 'motivo_rectificacion', 'fecha_factura_rectificada')
ORDER BY column_name;
```

Deberías ver 4 filas (las 4 columnas nuevas).

También verifica la vista:

```sql
-- Verificar que la vista se creó
SELECT * FROM v_facturas_con_rectificativas LIMIT 5;
```

## Posibles errores y soluciones

### Error: "column already exists"
Esto significa que la migración ya se ejecutó. No es problema, ignora el error.

### Error: "permission denied"
Asegúrate de estar conectado con el usuario correcto en Supabase. Necesitas permisos de admin.

### Error en triggers/funciones
Si hay errores en las funciones PL/pgSQL, revisa:
1. Que todas las tablas referenciadas existan
2. Que no haya conflictos con funciones del mismo nombre

## Después de ejecutar

1. Refresca la página de tu aplicación (Ctrl+F5)
2. Ve a cualquier factura emitida
3. Deberías ver el botón **"Crear Rectificativa"**
4. Prueba con una factura de prueba antes de usar en producción

## Rollback (si algo sale mal)

Si necesitas revertir la migración:

```sql
-- Eliminar vista
DROP VIEW IF EXISTS v_facturas_con_rectificativas;

-- Eliminar función
DROP FUNCTION IF EXISTS get_total_neto_factura(UUID);

-- Eliminar trigger
DROP TRIGGER IF EXISTS tr_validar_factura_rectificativa ON facturas;

-- Eliminar función de trigger
DROP FUNCTION IF EXISTS validar_factura_rectificativa();

-- Eliminar índices
DROP INDEX IF EXISTS idx_facturas_rectificativas;
DROP INDEX IF EXISTS idx_facturas_tipo;

-- Eliminar columnas (¡OJO! Esto borra datos)
ALTER TABLE facturas 
  DROP COLUMN IF EXISTS tipo_factura,
  DROP COLUMN IF EXISTS factura_rectificada_id,
  DROP COLUMN IF EXISTS motivo_rectificacion,
  DROP COLUMN IF EXISTS fecha_factura_rectificada;
```

**Nota**: No ejecutes el rollback a menos que sea estrictamente necesario.
