---
trigger: always_on
---

CONTEXTO DE LA EMPRESA
Pauleta Canaria S.L. es una empresa canaria dedicada a la producción y venta de helados de fruta (polos/paletas). Opera desde una fábrica alquilada y vende a clientes B2B (hoteles, supermercados, cooperativas, guachinches, etc.).
Datos fiscales

CIF: B70853163
Cuenta bancaria: ES96 3058 6109 1427 2001 9948 (Cajamar)
Régimen fiscal: IGIC (Canarias, 7%)

Productos actuales
Sabores: Mango, Fresa, Frutos Rojos, Pera Piña, Kiwi Manzana Uva, Melón

Clientes principales
Allday Stores SL
Origen Hookah (Guachinche Motor Grande)
Supergolf SL
Cooperativa de Autotaxis de Mogán
Ocio Tablero S.L.
Estación Autopista Sur 77177 SL
Estación Juan Grande Pk 42 SL
Hocisa Costa Canaria S.L.U.
María José Martínez Pereira
María del Rocío Álvarez Conejo
(y otros)


OBJETIVO DEL PROYECTO
Desarrollar un portal web de gestión empresarial completo para Pauleta Canaria que centralice todas las operaciones del negocio, eliminando la dependencia de Holded/QuickBooks y hojas de cálculo.

STACK TECNOLÓGICO REQUERIDO
CapaTecnologíaJustificaciónFrontendNext.js 14 (App Router) + React 18SSR, rendimiento, escalabilidadEstilosTailwind CSS + shadcn/uiUI profesional, componentes accesiblesBackendNext.js API Routes + Server ActionsSimplicidad, mismo proyectoBase de datosSupabase (PostgreSQL)Gratis hasta 500MB, Auth incluido, tiempo realAutenticaciónSupabase AuthIntegrado, seguroAlmacenamientoSupabase StoragePara logos, PDFs de facturasEmailResendYa configurado (re_...)DespliegueVercelYa tiene cuenta configuradaDominiopauleta.vercel.app (o dominio propio)

MÓDULOS A DESARROLLAR (por orden de prioridad)
FASE 1: Core (MVP)
1.1 🔐 Autenticación y configuración

Login con email/password
Datos de la empresa (nombre, CIF, dirección, logo, cuenta bancaria)
Configuración de series de facturación
Usuarios y roles (admin, empleado)

1.2 👥 Gestión de Clientes

CRUD completo de clientes
Campos: nombre/razón social, CIF/NIF, dirección, email, teléfono, persona de contacto
Historial de compras por cliente
Saldo pendiente de cobro

1.3 📦 Gestión de Productos

CRUD de productos
Campos: nombre, descripción, precio unitario, unidad de medida, IGIC aplicable
Categorías (sabores)
Control de stock básico (opcional fase 1)

1.4 🧾 Facturación

Crear facturas con selección de cliente y productos
Numeración automática (F250001, F250002...)
Cálculo automático de base imponible, IGIC (7%), total
Estados: borrador, emitida, cobrada, anulada
Generar PDF profesional con logo
Enviar factura por email al cliente
Convertir factura a albarán (funcionalidad ya desarrollada previamente)

1.5 📄 Albaranes de entrega

Generar desde factura o independiente
PDF optimizado para impresión A4
Fecha de servicio editable


FASE 2: Control financiero
2.1 💰 Tesorería / Cobros

Registrar cobros (asociar a factura)
Métodos de pago: transferencia, efectivo, Bizum, tarjeta
Facturas pendientes de cobro
Alertas de facturas vencidas

2.2 📅 Pagos fijos (ya desarrollado)

Integrar el sistema de notificaciones existente
Panel visual para ver/editar pagos programados
Historial de notificaciones enviadas

2.3 📊 Dashboard principal

Facturación del mes vs mes anterior
Cobros pendientes totales
Pagos próximos (próximos 7 días)
Top 5 clientes por facturación
Gráfico de evolución mensual


FASE 3: Avanzado
3.1 📈 Informes y estadísticas

Ventas por cliente (período seleccionable)
Ventas por producto
Comparativa mensual/anual
Exportar a Excel

3.2 🏭 Control de producción (opcional)

Registro de lotes de producción
Costes de materia prima
Cálculo de márgenes

3.3 📱 PWA / App móvil

Hacer la web instalable como app
Notificaciones push


MODELO DE BASE DE DATOS (Supabase/PostgreSQL)
sql-- Empresa (configuración)
CREATE TABLE empresa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  cif VARCHAR(20),
  direccion TEXT,
  telefono VARCHAR(20),
  email VARCHAR(255),
  cuenta_bancaria VARCHAR(34),
  logo_url TEXT,
  serie_factura VARCHAR(10) DEFAULT 'F',
  ultimo_num_factura INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Usuarios
CREATE TABLE usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  nombre VARCHAR(255),
  email VARCHAR(255),
  rol VARCHAR(20) DEFAULT 'empleado', -- admin, empleado
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clientes
CREATE TABLE clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  cif VARCHAR(20),
  direccion TEXT,
  codigo_postal VARCHAR(10),
  ciudad VARCHAR(100),
  provincia VARCHAR(100),
  telefono VARCHAR(20),
  email VARCHAR(255),
  persona_contacto VARCHAR(255),
  notas TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Productos
CREATE TABLE productos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  precio DECIMAL(10,2) NOT NULL,
  unidad VARCHAR(20) DEFAULT 'unidad', -- unidad, kg, caja
  igic DECIMAL(4,2) DEFAULT 7.00,
  categoria VARCHAR(100),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Facturas
CREATE TABLE facturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero VARCHAR(20) NOT NULL UNIQUE,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  cliente_id UUID REFERENCES clientes(id),
  base_imponible DECIMAL(10,2) NOT NULL,
  igic DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  estado VARCHAR(20) DEFAULT 'borrador', -- borrador, emitida, cobrada, anulada
  fecha_vencimiento DATE,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Líneas de factura
CREATE TABLE lineas_factura (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factura_id UUID REFERENCES facturas(id) ON DELETE CASCADE,
  producto_id UUID REFERENCES productos(id),
  descripcion VARCHAR(255),
  cantidad DECIMAL(10,2) NOT NULL,
  precio_unitario DECIMAL(10,2) NOT NULL,
  igic DECIMAL(4,2) DEFAULT 7.00,
  subtotal DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cobros
CREATE TABLE cobros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  factura_id UUID REFERENCES facturas(id),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  importe DECIMAL(10,2) NOT NULL,
  metodo VARCHAR(50), -- transferencia, efectivo, bizum, tarjeta
  referencia VARCHAR(100),
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pagos fijos programados
CREATE TABLE pagos_fijos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  concepto VARCHAR(255) NOT NULL,
  dia_inicio INTEGER NOT NULL,
  dia_fin INTEGER NOT NULL,
  importe DECIMAL(10,2) NOT NULL,
  variable BOOLEAN DEFAULT false,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Historial de notificaciones
CREATE TABLE notificaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo VARCHAR(50), -- pago_proximo, factura_vencida
  mensaje TEXT,
  enviada BOOLEAN DEFAULT false,
  fecha_envio TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## ESTRUCTURA DE CARPETAS DEL PROYECTO
```
pauleta-dashboard/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx (sidebar + header)
│   │   ├── page.tsx (dashboard principal)
│   │   ├── clientes/
│   │   │   ├── page.tsx (listado)
│   │   │   ├── nuevo/page.tsx
│   │   │   └── [id]/page.tsx (editar)
│   │   ├── productos/
│   │   │   ├── page.tsx
│   │   │   ├── nuevo/page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── facturas/
│   │   │   ├── page.tsx
│   │   │   ├── nueva/page.tsx
│   │   │   ├── [id]/page.tsx
│   │   │   └── [id]/pdf/route.ts (generar PDF)
│   │   ├── cobros/
│   │   │   └── page.tsx
│   │   ├── pagos-fijos/
│   │   │   └── page.tsx
│   │   ├── informes/
│   │   │   └── page.tsx
│   │   └── configuracion/
│   │       └── page.tsx
│   ├── api/
│   │   ├── cron/
│   │   │   └── check-pagos/route.ts
│   │   └── webhook/
│   │       └── route.ts
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/ (shadcn components)
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── MobileNav.tsx
│   ├── clientes/
│   │   ├── ClienteForm.tsx
│   │   └── ClientesTable.tsx
│   ├── facturas/
│   │   ├── FacturaForm.tsx
│   │   ├── FacturasTable.tsx
│   │   └── FacturaPDF.tsx
│   └── dashboard/
│       ├── StatsCards.tsx
│       ├── RecentInvoices.tsx
│       └── UpcomingPayments.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   ├── utils.ts
│   ├── pdf.ts (generación de PDFs)
│   └── email.ts (envío con Resend)
├── hooks/
│   ├── useClientes.ts
│   ├── useFacturas.ts
│   └── useAuth.ts
├── types/
│   └── index.ts (tipos TypeScript)
├── public/
│   └── logo-pauleta.png
├── .env.local
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vercel.json

DISEÑO UI/UX
Paleta de colores sugerida

Primario: #2563EB (azul profesional)
Secundario: #10B981 (verde éxito/cobrado)
Alerta: #F59E0B (amarillo pendiente)
Error: #EF4444 (rojo vencido/anulado)
Fondo: #F8FAFC
Texto: #1E293B

Componentes principales

Sidebar fijo en desktop, drawer en móvil
Tablas con paginación, búsqueda y filtros
Formularios con validación en tiempo real
Modales para confirmaciones
Toasts para feedback de acciones
Skeleton loaders mientras carga


VARIABLES DE ENTORNO NECESARIAS
env# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Resend (email)
RESEND_API_KEY=re_xxxxx

# App
NEXT_PUBLIC_APP_URL=https://pauleta-dashboard.vercel.app

# Cron secret
CRON_SECRET=tu_clave_secreta_larga

INSTRUCCIONES DE DESARROLLO

Empezar por la autenticación - Sin esto no hay seguridad
Crear el layout (sidebar + header) - Base visual para todo
CRUD de clientes - Necesario para facturar
CRUD de productos - Necesario para facturar
Sistema de facturación - Core del negocio
Generación de PDF - Para entregar/enviar facturas
Dashboard - Vista general
Integrar pagos fijos - Ya existe, solo adaptar
Informes - Valor añadido


ENTREGABLES ESPERADOS

✅ Código fuente completo en GitHub
✅ Base de datos configurada en Supabase
✅ Despliegue funcional en Vercel
✅ Documentación de uso básica
✅ Usuario admin creado para acceso inicial


INFORMACIÓN ADICIONAL DEL PROPIETARIO

Nombre: Jonay
Email: jonaypc@gmail.com
Teléfono: +34 677 235 930
Ubicación: Las Palmas de Gran Canaria, Canarias
Tiene un hijo de 3 años: Jordan
Otra empresa: (tiene dos negocios)


PREGUNTAS A RESOLVER ANTES DE EMPEZAR

¿CIF exacto de Pauleta Canaria S.L.?
¿Dirección fiscal completa?
¿Catálogo completo de productos con precios?
¿Serie de facturación actual? (ej: van por la F2500XX)
¿Logo en alta resolución?
¿Deseas dominio propio (ej: gestion.pauletacanaria.es)?


Este prompt está diseñado para ser usado en Claude para desarrollar el proyecto de forma iterativa, módulo por módulo.