import { AlertCircle, Download, FilterX, Plus, Search, SearchX } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useCuentas, useElementos } from '../api/consultas'
import type { EstadoFiltro, Origen } from '../api/tipos'
import { DialogoCuenta } from '../componentes/catalogo/DialogoCuenta'
import { DialogoExportar } from '../componentes/catalogo/DialogoExportar'
import { Aviso, Boton, Cargando, Codigo, EncabezadoPagina, EstadoVacio, Filtro, InsigniaEstado, InsigniaOrigen, Paginacion, Tarjeta, cx } from '../componentes/ui'
import { PERMISOS, useSesion } from '../contexto/Sesion'
import { useVersionActiva } from '../contexto/Version'
import { ETIQUETA_NIVEL } from '../utilidades/formato'

const TAMANO = 50

export default function Cuentas({ modo = 'cuentas' }: { modo?: 'cuentas' | 'subcuentas' }) {
  const { codigo: version, version: v } = useVersionActiva()
  const { puede } = useSesion()
  const navegar = useNavigate()
  const [params, setParams] = useSearchParams()
  const buscador = useRef<HTMLInputElement>(null)
  const [exportar, setExportar] = useState(false)
  const [nueva, setNueva] = useState(false)

  const nivelPorDefecto = modo === 'subcuentas' ? '3' : ''
  const termino = params.get('termino') ?? ''
  const elemento = params.get('elemento') ?? ''
  const nivelParam = params.get('nivel')
  const nivel = nivelParam === null ? nivelPorDefecto : nivelParam === 'todos' ? '' : nivelParam
  const estado = (params.get('estado') ?? 'TODAS') as EstadoFiltro
  const origen = (params.get('origen') ?? '') as Origen | ''
  const conObservacion = params.get('observacion') === '1'
  const pagina = Number(params.get('pagina') ?? 0)
  const [texto, setTexto] = useState(termino)

  useEffect(() => setTexto(termino), [termino])
  useEffect(() => {
    if (params.get('enfocar')) buscador.current?.focus()
  }, [params])

  const actualizar = (cambios: Record<string, string>) => {
    const p = new URLSearchParams(params)
    Object.entries(cambios).forEach(([k, val]) => (val ? p.set(k, val) : p.delete(k)))
    if (!('pagina' in cambios)) p.delete('pagina')
    p.delete('enfocar')
    setParams(p, { replace: true })
  }

  // Búsqueda mientras se escribe, con una breve espera.
  useEffect(() => {
    if (texto === termino) return
    const t = setTimeout(() => actualizar({ termino: texto.trim() }), 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto])

  const filtros = {
    version,
    termino: termino || undefined,
    elemento: elemento ? Number(elemento) : undefined,
    nivel: nivel ? Number(nivel) : undefined,
    estado,
    origen: origen || undefined,
    conObservacion: conObservacion || undefined,
  }
  const { data, isLoading, isError, isFetching } = useCuentas({ ...filtros, pagina, tamano: TAMANO })
  const { data: elementos = [] } = useElementos(version)
  const hayFiltros = !!(termino || elemento || nivel !== nivelPorDefecto || estado !== 'TODAS' || origen || conObservacion)

  return (
    <>
      <EncabezadoPagina
        titulo={modo === 'subcuentas' ? 'Subcuentas' : 'Cuentas'}
        descripcion={
          modo === 'subcuentas'
            ? 'Subcuentas (3 dígitos), divisionarias (4) y subdivisionarias (5 o más) del catálogo.'
            : `Catálogo completo del ${v?.nombre ?? 'PCGE'}. Busque por código o por cualquier palabra de la denominación.`
        }
        acciones={
          <>
            {puede(PERMISOS.exportar) && (
              <Boton icono={<Download className="size-4" />} onClick={() => setExportar(true)}>
                Exportar
              </Boton>
            )}
            {puede(PERMISOS.gestionarCuentas) && (
              <Boton variante="primario" icono={<Plus className="size-4" />} onClick={() => setNueva(true)}>
                Registrar cuenta
              </Boton>
            )}
          </>
        }
      />

      <Tarjeta>
        <div className="grid gap-3 border-b border-borde p-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-[minmax(16rem,1fr)_repeat(4,minmax(8.5rem,auto))] sm:items-end">
          <label className="block sm:col-span-2 lg:col-span-4 xl:col-span-1">
            <span className="mb-1 block text-xs font-medium text-texto-sec">Buscar</span>
            <span className="relative block">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <input
                ref={buscador}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Código (p. ej. 4011) o nombre (p. ej. remuneraciones)"
                className="h-9 w-full rounded-md border border-borde pr-3 pl-9 text-sm placeholder:text-slate-400 focus:border-corporativo focus:ring-2 focus:ring-corporativo/15 focus:outline-none"
              />
            </span>
          </label>
          <Filtro etiqueta="Elemento" value={elemento} onChange={(e) => actualizar({ elemento: e.target.value })}>
            <option value="">Todos</option>
            {elementos.map((el) => (
              <option key={el.id} value={el.numero}>
                {el.numero} · {el.denominacion.length > 28 ? el.denominacion.slice(0, 28) + '…' : el.denominacion}
              </option>
            ))}
          </Filtro>
          <Filtro etiqueta="Nivel" value={nivel} onChange={(e) => actualizar({ nivel: e.target.value || (modo === 'subcuentas' ? 'todos' : '') })}>
            <option value="">Todos</option>
            <option value="2">Cuenta (2 díg.)</option>
            <option value="3">Subcuenta (3 díg.)</option>
            <option value="4">Divisionaria (4 díg.)</option>
            <option value="5">Subdivisionaria (5 díg.)</option>
            <option value="6">Subdivisionaria (6 díg.)</option>
          </Filtro>
          <Filtro etiqueta="Estado" value={estado} onChange={(e) => actualizar({ estado: e.target.value === 'TODAS' ? '' : e.target.value })}>
            <option value="TODAS">Todas</option>
            <option value="ACTIVAS">Activas</option>
            <option value="INACTIVAS">Inactivas</option>
          </Filtro>
          <Filtro etiqueta="Origen" value={origen} onChange={(e) => actualizar({ origen: e.target.value })}>
            <option value="">Todos</option>
            <option value="OFICIAL">Oficial</option>
            <option value="PERSONALIZADA">Personalizada</option>
            <option value="IMPORTADA">Importada</option>
          </Filtro>
        </div>

        {(hayFiltros || conObservacion) && (
          <div className="flex flex-wrap items-center gap-3 border-b border-borde bg-slate-50/70 px-4 py-2 text-[13px]">
            {conObservacion && (
              <span className="inline-flex items-center gap-1.5 text-advertencia">
                <AlertCircle className="size-3.5" aria-hidden /> Mostrando solo cuentas con observación sobre la fuente
              </span>
            )}
            <span className="text-texto-sec">{data ? `${data.totalElementos.toLocaleString('es-PE')} resultados` : ''}</span>
            <button
              onClick={() => {
                setTexto('')
                setParams(new URLSearchParams(), { replace: true })
              }}
              className="ml-auto inline-flex items-center gap-1.5 font-medium text-corporativo hover:underline"
            >
              <FilterX className="size-3.5" aria-hidden /> Limpiar filtros
            </button>
          </div>
        )}

        {isError ? (
          <div className="p-5"><Aviso tono="error">No se pudo cargar el catálogo. Intente nuevamente.</Aviso></div>
        ) : isLoading ? (
          <Cargando texto="Cargando cuentas…" />
        ) : !data || data.contenido.length === 0 ? (
          <EstadoVacio
            icono={<SearchX className="size-5" />}
            titulo="No se encontraron cuentas"
            descripcion={termino ? `Ninguna cuenta coincide con “${termino}”. Pruebe con otra palabra o con los primeros dígitos del código.` : 'Ajuste los filtros para ver resultados.'}
          />
        ) : (
          <div className={cx('overflow-x-auto transition-opacity', isFetching && 'opacity-60')}>
            <table className="w-full min-w-[760px] text-[13.5px]">
              <thead>
                <tr className="border-b border-borde bg-slate-50/80 text-left text-xs font-semibold tracking-wide text-texto-sec uppercase">
                  <th scope="col" className="w-28 px-5 py-2.5">Código</th>
                  <th scope="col" className="px-3 py-2.5">Denominación</th>
                  <th scope="col" className="w-36 px-3 py-2.5">Nivel</th>
                  <th scope="col" className="w-24 px-3 py-2.5 text-center">Elemento</th>
                  <th scope="col" className="w-32 px-3 py-2.5">Origen</th>
                  <th scope="col" className="w-28 px-5 py-2.5">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borde">
                {data.contenido.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => navegar(`/plan-contable/cuentas/${c.id}`)}
                    className={cx('cursor-pointer transition-colors hover:bg-corporativo-claro/50', !c.activa && 'text-texto-sec')}
                  >
                    <td className="px-5 py-2.5">
                      <Link to={`/plan-contable/cuentas/${c.id}`} onClick={(e) => e.stopPropagation()} className="hover:underline">
                        <Codigo valor={c.codigo} className={!c.activa ? 'text-texto-sec' : undefined} />
                      </Link>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={cx('inline-flex items-center gap-1.5', c.nivel === 2 && 'font-semibold')}
                        style={{ paddingLeft: !termino && !nivel ? `${(c.nivel - 2) * 14}px` : undefined }}
                      >
                        {c.denominacion}
                        {c.conObservacion && <AlertCircle className="size-3.5 shrink-0 text-advertencia" aria-label="Con observación sobre la fuente" />}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-texto-sec">{ETIQUETA_NIVEL[c.tipoNivel]}{c.nivel > 5 && ` (${c.nivel})`}</td>
                    <td className="px-3 py-2.5 text-center text-texto-sec">{c.elemento}</td>
                    <td className="px-3 py-2.5"><InsigniaOrigen origen={c.origen} /></td>
                    <td className="px-5 py-2.5"><InsigniaEstado activa={c.activa} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && (
          <Paginacion pagina={data.pagina} totalPaginas={data.totalPaginas} total={data.totalElementos} tamano={TAMANO} alCambiar={(p) => actualizar({ pagina: String(p) })} />
        )}
      </Tarjeta>

      <DialogoExportar abierto={exportar} alCerrar={() => setExportar(false)} filtros={filtros} />
      <DialogoCuenta abierto={nueva} alCerrar={() => setNueva(false)} />
    </>
  )
}
