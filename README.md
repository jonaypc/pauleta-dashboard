# 🍦 Pauleta Canaria - Portal de Gestión

Portal de gestión empresarial completo para **Pauleta Canaria S.L.**, empresa canaria de producción y venta de helados de fruta (polos/paletas).

## 📋 Características

### ✅ Fase 1 (MVP) - Implementado
- 🔐 **Autenticación** - Login seguro con email/password
- 👥 **Gestión de Clientes** - CRUD completo con historial
- 📦 **Gestión de Productos** - Catálogo de sabores con precios
- 🧾 **Facturación** - Creación, numeración automática, estados
- 📄 **Albaranes** - Generación desde facturas
- 📊 **Dashboard** - Resumen de actividad y métricas

### 🔜 Próximas fases
- 💰 Tesorería y cobros
- 📅 Pagos fijos programados
- 📈 Informes y estadísticas
- 🏭 Control de producción

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
3. Ve a **SQL Editor** y ejecuta el contenido de `supabase/schema.sql`
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
cp .env.example .env.local
# Edita .env.local con tus credenciales de Supabase

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
- **Cuenta bancaria**: ES96 3058 6109 1427 2001 9948 (Cajamar)
- **Régimen fiscal**: IGIC 7% (Canarias)

### Productos (sabores)
1. Polo de Fresa
2. Polo de Mango
3. Polo de Frutos Rojos
4. Polo de Pera-Piña
5. Polo de Melón
6. Polo de Kiwi-Manzana-Uva

## 🔒 Seguridad

- Autenticación mediante Supabase Auth
- Row Level Security (RLS) habilitado en todas las tablas
- Tokens JWT para sesiones
- Middleware de protección de rutas

## 📄 Licencia

Proyecto privado para Pauleta Canaria S.L. © 2025

---

**Desarrollado con ❤️ para Pauleta Canaria**
