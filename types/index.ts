// ===========================================
// TIPOS PARA PAULETA CANARIA DASHBOARD
// ===========================================

// Estados de factura
export type EstadoFactura = 'borrador' | 'emitida' | 'cobrada' | 'anulada'

// Métodos de pago
export type MetodoPago = 'transferencia' | 'efectivo' | 'bizum' | 'tarjeta'

// Roles de usuario
export type RolUsuario = 'admin' | 'empleado'

// Unidades de medida
export type UnidadMedida = 'unidad' | 'caja' | 'kg'

// ===========================================
// ENTIDADES PRINCIPALES
// ===========================================

export interface Empresa {
  id: string
  nombre: string
  cif: string | null
  direccion: string | null
  codigo_postal: string | null
  ciudad: string | null
  provincia: string | null
  telefono: string | null
  email: string | null
  cuenta_bancaria: string | null
  logo_url: string | null
  serie_factura: string
  ultimo_num_factura: number
  igic_default: number
  color_primario?: string
  texto_pie?: string
  mostrar_logo?: boolean
  logo_width?: number
  titulo_font_size?: number
  bank_font_size?: number
  footer_bottom_fixed?: boolean
  created_at: string
  updated_at?: string
}

export interface Usuario {
  id: string
  nombre: string | null
  email: string
  rol: RolUsuario
  activo: boolean
  created_at: string
}

export interface Cliente {
  id: string
  nombre: string
  cif: string | null
  direccion: string | null
  codigo_postal: string | null
  ciudad: string | null
  provincia: string | null
  telefono: string | null
  email: string | null
  persona_contacto: string | null
  notas: string | null
  activo: boolean
  created_at: string
  updated_at: string
}

export interface Producto {
  id: string
  nombre: string
  descripcion: string | null
  precio: number
  unidad: UnidadMedida
  igic: number
  categoria: string | null
  stock: number
  stock_minimo: number
  multiplicador_stock: number
  vinculado_a_id: string | null
  activo: boolean
  codigo_barras?: string | null
  created_at: string
}

export interface Factura {
  id: string
  numero: string
  fecha: string
  cliente_id: string
  base_imponible: number
  igic: number
  total: number
  estado: EstadoFactura
  fecha_vencimiento: string | null
  notas: string | null
  created_at: string
  updated_at: string
  // Relaciones
  cliente?: Cliente
  lineas?: LineaFactura[]
  cobros?: Cobro[]
}

export interface LineaFactura {
  id: string
  factura_id: string
  producto_id: string | null
  descripcion: string
  cantidad: number
  precio_unitario: number
  igic: number
  subtotal: number
  es_intercambio?: boolean
  producto_devuelto_id?: string | null
  motivo_devolucion?: string | null
  created_at: string
  // Relaciones
  producto?: Producto
}

export interface Cobro {
  id: string
  factura_id: string
  fecha: string
  importe: number
  metodo: MetodoPago | null
  referencia: string | null
  notas: string | null
  created_at: string
  // Relaciones
  factura?: Factura
}

export interface PagoFijo {
  id: string
  concepto: string
  dia_inicio: number
  dia_fin: number
  importe: number
  variable: boolean
  activo: boolean
  created_at: string
}

export interface Notificacion {
  id: string
  tipo: 'pago_proximo' | 'factura_vencida' | 'factura_emitida' | 'cobro_registrado'
  mensaje: string
  enviada: boolean
  fecha_envio: string | null
  created_at: string
}

// ===========================================
// TIPOS PARA FORMULARIOS
// ===========================================

export interface ClienteFormData {
  nombre: string
  cif?: string
  direccion?: string
  codigo_postal?: string
  ciudad?: string
  provincia?: string
  telefono?: string
  email?: string
  persona_contacto?: string
  notas?: string
}

export interface ProductoFormData {
  nombre: string
  descripcion?: string
  precio: number
  unidad: UnidadMedida
  igic: number
  categoria?: string
  stock?: number
  stock_minimo?: number
  multiplicador_stock?: number
  vinculado_a_id?: string | null
  codigo_barras?: string
}

export interface FacturaFormData {
  cliente_id: string
  fecha: string
  fecha_vencimiento?: string
  notas?: string
  lineas: LineaFacturaFormData[]
}

export interface LineaFacturaFormData {
  producto_id?: string
  descripcion: string
  cantidad: number
  precio_unitario: number
  igic: number
  es_intercambio?: boolean
  producto_devuelto_id?: string
  motivo_devolucion?: string
}

export interface CobroFormData {
  factura_id: string
  fecha: string
  importe: number
  metodo: MetodoPago
  referencia?: string
  notas?: string
}

export interface PagoFijoFormData {
  concepto: string
  dia_inicio: number
  dia_fin: number
  importe: number
  variable: boolean
}

// ===========================================
// TIPOS PARA DASHBOARD/ESTADÍSTICAS
// ===========================================

export interface DashboardStats {
  facturacionMes: number
  facturacionMesAnterior: number
  cobrosPendientes: number
  facturasEmitidas: number
  facturasPendientes: number
  proximosPagos: PagoFijo[]
  topClientes: TopCliente[]
  evolucionMensual: EvolucionMensual[]
}

export interface TopCliente {
  cliente_id: string
  nombre: string
  total_facturado: number
  num_facturas: number
}

export interface EvolucionMensual {
  mes: string
  facturacion: number
  cobros: number
}

// ===========================================
// TIPOS PARA API/RESPUESTAS
// ===========================================

export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ===========================================
// TIPOS PARA FILTROS
// ===========================================

export interface FiltrosFactura {
  estado?: EstadoFactura
  cliente_id?: string
  fecha_desde?: string
  fecha_hasta?: string
  busqueda?: string
}

export interface FiltrosCliente {
  activo?: boolean
  busqueda?: string
}

// ===========================================
// TIPOS PARA PDF
// ===========================================

export interface FacturaPDFData {
  empresa: Empresa
  factura: Factura
  cliente: Cliente
  lineas: LineaFactura[]
}

export interface AlbaranPDFData {
  empresa: Empresa
  factura: Factura
  cliente: Cliente
  lineas: LineaFactura[]
  fecha_servicio: string
}
