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
  fecha_servicio?: string | null
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

export interface Proveedor {
  id: string
  nombre: string
  cif: string | null
  direccion: string | null
  telefono: string | null
  email: string | null
  categoria_default: string | null
  activo: boolean
  created_at: string
}

export interface Gasto {
  id: string
  numero: string | null
  proveedor_id: string | null
  fecha: string
  fecha_vencimiento: string | null
  importe: number
  base_imponible: number
  impuestos: number
  estado: 'pendiente' | 'pagado' | 'parcial'
  metodo_pago: MetodoPago | null
  categoria: string | null
  archivo_url: string | null
  notas: string | null
  monto_pagado: number
  created_at: string
  // Relaciones
  proveedor?: Proveedor
  pagos?: PagoGasto[]
}

export interface PagoGasto {
  id: string
  gasto_id: string
  fecha: string
  importe: number
  metodo_pago: MetodoPago | null
  notas: string | null
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
// TIPOS PARA EMAIL TRACKING
// ===========================================

export type EstadoEmailTracking = 'enviado' | 'entregado' | 'abierto' | 'clickeado' | 'rebotado' | 'error'

export interface EmailTracking {
  id: string
  factura_id: string
  email_to: string
  resend_email_id: string | null
  estado: EstadoEmailTracking
  enviado_at: string
  entregado_at: string | null
  abierto_at: string | null
  abierto_count: number
  clickeado_at: string | null
  error_mensaje: string | null
  metadata: Record<string, any> | null
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
  fecha_servicio?: string
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
}

// ===========================================
// TIPOS PARA MÓDULO DE PRODUCCIÓN
// ===========================================

export type CategoriaMateriaPrima = 'fruta' | 'insumo' | 'embalaje' | 'otro'
export type UnidadMedidaMateria = 'kg' | 'litros' | 'unidades' | 'gramos' | 'ml'
export type EstadoOrdenProduccion = 'planificada' | 'en_proceso' | 'completada' | 'cancelada' | 'pausada'
export type TurnoProduccion = 'mañana' | 'tarde' | 'noche'
export type EstadoLote = 'disponible' | 'reservado' | 'vendido' | 'caducado' | 'retirado' | 'en_cuarentena'
export type TipoMovimientoInventario = 'entrada' | 'salida' | 'ajuste' | 'merma' | 'devolucion'
export type EstadoOrdenCompra = 'borrador' | 'enviada' | 'confirmada' | 'recibida_parcial' | 'recibida' | 'cancelada'
export type TipoInspeccion = 'materia_prima' | 'proceso' | 'producto_terminado'
export type ResultadoInspeccion = 'aprobado' | 'rechazado' | 'condicional' | 'en_revision'

export interface MateriaPrima {
  id: string
  codigo: string
  nombre: string
  categoria: CategoriaMateriaPrima
  unidad_medida: UnidadMedidaMateria
  stock_actual: number
  stock_minimo: number
  stock_maximo: number | null
  costo_promedio: number
  ultimo_costo: number | null
  proveedor_principal_id: string | null
  requiere_refrigeracion: boolean
  dias_caducidad: number | null
  temperatura_almacenamiento: number | null
  descripcion: string | null
  activo: boolean
  created_at: string
  updated_at: string
  // Relaciones
  proveedor?: Proveedor
}

export interface Receta {
  id: string
  producto_id: string
  nombre: string
  version: number
  descripcion: string | null
  rendimiento: number
  tiempo_preparacion: number | null
  tiempo_congelacion: number | null
  activa: boolean
  notas: string | null
  created_at: string
  updated_at: string
  // Relaciones
  producto?: Producto
  ingredientes?: RecetaIngrediente[]
}

export interface RecetaIngrediente {
  id: string
  receta_id: string
  materia_prima_id: string
  cantidad: number
  unidad: string
  costo_unitario: number | null
  es_opcional: boolean
  notas: string | null
  created_at: string
  // Relaciones
  materia_prima?: MateriaPrima
}

export interface OrdenProduccion {
  id: string
  numero: string
  producto_id: string
  receta_id: string | null
  cantidad_planificada: number
  cantidad_producida: number
  cantidad_rechazada: number
  cantidad_aprobada: number
  fecha_planificada: string
  fecha_inicio: string | null
  fecha_fin: string | null
  estado: EstadoOrdenProduccion
  prioridad: number
  operario_responsable: string | null
  turno: TurnoProduccion | null
  costo_materias_primas: number
  costo_mano_obra: number
  costo_total: number
  notas: string | null
  created_at: string
  updated_at: string
  // Relaciones
  producto?: Producto
  receta?: Receta
  lotes?: LoteProduccion[]
}

export interface LoteProduccion {
  id: string
  numero_lote: string
  orden_produccion_id: string
  producto_id: string
  cantidad: number
  fecha_fabricacion: string
  fecha_caducidad: string
  estado: EstadoLote
  ubicacion_almacen: string | null
  temperatura_almacenamiento: number | null
  observaciones: string | null
  created_at: string
  updated_at: string
  // Relaciones
  orden_produccion?: OrdenProduccion
  producto?: Producto
  materias_primas_usadas?: LoteMateriaPrima[]
}

export interface MovimientoInventario {
  id: string
  materia_prima_id: string
  tipo: TipoMovimientoInventario
  cantidad: number
  costo_unitario: number | null
  costo_total: number | null
  stock_anterior: number | null
  stock_nuevo: number | null
  referencia_id: string | null
  referencia_tipo: string | null
  lote_proveedor: string | null
  fecha_caducidad: string | null
  fecha: string
  usuario_id: string | null
  motivo: string | null
  notas: string | null
  created_at: string
  // Relaciones
  materia_prima?: MateriaPrima
}

export interface OrdenCompra {
  id: string
  numero: string
  proveedor_id: string
  fecha: string
  fecha_entrega_esperada: string | null
  fecha_entrega_real: string | null
  estado: EstadoOrdenCompra
  subtotal: number
  impuestos: number
  total: number
  metodo_pago: string | null
  referencia_proveedor: string | null
  notas: string | null
  created_at: string
  updated_at: string
  // Relaciones
  proveedor?: Proveedor
  lineas?: LineaOrdenCompra[]
}

export interface LineaOrdenCompra {
  id: string
  orden_compra_id: string
  materia_prima_id: string
  cantidad_pedida: number
  cantidad_recibida: number
  precio_unitario: number
  subtotal: number
  impuesto: number
  total: number
  lote_proveedor: string | null
  fecha_caducidad: string | null
  notas: string | null
  created_at: string
  // Relaciones
  materia_prima?: MateriaPrima
}

export interface InspeccionCalidad {
  id: string
  orden_produccion_id: string | null
  lote_produccion_id: string | null
  tipo: TipoInspeccion
  fecha: string
  inspector: string | null
  resultado: ResultadoInspeccion
  cantidad_inspeccionada: number | null
  cantidad_aprobada: number | null
  cantidad_rechazada: number | null
  motivo_rechazo: string | null
  criterios_evaluados: Record<string, any> | null
  observaciones: string | null
  acciones_correctivas: string | null
  created_at: string
}

export interface LoteMateriaPrima {
  id: string
  lote_produccion_id: string
  materia_prima_id: string
  lote_materia_prima: string | null
  cantidad_usada: number
  unidad: string | null
  costo_unitario: number | null
  fecha_uso: string
  created_at: string
  // Relaciones
  materia_prima?: MateriaPrima
}

// ===========================================
// TIPOS PARA FORMULARIOS DE PRODUCCIÓN
// ===========================================

export interface MateriaPrimaFormData {
  codigo: string
  nombre: string
  categoria: CategoriaMateriaPrima
  unidad_medida: UnidadMedidaMateria
  stock_minimo: number
  stock_maximo?: number
  proveedor_principal_id?: string
  requiere_refrigeracion: boolean
  dias_caducidad?: number
  temperatura_almacenamiento?: number
  descripcion?: string
}

export interface RecetaFormData {
  producto_id: string
  nombre: string
  version: number
  descripcion?: string
  rendimiento: number
  tiempo_preparacion?: number
  tiempo_congelacion?: number
  notas?: string
  ingredientes: RecetaIngredienteFormData[]
}

export interface RecetaIngredienteFormData {
  materia_prima_id: string
  cantidad: number
  unidad: string
  es_opcional: boolean
  notas?: string
}

export interface OrdenProduccionFormData {
  producto_id: string
  receta_id?: string
  cantidad_planificada: number
  fecha_planificada: string
  prioridad: number
  operario_responsable?: string
  turno?: TurnoProduccion
  notas?: string
}

export interface OrdenCompraFormData {
  proveedor_id: string
  fecha: string
  fecha_entrega_esperada?: string
  metodo_pago?: string
  referencia_proveedor?: string
  notas?: string
  lineas: LineaOrdenCompraFormData[]
}

export interface LineaOrdenCompraFormData {
  materia_prima_id: string
  cantidad_pedida: number
  precio_unitario: number
  lote_proveedor?: string
  fecha_caducidad?: string
  notas?: string
}
