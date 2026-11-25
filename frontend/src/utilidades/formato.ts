import type { Accion, EstadoVigencia, Origen, TipoNivel } from '../api/tipos'

const fecha = new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Lima' })
const fechaLarga = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Lima' })
const fechaHora = new Intl.DateTimeFormat('es-PE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Lima',
})
const numero = new Intl.NumberFormat('es-PE')

/** Fechas ISO "AAAA-MM-DD" se interpretan como fecha local (sin desfase de zona horaria). */
function aFecha(valor: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(valor) ? new Date(`${valor}T12:00:00-05:00`) : new Date(valor)
}

export const formatearFecha = (v?: string) => (v ? fecha.format(aFecha(v)) : '—')
export const formatearFechaLarga = (v?: string) => (v ? fechaLarga.format(aFecha(v)) : '—')
export const formatearFechaHora = (v?: string) => (v ? fechaHora.format(new Date(v)) : '—')
export const formatearNumero = (n?: number) => (n === undefined ? '—' : numero.format(n))

export function haceCuanto(v: string) {
  const seg = Math.round((Date.now() - new Date(v).getTime()) / 1000)
  if (seg < 60) return 'hace un momento'
  const min = Math.round(seg / 60)
  if (min < 60) return `hace ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.round(h / 24)
  return d < 30 ? `hace ${d} ${d === 1 ? 'día' : 'días'}` : formatearFecha(v)
}

export const ETIQUETA_NIVEL: Record<TipoNivel, string> = {
  ELEMENTO: 'Elemento',
  CUENTA: 'Cuenta',
  SUBCUENTA: 'Subcuenta',
  DIVISIONARIA: 'Divisionaria',
  SUBDIVISIONARIA: 'Subdivisionaria',
}

/** Nombre del nivel según la cantidad de dígitos. */
export function etiquetaDigitos(digitos: number) {
  if (digitos === 2) return 'Cuenta'
  if (digitos === 3) return 'Subcuenta'
  if (digitos === 4) return 'Divisionaria'
  return digitos === 5 ? 'Subdivisionaria' : `Subdivisionaria (${digitos} díg.)`
}

export const ETIQUETA_ORIGEN: Record<Origen, string> = {
  OFICIAL: 'Oficial',
  IMPORTADA: 'Importada',
  PERSONALIZADA: 'Personalizada',
}

export const ETIQUETA_ACCION: Record<Accion, string> = {
  CREACION: 'Registro',
  MODIFICACION: 'Modificación',
  ACTIVACION: 'Activación',
  DESACTIVACION: 'Desactivación',
  IMPORTACION: 'Importación',
  CONFIGURACION: 'Configuración',
}

export const TONO_VIGENCIA: Record<EstadoVigencia, 'exito' | 'info' | 'neutro' | 'advertencia'> = {
  VIGENTE: 'exito',
  POR_ENTRAR_EN_VIGENCIA: 'info',
  DEROGADA: 'neutro',
  NO_OFICIAL: 'advertencia',
  SIN_FECHA: 'neutro',
}

const moneda = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Importe en soles con separador de miles (1,234.56). Con `vacio`, el cero se muestra en blanco. */
export function formatearImporte(n: number | undefined | null, vacio = false) {
  if (n === undefined || n === null) return ''
  if (vacio && n === 0) return ''
  return moneda.format(n)
}

/** Saldo con su naturaleza: D = deudor, A = acreedor. */
export function formatearSaldo(n: number) {
  if (n === 0) return '0.00'
  return `${moneda.format(Math.abs(n))} ${n > 0 ? 'D' : 'A'}`
}

/** Fecha de hoy (AAAA-MM-DD) según la hora de Lima. */
export function hoyISO() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date())
}

export const inicioDeAnioISO = () => hoyISO().slice(0, 4) + '-01-01'

export const ETIQUETA_ROL: Record<string, string> = {
  ADMINISTRADOR: 'Administrador',
  CONTADOR: 'Contador',
  AUXILIAR: 'Auxiliar contable',
}
