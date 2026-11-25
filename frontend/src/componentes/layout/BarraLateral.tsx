import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { NavLink, useLocation } from 'react-router'
import { useSesion } from '../../contexto/Sesion'
import { cx } from '../ui'
import { NAVEGACION, type ItemNavegacion } from './navegacion'

function Logo() {
  return (
    <div className="flex items-center gap-3 px-5 pt-5 pb-6">
      <div className="grid size-9 place-items-center rounded-lg bg-white/10 ring-1 ring-white/15">
        <svg viewBox="0 0 32 32" className="size-5" aria-hidden>
          <path d="M9 22V10h3v12zM14.5 22V14h3v8zM20 22v-5h3v5z" fill="#fff" />
          <path d="M8 24.5h16" stroke="#60A5FA" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </div>
      <div className="leading-tight">
        <p className="text-[15px] font-semibold tracking-[0.08em] text-white">CONTABILIDAD</p>
        <p className="text-[11px] text-slate-400">Plan Contable General Empresarial</p>
      </div>
    </div>
  )
}

const estiloEnlace = ({ isActive }: { isActive: boolean }) =>
  cx(
    'group flex h-9 items-center gap-3 rounded-md px-3 text-[13.5px] transition-colors',
    isActive ? 'bg-white/10 font-medium text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white',
  )

function Enlace({ item, alNavegar }: { item: ItemNavegacion; alNavegar?: () => void }) {
  const Icono = item.icono
  return (
    <NavLink to={item.ruta} end={item.ruta === '/'} className={estiloEnlace} onClick={alNavegar}>
      {({ isActive }) => (
        <>
          <Icono className={cx('size-4 shrink-0', isActive ? 'text-[#7cacff]' : 'text-slate-400 group-hover:text-slate-200')} aria-hidden />
          <span className="flex-1 truncate">{item.etiqueta}</span>
        </>
      )}
    </NavLink>
  )
}

function Grupo({ item, alNavegar }: { item: ItemNavegacion; alNavegar?: () => void }) {
  const { pathname } = useLocation()
  const { puede } = useSesion()
  const activo = pathname.startsWith(item.ruta)
  const [abierto, setAbierto] = useState(true)
  const Icono = item.icono
  return (
    <div>
      <button
        onClick={() => setAbierto((a) => !a)}
        aria-expanded={abierto}
        className={cx('flex h-9 w-full items-center gap-3 rounded-md px-3 text-[13.5px] transition-colors hover:bg-white/5', activo ? 'text-white' : 'text-slate-300')}
      >
        <Icono className={cx('size-4', activo ? 'text-[#7cacff]' : 'text-slate-400')} aria-hidden />
        <span className="flex-1 text-left font-medium">{item.etiqueta}</span>
        <ChevronDown className={cx('size-4 text-slate-500 transition-transform', !abierto && '-rotate-90')} aria-hidden />
      </button>
      {abierto && (
        <div className="mt-0.5 ml-[21px] space-y-0.5 border-l border-white/10 pl-3">
          {item.hijos!.filter((h) => !h.permiso || puede(h.permiso)).map((h) => (
            <Enlace key={h.ruta} item={h} alNavegar={alNavegar} />
          ))}
        </div>
      )}
    </div>
  )
}

export function BarraLateral({ alNavegar }: { alNavegar?: () => void }) {
  const { puede } = useSesion()
  return (
    <nav aria-label="Navegación principal" className="flex h-full flex-col bg-marino">
      <Logo />
      <div className="flex-1 space-y-6 overflow-y-auto px-3 pb-6">
        {NAVEGACION.map((s, i) => {
          const items = s.items.filter((it) => !it.permiso || puede(it.permiso))
          if (!items.length) return null
          return (
            <div key={i}>
              {s.titulo && <p className="mb-2 px-3 text-[11px] font-semibold tracking-[0.12em] text-slate-500 uppercase">{s.titulo}</p>}
              <div className="space-y-0.5">
                {items.map((it) => (it.hijos ? <Grupo key={it.ruta} item={it} alNavegar={alNavegar} /> : <Enlace key={it.ruta} item={it} alNavegar={alNavegar} />))}
              </div>
            </div>
          )
        })}
      </div>
      <div className="border-t border-white/10 px-5 py-3 text-[11px] text-slate-500">Fuente: MEF – Consejo Normativo de Contabilidad</div>
    </nav>
  )
}
