import { Bell, Check, ChevronDown, CornerDownLeft, LogOut, Menu, Search, ShieldCheck, UserCircle2 } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState, type RefObject } from 'react'
import { useNavigate } from 'react-router'
import { useBusquedaRapida, useHistorial } from '../../api/consultas'
import { useSesion } from '../../contexto/Sesion'
import { useVersionActiva } from '../../contexto/Version'
import { ETIQUETA_ROL, TONO_VIGENCIA, formatearFechaLarga, haceCuanto } from '../../utilidades/formato'
import { Codigo, Insignia, cx } from '../ui'

function useClickFuera(ref: RefObject<HTMLElement | null>, alSalir: () => void) {
  useEffect(() => {
    const f = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && alSalir()
    document.addEventListener('mousedown', f)
    return () => document.removeEventListener('mousedown', f)
  }, [ref, alSalir])
}

function useRetardo<T>(valor: T, ms: number) {
  const [v, setV] = useState(valor)
  useEffect(() => {
    const t = setTimeout(() => setV(valor), ms)
    return () => clearTimeout(t)
  }, [valor, ms])
  return v
}

// ------------------------------------------------------------------ Buscador global

function BuscadorGlobal() {
  const { codigo } = useVersionActiva()
  const navegar = useNavigate()
  const [texto, setTexto] = useState('')
  const [abierto, setAbierto] = useState(false)
  const [activo, setActivo] = useState(0)
  const termino = useRetardo(texto, 200)
  const { data: resultados = [], isFetching } = useBusquedaRapida(codigo, termino)
  const contenedor = useRef<HTMLDivElement>(null)
  const entrada = useRef<HTMLInputElement>(null)
  const idLista = useId()
  useClickFuera(contenedor, () => setAbierto(false))

  useEffect(() => {
    const atajo = (e: KeyboardEvent) => {
      const enCampo = ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)
      if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !enCampo)) {
        e.preventDefault()
        entrada.current?.focus()
      }
    }
    window.addEventListener('keydown', atajo)
    return () => window.removeEventListener('keydown', atajo)
  }, [])
  useEffect(() => setActivo(0), [termino])

  const irA = (id: number) => {
    setAbierto(false)
    setTexto('')
    navegar(`/plan-contable/cuentas/${id}`)
  }
  const verTodos = () => {
    setAbierto(false)
    navegar(`/plan-contable/cuentas?termino=${encodeURIComponent(texto.trim())}`)
  }
  const mostrar = abierto && texto.trim().length >= 2

  return (
    <div ref={contenedor} className="relative w-full max-w-xl">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
      <input
        ref={entrada}
        role="combobox"
        aria-expanded={mostrar}
        aria-controls={idLista}
        aria-label="Buscar cuenta por código o nombre"
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value)
          setAbierto(true)
        }}
        onFocus={() => setAbierto(true)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActivo((a) => Math.min(a + 1, resultados.length))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActivo((a) => Math.max(a - 1, 0))
          } else if (e.key === 'Enter' && texto.trim()) {
            e.preventDefault()
            if (resultados[activo]) irA(resultados[activo].id)
            else verTodos()
          } else if (e.key === 'Escape') {
            setAbierto(false)
            entrada.current?.blur()
          }
        }}
        placeholder="Buscar cuenta por código o nombre…"
        className="h-9 w-full rounded-md border border-borde bg-fondo pr-16 pl-9 text-sm placeholder:text-slate-400 focus:border-corporativo focus:bg-white focus:ring-2 focus:ring-corporativo/15 focus:outline-none"
      />
      <kbd className="pointer-events-none absolute top-1/2 right-2.5 hidden -translate-y-1/2 rounded border border-borde bg-white px-1.5 text-[11px] text-texto-sec sm:block">
        Ctrl K
      </kbd>
      {mostrar && (
        <div id={idLista} role="listbox" className="absolute top-11 right-0 left-0 z-40 overflow-hidden rounded-lg border border-borde bg-white shadow-flotante">
          {resultados.length === 0 ? (
            <p className="px-4 py-6 text-center text-[13px] text-texto-sec">
              {isFetching ? 'Buscando…' : `No se encontraron cuentas para “${texto.trim()}”.`}
            </p>
          ) : (
            <ul className="max-h-96 overflow-y-auto py-1">
              {resultados.map((c, i) => (
                <li key={c.id} role="option" aria-selected={i === activo}>
                  <button
                    onMouseEnter={() => setActivo(i)}
                    onClick={() => irA(c.id)}
                    className={cx('flex w-full items-center gap-3 px-4 py-2 text-left', i === activo && 'bg-corporativo-claro')}
                  >
                    <Codigo valor={c.codigo} className="w-16 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className={cx('block truncate', !c.activa && 'text-texto-sec')}>{c.denominacion}</span>
                      <span className="block truncate text-xs text-texto-sec">
                        {c.tipoNivel === 'CUENTA' ? 'Cuenta' : c.tipoNivel.charAt(0) + c.tipoNivel.slice(1).toLowerCase()} · Elemento {c.elemento}
                        {!c.activa && ' · Inactiva'}
                      </span>
                    </span>
                    {i === activo && <CornerDownLeft className="size-3.5 text-texto-sec" aria-hidden />}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            onClick={verTodos}
            className={cx('w-full border-t border-borde px-4 py-2.5 text-left text-[13px] font-medium text-corporativo hover:bg-slate-50', activo === resultados.length && 'bg-slate-50')}
          >
            Ver todos los resultados de “{texto.trim()}” en el catálogo
          </button>
        </div>
      )}
    </div>
  )
}

// ------------------------------------------------------------------ Selector de versión

function SelectorVersion() {
  const { versiones, version, seleccionar } = useVersionActiva()
  const [abierto, setAbierto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useClickFuera(ref, () => setAbierto(false))
  if (!version) return null
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setAbierto((a) => !a)}
        aria-expanded={abierto}
        aria-haspopup="listbox"
        className="flex h-9 items-center gap-2 rounded-md border border-borde bg-white px-3 text-[13px] whitespace-nowrap hover:bg-slate-50"
        title="Versión del Plan Contable con la que trabaja"
      >
        <span className={cx('size-2 rounded-full', version.estado === 'VIGENTE' ? 'bg-exito' : version.estado === 'NO_OFICIAL' ? 'bg-advertencia' : 'bg-corporativo')} aria-hidden />
        <span className="hidden font-medium lg:inline">{version.nombre}</span>
        <span className="font-medium lg:hidden">{version.codigo.replace('PCGE_', '')}</span>
        <ChevronDown className="size-3.5 text-texto-sec" aria-hidden />
      </button>
      {abierto && (
        <div role="listbox" className="absolute top-11 right-0 z-40 w-80 rounded-lg border border-borde bg-white p-1.5 shadow-flotante">
          <p className="px-2.5 pt-1.5 pb-2 text-xs text-texto-sec">Versión del Plan Contable con la que desea trabajar</p>
          {versiones.map((v) => (
            <button
              key={v.codigo}
              role="option"
              aria-selected={v.codigo === version.codigo}
              onClick={() => {
                seleccionar(v.codigo)
                setAbierto(false)
              }}
              className="flex w-full items-start gap-2.5 rounded-md px-2.5 py-2 text-left hover:bg-slate-50"
            >
              <Check className={cx('mt-0.5 size-4 shrink-0 text-corporativo', v.codigo !== version.codigo && 'invisible')} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium">{v.nombre}</span>
                <span className="mt-1 flex flex-wrap items-center gap-1.5">
                  <Insignia tono={TONO_VIGENCIA[v.estado]}>{v.estadoEtiqueta}</Insignia>
                  {v.predeterminada && <span className="text-[11px] text-texto-sec">Predeterminada</span>}
                </span>
                {v.fechaAplicacionObligatoria && (
                  <span className="mt-1 block text-[11.5px] text-texto-sec">Obligatoria desde {formatearFechaLarga(v.fechaAplicacionObligatoria)}</span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ------------------------------------------------------------------ Notificaciones

const CLAVE_VISTO = 'contabilidad.notificaciones-vistas'

function Notificaciones() {
  const { versiones, version } = useVersionActiva()
  const { data } = useHistorial(undefined, 0)
  const [abierto, setAbierto] = useState(false)
  const [vistoHasta, setVistoHasta] = useState(() => localStorage.getItem(CLAVE_VISTO) ?? '')
  const ref = useRef<HTMLDivElement>(null)
  useClickFuera(ref, () => setAbierto(false))

  // Avisos normativos reales derivados de las fechas de vigencia registradas.
  const avisos = useMemo(
    () =>
      versiones
        .filter((v) => v.oficial && v.estado === 'POR_ENTRAR_EN_VIGENCIA' && v.fechaAplicacionObligatoria)
        .map((v) => ({
          id: v.codigo,
          texto: `El ${v.nombre} será de aplicación obligatoria desde el ${formatearFechaLarga(v.fechaAplicacionObligatoria)}.`,
          detalle: v.permiteAplicacionAnticipada ? 'La norma permite su aplicación anticipada.' : undefined,
        })),
    [versiones],
  )
  const cambios = (data?.contenido ?? []).slice(0, 6)
  const nuevos = cambios.filter((c) => c.fecha > vistoHasta).length

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => {
          setAbierto((a) => !a)
          if (cambios[0]) {
            localStorage.setItem(CLAVE_VISTO, cambios[0].fecha)
            setVistoHasta(cambios[0].fecha)
          }
        }}
        aria-label={`Notificaciones${nuevos ? `, ${nuevos} nuevas` : ''}`}
        className="relative grid size-9 place-items-center rounded-md text-texto-sec hover:bg-slate-100 hover:text-texto"
      >
        <Bell className="size-[18px]" />
        {(nuevos > 0 || avisos.length > 0) && <span className="absolute top-2 right-2 size-2 rounded-full bg-corporativo ring-2 ring-white" />}
      </button>
      {abierto && (
        <div className="absolute top-11 right-0 z-40 w-[22rem] overflow-hidden rounded-lg border border-borde bg-white shadow-flotante">
          <p className="border-b border-borde px-4 py-3 text-[13px] font-semibold">Notificaciones</p>
          <div className="max-h-[26rem] overflow-y-auto">
            {avisos.map((a) => (
              <div key={a.id} className="flex gap-3 border-b border-borde bg-corporativo-claro/60 px-4 py-3">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-corporativo" aria-hidden />
                <div className="text-[13px]">
                  <p className="text-texto">{a.texto}</p>
                  {a.detalle && <p className="mt-0.5 text-xs text-texto-sec">{a.detalle}</p>}
                </div>
              </div>
            ))}
            {cambios.length === 0 && avisos.length === 0 && <p className="px-4 py-8 text-center text-[13px] text-texto-sec">No hay notificaciones.</p>}
            {cambios.map((c) => (
              <div key={c.id} className="border-b border-borde px-4 py-3 last:border-0">
                <p className="text-[13px] text-texto">{c.resumen}</p>
                <p className="mt-0.5 text-xs text-texto-sec">
                  {c.usuario} · {haceCuanto(c.fecha)}
                  {c.versionCodigo && c.versionCodigo !== version?.codigo && ` · ${c.versionCodigo}`}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ------------------------------------------------------------------ Perfil

function MenuPerfil() {
  const { usuario, cerrar } = useSesion()
  const [abierto, setAbierto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useClickFuera(ref, () => setAbierto(false))
  if (!usuario) return null
  const iniciales = usuario.nombreCompleto.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setAbierto((a) => !a)} aria-expanded={abierto} className="flex items-center gap-2.5 rounded-md py-1 pr-2 pl-1 hover:bg-slate-100">
        <span className="grid size-8 place-items-center rounded-full bg-marino text-xs font-semibold text-white">{iniciales}</span>
        <span className="hidden text-left leading-tight whitespace-nowrap xl:block">
          <span className="block text-[13px] font-medium">{usuario.nombreCompleto}</span>
          <span className="block text-[11.5px] text-texto-sec">{usuario.roles.map((r) => ETIQUETA_ROL[r] ?? r).join(', ')}</span>
        </span>
        <ChevronDown className="hidden size-3.5 text-texto-sec xl:block" aria-hidden />
      </button>
      {abierto && (
        <div className="absolute top-11 right-0 z-40 w-64 rounded-lg border border-borde bg-white p-1.5 shadow-flotante">
          <div className="flex items-center gap-3 px-2.5 py-2.5">
            <UserCircle2 className="size-8 text-slate-400" aria-hidden />
            <div className="min-w-0 text-[13px]">
              <p className="truncate font-medium">{usuario.nombreCompleto}</p>
              <p className="truncate text-xs text-texto-sec">{usuario.email}</p>
            </div>
          </div>
          <div className="my-1 border-t border-borde" />
          <button onClick={() => cerrar()} className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] text-texto hover:bg-slate-50">
            <LogOut className="size-4 text-texto-sec" aria-hidden />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}

export function BarraSuperior({ alAbrirMenu }: { alAbrirMenu: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-borde bg-white/95 px-4 backdrop-blur sm:px-6">
      <button onClick={alAbrirMenu} className="grid size-9 place-items-center rounded-md text-texto-sec hover:bg-slate-100 xl:hidden" aria-label="Abrir menú">
        <Menu className="size-5" />
      </button>
      <BuscadorGlobal />
      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <SelectorVersion />
        <Notificaciones />
        <div className="mx-1 hidden h-6 w-px bg-borde sm:block" />
        <MenuPerfil />
      </div>
    </header>
  )
}
