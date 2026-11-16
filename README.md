# 🍦 Pauleta Canaria - Portal de Gestión

> **Aviso (16-11-2026):** Este README conserva instrucciones y descripciones de la etapa inicial del proyecto y no es un inventario actualizado de funcionalidades, tarifas o esquema. Para trabajar con Codex, leer `AGENTS.md`, `CLAUDE.md` y `docs/contexto-pauleta/INDICE.md`. El **código actual de GitHub** y los datos vigentes del ERP tienen prioridad sobre los ejemplos históricos de esta página. **No ejecutar `supabase/schema.sql` contra una base existente**: revisar migraciones realmente aplicadas y solicitar autorización.

Portal de gestión empresarial completo para **Pauleta Canaria S.L.**, empresa canaria de producción y venta de helados de fruta (polos/paletas).

## 📋 Características

### ✅ Fase 1 (MVP) - Implementado
- 🔐 **Autenticación** - Login seguro con email/password
- 👥 **Gestión de Clientes** - CRUD completo con historial
- 📦 **Gestión de Productos** - Catálogo de sabores con precios
- 🧾 **Facturación** - Creación, numeración automática, estados
- 📄 **Albaranes** - Generación desde facturas
- 📊 **Dashboard** - Resumen de actividad y métricas

### 📌 Estado de módulos
El listado siguiente de «próximas fases» quedó desactualizado: el repositorio ya contiene rutas/componentes de tesorería, cobros, pagos fijos, informes y producción. Su existencia no acredita pruebas funcionales ni estado de despliegue. Verificar cada módulo en el código y en un entorno autorizado antes de describirlo como operativo.

## 🛠️ Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | Next.js 14 (App Router) + React 18 |
| Estilos | Tailwind CSS + shadcn/ui |
| Backend | Next.js API Routes + Server Actions |
| Base de datos | Supabase (PostgreSQL) |
| Autenticación | Supabase Auth |
| Email | Resend |
| Despliegue | Vercel |

## 🚀 Despliegue Rápido

### 1. Crear proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) y crea una cuenta
2. Crea un nuevo proyecto
3. **Solo para un proyecto nuevo y aislado de prueba:** revisar el esquema y el historial de migraciones con un responsable técnico. No ejecutar `supabase/schema.sql` en la base real ni como actualización de un esquema existente.
4. Ve a **Settings > API** y copia:
   - Project URL
   - `anon` public key
   - `service_role` secret key

### 2. Crear usuario administrador

En Supabase, ve a **Authentication > Users** y crea un nuevo usuario:
- Email: `jonaypc@gmail.com` (o el que prefieras)
- Password: (elige una contraseña segura)

Luego, en SQL Editor, ejecuta:
```sql
UPDATE usuarios SET rol = 'admin' WHERE email = 'jonaypc@gmail.com';
```

### 3. Desplegar en Vercel

1. Sube el proyecto a GitHub
2. Ve a [vercel.com](https://vercel.com) e importa el repositorio
3. Configura las variables de entorno:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
NEXT_PUBLIC_APP_URL=https://tu-app.vercel.app
RESEND_API_KEY=re_xxxxx
CRON_SECRET=genera_una_clave_segura
```

4. ¡Despliega!

## 💻 Desarrollo Local

### Requisitos previos
- Node.js 18+
- npm o yarn

### Instalación

```bash
# Clonar repositorio
git clone https://github.com/tu-usuario/pauleta-dashboard.git
cd pauleta-dashboard

# Instalar dependencias
npm install

# Copiar variables de entorno
# No existe necesariamente .env.example en la versión actual.
# Crear .env.local únicamente con variables de un entorno de pruebas aislado.
# Nunca versionar secretos ni reutilizar credenciales de producción sin autorización.

# Iniciar servidor de desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 📁 Estructura del Proyecto

```
pauleta-dashboard/
├── app/
│   ├── (auth)/           # Páginas de autenticación
│   │   └── login/
│   ├── (dashboard)/      # Páginas del dashboard (protegidas)
│   │   ├── clientes/
│   │   ├── productos/
│   │   ├── facturas/
│   │   └── ...
│   └── api/              # API Routes
├── components/
│   ├── ui/               # Componentes base (shadcn/ui)
│   ├── layout/           # Sidebar, Header, etc.
│   ├── clientes/
│   ├── facturas/
│   └── dashboard/
├── lib/
│   ├── supabase/         # Clientes de Supabase
│   └── utils.ts          # Utilidades
├── hooks/                # React hooks personalizados
├── types/                # Tipos TypeScript
└── supabase/
    └── schema.sql        # Esquema de base de datos
```

## 🎨 Diseño

### Paleta de colores
- **Primario**: #2563EB (azul)
- **Éxito/Cobrado**: #10B981 (verde)
- **Alerta/Pendiente**: #F59E0B (amarillo)
- **Error/Anulado**: #EF4444 (rojo)

### Estados de factura
| Estado | Color | Descripción |
|--------|-------|-------------|
| Borrador | Gris | Factura en preparación |
| Emitida | Azul | Factura enviada al cliente |
| Cobrada | Verde | Factura pagada |
| Anulada | Rojo | Factura cancelada |

## 📝 Datos de la Empresa

- **Nombre**: Pauleta Canaria S.L.
- **CIF**: B70853163
- **Régimen fiscal**: IGIC Canarias. No aplicar un porcentaje universal: comprobar tipo de operación, producto y documento en registros actuales.

### Productos (sabores)
La lista original de esta sección era histórica. La ficha comercial de octubre de 2026 documenta **Mango, Mango-Fresa, Fresa, Pera-Piña y Frutos Rojos**; la disponibilidad actual debe verificarse en la base de datos de productos. No usar este README para modificar automáticamente el catálogo.

## 🔒 Seguridad

- Autenticación mediante Supabase Auth
- Row Level Security (RLS) habilitado en todas las tablas
- Tokens JWT para sesiones
- Middleware de protección de rutas

## 📄 Licencia

Proyecto privado para Pauleta Canaria S.L. © 2025

---

**Desarrollado con ❤️ para Pauleta Canaria**
