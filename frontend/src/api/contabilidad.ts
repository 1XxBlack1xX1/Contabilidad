import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, construirQuery } from './cliente'
import type {
  Asiento,
  AsientoResumen,
  BalanceComprobacion,
  CuentaDetalle,
  CuentaResumen,
  EstadoAsiento,
  EstadoResultados,
  EstadoSituacion,
  LibroDiario,
  LibroMayor,
  Pagina,
} from './tipos'

// ------------------------------------------------------------------ asientos

export interface FiltrosAsientos {
  version?: string
  desde?: string
  hasta?: string
  estado?: EstadoAsiento
  termino?: string
  pagina: number
}

export const useAsientos = (f: FiltrosAsientos) =>
  useQuery({
    queryKey: ['asientos', f],
    queryFn: () => api.get<Pagina<AsientoResumen>>(`/api/asientos${construirQuery({ ...f, tamano: 25 })}`),
    enabled: !!f.version,
    placeholderData: keepPreviousData,
  })

export const useAsiento = (id?: number) =>
  useQuery({
    queryKey: ['asiento', id],
    queryFn: () => api.get<Asiento>(`/api/asientos/${id}`),
    enabled: id !== undefined && !Number.isNaN(id),
  })

/** Tras registrar o anular un asiento cambian los libros, los reportes y el historial. */
function useInvalidarContabilidad() {
  const qc = useQueryClient()
  return () =>
    Promise.all(
      ['asientos', 'asiento', 'diario', 'mayor', 'balance', 'situacion', 'resultados', 'historial', 'dashboard'].map((k) =>
        qc.invalidateQueries({ queryKey: [k] }),
      ),
    )
}

export interface DatosAsiento {
  version: string
  fecha: string
  glosa: string
  documentoReferencia?: string
  lineas: { cuentaId: number; glosa?: string; debe: number; haber: number }[]
}

export function useCrearAsiento() {
  const invalidar = useInvalidarContabilidad()
  return useMutation({ mutationFn: (d: DatosAsiento) => api.post<Asiento>('/api/asientos', d), onSuccess: invalidar })
}

export function useAnularAsiento(id: number) {
  const invalidar = useInvalidarContabilidad()
  return useMutation({
    mutationFn: (motivo: string) => api.post<Asiento>(`/api/asientos/${id}/anulacion`, { motivo }),
    onSuccess: invalidar,
  })
}

/** Cuentas que admiten movimientos: activas y sin subcuentas. */
export const useCuentasMovimiento = (version: string | undefined, termino: string) =>
  useQuery({
    queryKey: ['buscar-movimiento', version, termino],
    queryFn: () => api.get<CuentaResumen[]>(`/api/cuentas/buscar${construirQuery({ version, termino, limite: 12, soloMovimiento: true })}`),
    enabled: !!version && termino.trim().length >= 1,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  })

/** Cualquier cuenta (todas las jerarquías), para el libro mayor. */
export const useCuentasTodas = (version: string | undefined, termino: string) =>
  useQuery({
    queryKey: ['buscar', version, termino, 'mayor'],
    queryFn: () => api.get<CuentaResumen[]>(`/api/cuentas/buscar${construirQuery({ version, termino, limite: 12 })}`),
    enabled: !!version && termino.trim().length >= 1,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  })

/**
 * Busca cuentas por código en la versión indicada. Devuelve null para las que no existen, están
 * inactivas o tienen subcuentas (no admiten movimientos).
 */
export async function resolverCuentas(version: string, codigos: string[]) {
  const unicos = [...new Set(codigos)]
  const pares = await Promise.all(
    unicos.map(async (codigo) => {
      try {
        const c = await api.get<CuentaDetalle>(`/api/cuentas/codigo/${codigo}${construirQuery({ version })}`)
        const valida = c.activa && c.subcuentas.length === 0
        return [codigo, valida ? { id: c.id, codigo: c.codigo, denominacion: c.denominacion } : null] as const
      } catch {
        return [codigo, null] as const
      }
    }),
  )
  return new Map(pares)
}

// ------------------------------------------------------------------ libros y reportes

const periodoValido = (desde?: string, hasta?: string) => !!desde && !!hasta && desde <= hasta

export const useLibroDiario = (version?: string, desde?: string, hasta?: string) =>
  useQuery({
    queryKey: ['diario', version, desde, hasta],
    queryFn: () => api.get<LibroDiario>(`/api/libros/diario${construirQuery({ version, desde, hasta })}`),
    enabled: !!version && periodoValido(desde, hasta),
  })

export const useLibroMayor = (version?: string, cuenta?: string, desde?: string, hasta?: string) =>
  useQuery({
    queryKey: ['mayor', version, cuenta, desde, hasta],
    queryFn: () => api.get<LibroMayor>(`/api/libros/mayor${construirQuery({ version, cuenta, desde, hasta })}`),
    enabled: !!version && !!cuenta && periodoValido(desde, hasta),
  })

export const useBalance = (version?: string, desde?: string, hasta?: string, nivel?: string) =>
  useQuery({
    queryKey: ['balance', version, desde, hasta, nivel],
    queryFn: () => api.get<BalanceComprobacion>(`/api/libros/balance-comprobacion${construirQuery({ version, desde, hasta, nivel })}`),
    enabled: !!version && periodoValido(desde, hasta),
  })

export const useSituacion = (version?: string, hasta?: string) =>
  useQuery({
    queryKey: ['situacion', version, hasta],
    queryFn: () => api.get<EstadoSituacion>(`/api/reportes/situacion-financiera${construirQuery({ version, hasta })}`),
    enabled: !!version && !!hasta,
  })

export const useResultados = (version?: string, desde?: string, hasta?: string) =>
  useQuery({
    queryKey: ['resultados', version, desde, hasta],
    queryFn: () => api.get<EstadoResultados>(`/api/reportes/resultados${construirQuery({ version, desde, hasta })}`),
    enabled: !!version && periodoValido(desde, hasta),
  })
