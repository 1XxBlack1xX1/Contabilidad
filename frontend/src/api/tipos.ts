// Tipos de la API REST (reflejan los DTO del backend).

export type TipoNivel = 'ELEMENTO' | 'CUENTA' | 'SUBCUENTA' | 'DIVISIONARIA' | 'SUBDIVISIONARIA'
export type Origen = 'OFICIAL' | 'IMPORTADA' | 'PERSONALIZADA'
export type Naturaleza = 'DEUDORA' | 'ACREEDORA'
export type EstadoFiltro = 'ACTIVAS' | 'INACTIVAS' | 'TODAS'
export type EstadoVigencia = 'VIGENTE' | 'POR_ENTRAR_EN_VIGENCIA' | 'DEROGADA' | 'NO_OFICIAL' | 'SIN_FECHA'
export type Accion = 'CREACION' | 'MODIFICACION' | 'ACTIVACION' | 'DESACTIVACION' | 'IMPORTACION' | 'CONFIGURACION'

export interface Pagina<T> {
  contenido: T[]
  pagina: number
  tamano: number
  totalElementos: number
  totalPaginas: number
}

export interface UsuarioSesion {
  id: number
  usuario: string
  nombreCompleto: string
  email: string
  roles: string[]
  permisos: string[]
}

export interface CuentaResumen {
  id: number
  codigo: string
  denominacion: string
  nivel: number
  tipoNivel: TipoNivel
  elemento: number
  elementoDenominacion: string
  codigoPadre?: string
  naturaleza?: Naturaleza
  origen: Origen
  activa: boolean
  conObservacion: boolean
}

export interface CuentaReferencia {
  id: number
  codigo: string
  denominacion: string
  tipoNivel: TipoNivel
  activa: boolean
}

export interface Elemento {
  id: number
  numero: number
  denominacion: string
  descripcion?: string
  paginaFuente?: number
  seccionFuente?: string
  totalCuentas?: number
}

export interface VersionResumen {
  id: number
  codigo: string
  nombre: string
  oficial: boolean
  estado: EstadoVigencia
  estadoEtiqueta: string
  predeterminada: boolean
}

export interface FuenteNormativa {
  id: number
  tipo: 'RESOLUCION' | 'DOCUMENTO_OFICIAL' | 'REFERENCIA' | 'ARCHIVO_IMPORTADO'
  titulo: string
  numero?: string
  entidadEmisora?: string
  fechaEmision?: string
  url?: string
  nombreArchivo?: string
  sha256?: string
  fechaConsulta?: string
  verificada: boolean
  notas?: string
}

export interface VersionPcge extends VersionResumen {
  descripcion?: string
  fechaAprobacion?: string
  fechaAplicacionObligatoria?: string
  fechaFinVigencia?: string
  permiteAplicacionAnticipada?: boolean
  notas?: string
  totalCuentas: number
  fuentes: FuenteNormativa[]
}

export interface CuentaDetalle {
  id: number
  codigo: string
  denominacion: string
  descripcion?: string
  nivel: number
  tipoNivel: TipoNivel
  elemento: Elemento
  version: VersionResumen
  padre?: CuentaReferencia
  ruta: CuentaReferencia[]
  subcuentas: CuentaReferencia[]
  naturaleza?: Naturaleza
  origen: Origen
  activa: boolean
  editable: boolean
  codigoFuente?: string
  observacionFuente?: string
  paginaFuente?: number
  seccionFuente?: string
  creadoEn: string
  actualizadoEn: string
  creadoPor?: string
  actualizadoPor?: string
  versionRegistro: number
}

export interface CuentaNodo {
  id: number
  codigo: string
  denominacion: string
  nivel: number
  activa: boolean
  origen: Origen
  conObservacion: boolean
  hijos: CuentaNodo[]
}

export interface ElementoArbol {
  id: number
  numero: number
  denominacion: string
  totalCuentas: number
  cuentas: CuentaNodo[]
}

export interface Historial {
  id: number
  accion: Accion
  resumen: string
  detalle?: Record<string, unknown>
  motivo?: string
  cuentaId?: number
  cuentaCodigo?: string
  versionCodigo?: string
  usuario: string
  fecha: string
}

export interface Dashboard {
  version: VersionPcge
  totalCuentas: number
  totalElementos: number
  cuentasActivas: number
  cuentasInactivas: number
  cuentasPersonalizadas: number
  cuentasConObservacion: number
  cuentasPorNivel: Record<string, number>
  ultimaActualizacion?: string
  ultimasModificaciones: Historial[]
}

export interface FiltrosCuentas {
  version?: string
  termino?: string
  elemento?: number
  nivel?: number
  estado?: EstadoFiltro
  origen?: Origen
  conObservacion?: boolean
}

export interface Incidencia {
  fila?: number
  codigo?: string
  mensaje: string
}

export interface VistaPrevia {
  nombreArchivo: string
  sha256: string
  filasLeidas: number
  totalElementos: number
  totalCuentas: number
  cuentasPorNivel: Record<string, number>
  errores: Incidencia[]
  advertencias: Incidencia[]
  muestra: { fila: number; codigo: string; denominacion: string; tipoNivel: string; codigoPadre?: string }[]
  valido: boolean
}

export interface Usuario {
  id: number
  usuario: string
  nombreCompleto: string
  email: string
  activo: boolean
  roles: string[]
  ultimoAcceso?: string
  creadoEn: string
}

export interface Rol {
  codigo: string
  nombre: string
  descripcion: string
}

export interface ErrorApi {
  estado: number
  mensaje: string
  campos?: Record<string, string>
}

// ------------------------------------------------------------------ contabilidad (importes en soles)

export type EstadoAsiento = 'REGISTRADO' | 'ANULADO'

export interface LineaAsiento {
  linea: number
  cuentaId: number
  cuentaCodigo: string
  cuentaDenominacion: string
  glosa?: string
  debe: number
  haber: number
}

export interface AsientoResumen {
  id: number
  numero: string
  fecha: string
  glosa: string
  documentoReferencia?: string
  total: number
  estado: EstadoAsiento
  creadoPor: string
  creadoEn: string
}

export interface Asiento {
  id: number
  numero: string
  fecha: string
  glosa: string
  documentoReferencia?: string
  moneda: string
  estado: EstadoAsiento
  totalDebe: number
  totalHaber: number
  versionCodigo: string
  versionNombre: string
  lineas: LineaAsiento[]
  motivoAnulacion?: string
  anuladoPor?: string
  anuladoEn?: string
  creadoPor: string
  creadoEn: string
}

export interface LibroDiario {
  versionNombre: string
  desde: string
  hasta: string
  asientos: Asiento[]
  totalDebe: number
  totalHaber: number
}

export interface MovimientoMayor {
  fecha: string
  asientoId: number
  asientoNumero: string
  glosa: string
  cuentaCodigo: string
  cuentaDenominacion: string
  debe: number
  haber: number
  saldo: number
}

export interface LibroMayor {
  cuenta: CuentaReferencia
  versionNombre: string
  desde: string
  hasta: string
  saldoInicial: number
  movimientos: MovimientoMayor[]
  totalDebe: number
  totalHaber: number
  saldoFinal: number
}

export interface FilaBalance {
  codigo: string
  denominacion: string
  debe: number
  haber: number
  saldoDeudor: number
  saldoAcreedor: number
}

export interface BalanceComprobacion {
  versionNombre: string
  desde: string
  hasta: string
  nivel: string
  filas: FilaBalance[]
  totalDebe: number
  totalHaber: number
  totalDeudor: number
  totalAcreedor: number
  cuadra: boolean
}

export interface SeccionReporte {
  titulo: string
  lineas: { codigo: string; denominacion: string; importe: number }[]
  total: number
}

export interface EstadoSituacion {
  versionNombre: string
  hasta: string
  activo: SeccionReporte
  pasivo: SeccionReporte
  patrimonio: SeccionReporte
  resultadoEjercicio: number
  totalPasivoPatrimonio: number
  cuadra: boolean
}

export interface EstadoResultados {
  versionNombre: string
  desde: string
  hasta: string
  ingresos: SeccionReporte
  gastos: SeccionReporte
  resultado: number
}
