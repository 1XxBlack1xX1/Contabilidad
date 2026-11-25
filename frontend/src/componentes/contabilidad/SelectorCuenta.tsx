import { Search, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useCuentasMovimiento, useCuentasTodas } from '../../api/contabilidad'
import type { CuentaResumen } from '../../api/tipos'
import { useVersionActiva } from '../../contexto/Version'
import { cx } from '../ui'

export interface CuentaElegida {
  id: number
  codigo: string
  denominacion: string
}

interface Props {
  valor: CuentaElegida | null
  alCambiar: (c: CuentaElegida | null) => void
  /** movimiento: solo cuentas activas de último nivel (para asientos). todas: cualquier cuenta (para consultas). */
  modo?: 'movimiento' | 'todas'
  invalido?: boolean
  etiqueta?: string
  autoFocus?: boolean
}

/** Buscador de cuentas por código o nombre, con navegación por teclado. */
export function SelectorCuenta({ valor, alCambiar, modo = 'movimiento', invalido, etiqueta = 'Cuenta', autoFocus }: Props) {
  const { codigo: version } = useVersionActiva()
  const [texto, setTexto] = useState('')
  const [abierto, setAbierto] = useState(false)
  const [activo, setActivo] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const idLista = useId()
  const mov = useCuentasMovimiento(modo === 'movimiento' ? version : undefined, texto)
  const todas = useCuentasTodas(modo === 'todas' ? version : undefined, texto)
  const resultados: CuentaResumen[] = (modo === 'movimiento' ? mov.data : todas.data) ?? []
  const buscando = modo === 'movimiento' ? mov.isFetching : todas.isFetching

  useEffect(() => {
    const f = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setAbierto(false)
    document.addEventListener('mousedown', f)
    return () => document.removeEventListener('mousedown', f)
  }, [])

  const elegir = (c: CuentaResumen) => {
    alCambiar({ id: c.id, codigo: c.codigo, denominacion: c.denominacion })
    setTexto('')
    setAbierto(false)
  }

  if (valor) {
    return (
      <div className={cx('flex h-9 items-center gap-2 rounded-md border bg-white px-2.5 text-[13px]', invalido ? 'border-error' : 'border-borde')}>
        <span className="codigo shrink-0 font-semibold text-marino">{valor.codigo}</span>
        <span className="min-w-0 flex-1 truncate" title={valor.denominacion}>{valor.denominacion}</span>
        <button type="button" onClick={() => alCambiar(null)} className="rounded p-0.5 text-texto-sec hover:bg-slate-100 hover:text-texto" aria-label={`Quitar ${etiqueta.toLowerCase()}`}>
          <X className="size-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div ref={ref} className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-slate-400" aria-hidden />
      <input
        role="combobox"
        aria-label={etiqueta}
        aria-expanded={abierto && texto.length > 0}
        aria-controls={idLista}
        aria-invalid={invalido}
        autoFocus={autoFocus}
        value={texto}
        placeholder="Código o nombre…"
        onChange={(e) => {
          setTexto(e.target.value)
          setAbierto(true)
          setActivo(0)
        }}
        onFocus={() => setAbierto(true)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActivo((a) => Math.min(a + 1, resultados.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActivo((a) => Math.max(a - 1, 0))
          } else if (e.key === 'Enter' && resultados[activo]) {
            e.preventDefault()
            elegir(resultados[activo])
          } else if (e.key === 'Escape') setAbierto(false)
        }}
        className={cx(
          'h-9 w-full rounded-md border bg-white pr-2 pl-8 text-[13px] placeholder:text-slate-400 focus:border-corporativo focus:ring-2 focus:ring-corporativo/15 focus:outline-none',
          invalido ? 'border-error' : 'border-borde',
        )}
      />
      {abierto && texto.trim().length > 0 && (
        <ul id={idLista} role="listbox" className="absolute top-10 left-0 z-30 max-h-72 w-[min(30rem,90vw)] overflow-y-auto rounded-lg border border-borde bg-white py-1 shadow-flotante">
          {resultados.length === 0 ? (
            <li className="px-3 py-3 text-[13px] text-texto-sec">
              {buscando ? 'Buscando…' : modo === 'movimiento' ? 'Sin cuentas de movimiento que coincidan (solo se admiten cuentas activas de último nivel).' : 'Sin coincidencias.'}
            </li>
          ) : (
            resultados.map((c, i) => (
              <li key={c.id} role="option" aria-selected={i === activo}>
                <button type="button" onMouseEnter={() => setActivo(i)} onClick={() => elegir(c)}
                  className={cx('flex w-full items-baseline gap-3 px-3 py-1.5 text-left text-[13px]', i === activo && 'bg-corporativo-claro')}>
                  <span className="codigo w-16 shrink-0 font-semibold text-marino">{c.codigo}</span>
                  <span className="truncate">{c.denominacion}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
