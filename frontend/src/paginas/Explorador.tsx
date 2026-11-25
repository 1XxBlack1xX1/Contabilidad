import { AlertCircle, ChevronRight, ChevronsDownUp, ChevronsUpDown, ExternalLink, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useArbol, useCuenta } from '../api/consultas'
import type { CuentaNodo, ElementoArbol } from '../api/tipos'
import { Aviso, Boton, Cargando, Codigo, EncabezadoPagina, EstadoVacio, InsigniaEstado, InsigniaOrigen, Tarjeta, cx } from '../componentes/ui'
import { useVersionActiva } from '../contexto/Version'
import { ETIQUETA_NIVEL, etiquetaDigitos } from '../utilidades/formato'

const normalizar = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

/** Devuelve los ids de los nodos que coinciden y de todos sus ancestros. */
function filtrarArbol(elementos: ElementoArbol[], termino: string, soloActivas: boolean) {
  const visibles = new Set<number>()
  const coincidencias = new Set<number>()
  const t = normalizar(termino.trim())
  const palabras = t.split(' ').filter(Boolean)
  const esCodigo = /^\d+$/.test(t)
  const recorrer = (n: CuentaNodo): boolean => {
    let hijoVisible = false
    n.hijos.forEach((h) => {
      if (recorrer(h)) hijoVisible = true
    })
    const pasaEstado = !soloActivas || n.activa
    const coincide = pasaEstado && (!t || (esCodigo ? n.codigo.startsWith(t) : palabras.every((p) => normalizar(n.denominacion).includes(p))))
    if (coincide && t) coincidencias.add(n.id)
    const visible = coincide || hijoVisible
    if (visible) visibles.add(n.id)
    return visible
  }
  elementos.forEach((e) => e.cuentas.forEach(recorrer))
  return { visibles, coincidencias }
}

function Resaltado({ texto, termino }: { texto: string; termino: string }) {
  const t = normalizar(termino.trim())
  if (!t || /^\d+$/.test(t)) return <>{texto}</>
  const n = normalizar(texto)
  const i = n.indexOf(t.split(' ')[0])
  if (i < 0) return <>{texto}</>
  const largo = t.split(' ')[0].length
  return (
    <>
      {texto.slice(0, i)}
      <mark className="rounded-sm bg-amber-100 text-texto">{texto.slice(i, i + largo)}</mark>
      {texto.slice(i + largo)}
    </>
  )
}

interface PropsNodo {
  nodo: CuentaNodo
  abiertos: Set<number>
  alternar: (id: number) => void
  visibles: Set<number> | null
  forzarAbierto: boolean
  termino: string
  seleccionado?: number
  alSeleccionar: (id: number) => void
}

function Nodo({ nodo, abiertos, alternar, visibles, forzarAbierto, termino, seleccionado, alSeleccionar }: PropsNodo) {
  if (visibles && !visibles.has(nodo.id)) return null
  const tieneHijos = nodo.hijos.length > 0
  const abierto = forzarAbierto || abiertos.has(nodo.id)
  return (
    <li role="treeitem" aria-expanded={tieneHijos ? abierto : undefined} aria-selected={seleccionado === nodo.id}>
      <div
        className={cx(
          'group flex items-center gap-1.5 rounded-md py-1 pr-2 transition-colors',
          seleccionado === nodo.id ? 'bg-corporativo-claro' : 'hover:bg-slate-50',
        )}
        style={{ paddingLeft: `${(nodo.nivel - 2) * 20 + 4}px` }}
      >
        <button
          onClick={() => tieneHijos && alternar(nodo.id)}
          className={cx('grid size-6 shrink-0 place-items-center rounded text-texto-sec', tieneHijos ? 'hover:bg-slate-200/70' : 'invisible')}
          aria-label={abierto ? `Contraer ${nodo.codigo}` : `Expandir ${nodo.codigo}`}
          tabIndex={tieneHijos ? 0 : -1}
        >
          <ChevronRight className={cx('size-4 transition-transform', abierto && 'rotate-90')} />
        </button>
        <button onClick={() => alSeleccionar(nodo.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <Codigo valor={nodo.codigo} className={cx('w-16 shrink-0', !nodo.activa && 'text-texto-sec')} />
          <span className={cx('truncate text-[13.5px]', nodo.nivel === 2 && 'font-semibold', !nodo.activa && 'text-texto-sec line-through decoration-slate-300')}>
            <Resaltado texto={nodo.denominacion} termino={termino} />
          </span>
          {nodo.conObservacion && <AlertCircle className="size-3.5 shrink-0 text-advertencia" aria-label="Con observación sobre la fuente" />}
          {nodo.origen === 'PERSONALIZADA' && <span className="shrink-0 rounded bg-corporativo-claro px-1.5 text-[11px] font-medium text-corporativo">Personalizada</span>}
          {tieneHijos && <span className="ml-auto shrink-0 text-xs text-slate-400">{nodo.hijos.length}</span>}
        </button>
      </div>
      {tieneHijos && abierto && (
        <ul role="group">
          {nodo.hijos.map((h) => (
            <Nodo key={h.id} nodo={h} abiertos={abiertos} alternar={alternar} visibles={visibles} forzarAbierto={forzarAbierto}
              termino={termino} seleccionado={seleccionado} alSeleccionar={alSeleccionar} />
          ))}
        </ul>
      )}
    </li>
  )
}

function PanelCuenta({ id }: { id?: number }) {
  const { data: c, isLoading } = useCuenta(id)
  if (!id) return <EstadoVacio titulo="Seleccione una cuenta" descripcion="Haga clic en una cuenta del árbol para ver su información." />
  if (isLoading || !c) return <Cargando />
  return (
    <div className="p-5">
      <div className="flex flex-wrap gap-2">
        <InsigniaOrigen origen={c.origen} />
        <InsigniaEstado activa={c.activa} />
      </div>
      <p className="mt-3"><Codigo valor={c.codigo} className="text-lg" /></p>
      <p className="mt-1 text-[15px] font-medium">{c.denominacion}</p>
      <dl className="mt-4 space-y-2.5 text-[13px]">
        <div><dt className="text-texto-sec">Nivel</dt><dd>{ETIQUETA_NIVEL[c.tipoNivel]} ({c.nivel} dígitos)</dd></div>
        <div><dt className="text-texto-sec">Elemento</dt><dd>{c.elemento.numero} — {c.elemento.denominacion}</dd></div>
        {c.padre && <div><dt className="text-texto-sec">Cuenta superior</dt><dd><span className="codigo font-medium">{c.padre.codigo}</span> {c.padre.denominacion}</dd></div>}
        <div><dt className="text-texto-sec">Subcuentas directas</dt><dd>{c.subcuentas.length}</dd></div>
      </dl>
      {c.observacionFuente && <Aviso tono="advertencia" className="mt-4">{c.observacionFuente}</Aviso>}
      <Link to={`/plan-contable/cuentas/${c.id}`} className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-corporativo hover:underline">
        Ver ficha completa <ExternalLink className="size-3.5" aria-hidden />
      </Link>
    </div>
  )
}

export default function Explorador() {
  const { codigo, version } = useVersionActiva()
  const { data: arbol, isLoading, isError } = useArbol(codigo)
  const [params, setParams] = useSearchParams()
  const [termino, setTermino] = useState('')
  const [soloActivas, setSoloActivas] = useState(false)
  const [abiertos, setAbiertos] = useState<Set<number>>(new Set())
  const [elementosAbiertos, setElementosAbiertos] = useState<Set<number>>(new Set([1]))
  const seleccionado = params.get('cuenta') ? Number(params.get('cuenta')) : undefined

  const filtro = useMemo(
    () => (arbol && (termino.trim().length >= 2 || soloActivas) ? filtrarArbol(arbol, termino.trim().length >= 2 ? termino : '', soloActivas) : null),
    [arbol, termino, soloActivas],
  )
  const buscando = termino.trim().length >= 2

  const alternar = (id: number) =>
    setAbiertos((a) => {
      const n = new Set(a)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  const todosLosIds = () => {
    const ids = new Set<number>()
    const r = (n: CuentaNodo) => {
      if (n.hijos.length) ids.add(n.id)
      n.hijos.forEach(r)
    }
    arbol?.forEach((e) => e.cuentas.forEach(r))
    return ids
  }

  return (
    <>
      <EncabezadoPagina
        titulo="Explorador jerárquico"
        descripcion={`Elemento → Cuenta → Subcuenta → Divisionaria → Subdivisionaria del ${version?.nombre ?? 'PCGE'}. No todas las cuentas tienen la misma profundidad.`}
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <Tarjeta>
          <div className="flex flex-wrap items-center gap-3 border-b border-borde p-4">
            <span className="relative min-w-[16rem] flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <input
                value={termino}
                onChange={(e) => setTermino(e.target.value)}
                placeholder="Filtrar el árbol por código o nombre…"
                aria-label="Filtrar el árbol"
                className="h-9 w-full rounded-md border border-borde pr-3 pl-9 text-sm placeholder:text-slate-400 focus:border-corporativo focus:ring-2 focus:ring-corporativo/15 focus:outline-none"
              />
            </span>
            <label className="flex items-center gap-2 text-[13px]">
              <input type="checkbox" checked={soloActivas} onChange={(e) => setSoloActivas(e.target.checked)} className="size-4 accent-[#1d4ed8]" />
              Solo activas
            </label>
            <div className="flex gap-1">
              <Boton tamano="sm" variante="fantasma" icono={<ChevronsUpDown className="size-4" />}
                onClick={() => { setElementosAbiertos(new Set(arbol?.map((e) => e.numero))); setAbiertos(todosLosIds()) }}>
                Expandir todo
              </Boton>
              <Boton tamano="sm" variante="fantasma" icono={<ChevronsDownUp className="size-4" />}
                onClick={() => { setElementosAbiertos(new Set()); setAbiertos(new Set()) }}>
                Contraer todo
              </Boton>
            </div>
          </div>
          {buscando && filtro && (
            <p className="border-b border-borde bg-slate-50/70 px-5 py-2 text-[13px] text-texto-sec">
              {filtro.coincidencias.size === 0 ? 'Sin coincidencias.' : `${filtro.coincidencias.size} coincidencias; se muestran con sus cuentas superiores.`}
            </p>
          )}
          {isError ? (
            <div className="p-5"><Aviso tono="error">No se pudo cargar el árbol del catálogo.</Aviso></div>
          ) : isLoading || !arbol ? (
            <Cargando texto="Cargando árbol del catálogo…" />
          ) : (
            <div className="max-h-[calc(100vh-17rem)] overflow-y-auto p-3">
              {arbol.map((e) => {
                if (filtro && !e.cuentas.some((c) => filtro.visibles.has(c.id))) return null
                const abierto = buscando || elementosAbiertos.has(e.numero)
                return (
                  <section key={e.id} className="mb-1">
                    <button
                      onClick={() => setElementosAbiertos((s) => { const n = new Set(s); if (n.has(e.numero)) n.delete(e.numero); else n.add(e.numero); return n })}
                      aria-expanded={abierto}
                      className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-slate-50"
                    >
                      <ChevronRight className={cx('size-4 text-texto-sec transition-transform', abierto && 'rotate-90')} aria-hidden />
                      <span className="grid size-7 place-items-center rounded-md bg-marino text-[13px] font-semibold text-white">{e.numero}</span>
                      <span className="flex-1 text-[13.5px] font-semibold tracking-wide text-marino uppercase">{e.denominacion}</span>
                      <span className="text-xs text-texto-sec">{e.totalCuentas.toLocaleString('es-PE')} cuentas</span>
                    </button>
                    {abierto && (
                      e.cuentas.length === 0 ? (
                        <p className="py-2 pl-14 text-[13px] text-texto-sec">
                          El PCGE no codifica cuentas en este elemento; su desarrollo queda a criterio de cada entidad.
                        </p>
                      ) : (
                        <ul role="tree" aria-label={`Elemento ${e.numero}`} className="pb-2 pl-6">
                          {e.cuentas.map((c) => (
                            <Nodo key={c.id} nodo={c} abiertos={abiertos} alternar={alternar} visibles={filtro?.visibles ?? null}
                              forzarAbierto={buscando} termino={termino} seleccionado={seleccionado}
                              alSeleccionar={(id) => setParams({ cuenta: String(id) }, { replace: true })} />
                          ))}
                        </ul>
                      )
                    )}
                  </section>
                )
              })}
            </div>
          )}
          <div className="flex flex-wrap gap-x-5 gap-y-1 border-t border-borde px-5 py-3 text-xs text-texto-sec">
            {[2, 3, 4, 5].map((d) => <span key={d}><strong className="font-medium text-texto">{d} dígitos</strong> = {etiquetaDigitos(d)}</span>)}
          </div>
        </Tarjeta>
        <Tarjeta className="h-fit xl:sticky xl:top-24">
          <PanelCuenta id={seleccionado} />
        </Tarjeta>
      </div>
    </>
  )
}
