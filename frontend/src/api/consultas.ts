import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, construirQuery } from './cliente'
import type {
  CuentaDetalle,
  CuentaResumen,
  Dashboard,
  Elemento,
  ElementoArbol,
  FiltrosCuentas,
  Historial,
  Naturaleza,
  Pagina,
  Rol,
  Usuario,
  VersionPcge,
  VistaPrevia,
} from './tipos'

// ------------------------------------------------------------------ catálogo

export const useVersiones = (habilitado = true) =>
  useQuery({
    queryKey: ['versiones'],
    queryFn: () => api.get<VersionPcge[]>('/api/versiones-pcge'),
    staleTime: 5 * 60_000,
    enabled: habilitado,
  })

export const useDashboard = (version?: string) =>
  useQuery({
    queryKey: ['dashboard', version],
    queryFn: () => api.get<Dashboard>(`/api/dashboard${construirQuery({ version })}`),
    enabled: !!version,
  })

export const useElementos = (version?: string) =>
  useQuery({
    queryKey: ['elementos', version],
    queryFn: () => api.get<Elemento[]>(`/api/elementos${construirQuery({ version })}`),
    enabled: !!version,
    staleTime: 5 * 60_000,
  })

export const useArbol = (version?: string) =>
  useQuery({
    queryKey: ['arbol', version],
    queryFn: () => api.get<ElementoArbol[]>(`/api/cuentas/arbol${construirQuery({ version })}`),
    enabled: !!version,
    staleTime: 60_000,
  })

export interface OpcionesListado extends FiltrosCuentas {
  pagina: number
  tamano: number
  orden?: string
  descendente?: boolean
}

export const useCuentas = (o: OpcionesListado) =>
  useQuery({
    queryKey: ['cuentas', o],
    queryFn: () => api.get<Pagina<CuentaResumen>>(`/api/cuentas${construirQuery({ ...o })}`),
    enabled: !!o.version,
    placeholderData: keepPreviousData,
  })

export const useBusquedaRapida = (version: string | undefined, termino: string) =>
  useQuery({
    queryKey: ['buscar', version, termino],
    queryFn: () => api.get<CuentaResumen[]>(`/api/cuentas/buscar${construirQuery({ version, termino, limite: 8 })}`),
    enabled: !!version && termino.trim().length >= 2,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  })

export const useCuenta = (id?: number) =>
  useQuery({
    queryKey: ['cuenta', id],
    queryFn: () => api.get<CuentaDetalle>(`/api/cuentas/${id}`),
    enabled: id !== undefined && !Number.isNaN(id),
  })

export const useHistorialCuenta = (id?: number) =>
  useQuery({
    queryKey: ['historial-cuenta', id],
    queryFn: () => api.get<Pagina<Historial>>(`/api/cuentas/${id}/historial?tamano=50`),
    enabled: id !== undefined && !Number.isNaN(id),
  })

export const useHistorial = (version: string | undefined, pagina: number) =>
  useQuery({
    queryKey: ['historial', version, pagina],
    queryFn: () => api.get<Pagina<Historial>>(`/api/historial${construirQuery({ version, pagina, tamano: 25 })}`),
    placeholderData: keepPreviousData,
  })

/** Invalida todo lo que depende del contenido del catálogo tras una modificación. */
function useInvalidarCatalogo() {
  const qc = useQueryClient()
  return () =>
    Promise.all(
      ['cuentas', 'cuenta', 'arbol', 'dashboard', 'elementos', 'historial', 'historial-cuenta', 'buscar', 'versiones'].map(
        (k) => qc.invalidateQueries({ queryKey: [k] }),
      ),
    )
}

export interface DatosCuentaNueva {
  version: string
  codigo: string
  denominacion: string
  descripcion?: string
  naturaleza?: Naturaleza
}

export function useCrearCuenta() {
  const invalidar = useInvalidarCatalogo()
  return useMutation({
    mutationFn: (d: DatosCuentaNueva) => api.post<CuentaDetalle>('/api/cuentas', d),
    onSuccess: invalidar,
  })
}

export function useActualizarCuenta(id: number) {
  const invalidar = useInvalidarCatalogo()
  return useMutation({
    mutationFn: (d: { denominacion: string; descripcion?: string; naturaleza?: Naturaleza; versionRegistro: number }) =>
      api.put<CuentaDetalle>(`/api/cuentas/${id}`, d),
    onSuccess: invalidar,
  })
}

export function useCambiarEstado(id: number) {
  const invalidar = useInvalidarCatalogo()
  return useMutation({
    mutationFn: (d: { activa: boolean; motivo: string }) =>
      api.patch<{ cuenta: CuentaDetalle; codigosAfectados: string[] }>(`/api/cuentas/${id}/estado`, d),
    onSuccess: invalidar,
  })
}

export function useVersionPredeterminada() {
  const invalidar = useInvalidarCatalogo()
  return useMutation({
    mutationFn: (codigo: string) => api.put<VersionPcge>(`/api/versiones-pcge/${codigo}/predeterminada`),
    onSuccess: invalidar,
  })
}

// ------------------------------------------------------------------ importación

export const useVistaPrevia = () =>
  useMutation({
    mutationFn: (archivo: File) => {
      const fd = new FormData()
      fd.append('archivo', archivo)
      return api.post<VistaPrevia>('/api/importaciones/vista-previa', fd)
    },
  })

export interface DatosImportacion {
  codigo: string
  nombre: string
  descripcion?: string
  fuenteTitulo: string
  fuenteUrl?: string
  notas?: string
  sha256Revisado: string
}

export function useConfirmarImportacion() {
  const invalidar = useInvalidarCatalogo()
  return useMutation({
    mutationFn: ({ archivo, datos }: { archivo: File; datos: DatosImportacion }) => {
      const fd = new FormData()
      fd.append('archivo', archivo)
      fd.append('datos', new Blob([JSON.stringify(datos)], { type: 'application/json' }))
      return api.post<VersionPcge>('/api/importaciones', fd)
    },
    onSuccess: invalidar,
  })
}

// ------------------------------------------------------------------ usuarios

export const useUsuarios = () => useQuery({ queryKey: ['usuarios'], queryFn: () => api.get<Usuario[]>('/api/usuarios') })
export const useRoles = () =>
  useQuery({ queryKey: ['roles'], queryFn: () => api.get<Rol[]>('/api/usuarios/roles'), staleTime: Infinity })

export function useGuardarUsuario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, datos }: { id?: number; datos: Record<string, unknown> }) =>
      id ? api.put<Usuario>(`/api/usuarios/${id}`, datos) : api.post<Usuario>('/api/usuarios', datos),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  })
}
