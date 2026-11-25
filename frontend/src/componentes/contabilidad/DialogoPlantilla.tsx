import { useEffect, useMemo, useState } from 'react'
import { resolverCuentas } from '../../api/contabilidad'
import { useVersionActiva } from '../../contexto/Version'
import { formatearImporte } from '../../utilidades/formato'
import { PLANTILLAS, TASA_IGV, aplicarPlantilla, calcularMontos, type LineaCalculada, type Plantilla } from '../../utilidades/plantillasAsiento'
import { Aviso, Boton, Codigo, Dialogo, cx } from '../ui'
import type { CuentaElegida } from './SelectorCuenta'

export interface ResultadoPlantilla {
  glosa: string
  lineas: { cuenta: CuentaElegida | null; codigo: string; glosa: string; debe: string; haber: string }[]
}

/** Convierte "1,234.50" en céntimos; null si no es un importe válido. */
export function aCentimos(texto: string): number | null {
  const limpio = texto.replace(/,/g, '').trim()
  if (!limpio) return 0
  if (!/^\d+(\.\d{0,2})?$/.test(limpio)) return null
  return Math.round(Number(limpio) * 100)
}

const aTexto = (centimos: number) => (centimos / 100).toFixed(2)

/** Asistente de asientos frecuentes: el usuario indica el importe y se generan las líneas. */
export function DialogoPlantilla({ abierto, alCerrar, alAplicar }: { abierto: boolean; alCerrar: () => void; alAplicar: (r: ResultadoPlantilla) => void }) {
  const { codigo: version } = useVersionActiva()
  const [plantilla, setPlantilla] = useState<Plantilla>(PLANTILLAS[0])
  const [importe, setImporte] = useState('')
  const [incluyeIgv, setIncluyeIgv] = useState(false)
  const [tasa, setTasa] = useState(String(TASA_IGV))
  const [cuentas, setCuentas] = useState<Map<string, CuentaElegida | null>>(new Map())
  const [aplicando, setAplicando] = useState(false)

  useEffect(() => {
    if (!abierto || !version) return
    resolverCuentas(version, PLANTILLAS.flatMap((p) => p.lineas.map((l) => l.codigo))).then(setCuentas)
  }, [abierto, version])

  const centimos = aCentimos(importe)
  const tasaNumero = Number(tasa)
  const tasaValida = Number.isFinite(tasaNumero) && tasaNumero >= 0 && tasaNumero <= 100
  const lineas: LineaCalculada[] = useMemo(() => {
    if (!centimos || !tasaValida) return []
    return aplicarPlantilla(plantilla, calcularMontos(centimos, incluyeIgv, tasaNumero, plantilla.conIgv))
  }, [plantilla, centimos, incluyeIgv, tasaNumero, tasaValida])
  const faltantes = plantilla.lineas.filter((l) => cuentas.size > 0 && !cuentas.get(l.codigo)).map((l) => l.codigo)

  const aplicar = () => {
    setAplicando(true)
    alAplicar({
      glosa: plantilla.glosa,
      lineas: lineas.map((l) => ({
        cuenta: cuentas.get(l.codigo) ?? null,
        codigo: l.codigo,
        glosa: l.glosa ?? '',
        debe: l.lado === 'debe' ? aTexto(l.centimos) : '',
        haber: l.lado === 'haber' ? aTexto(l.centimos) : '',
      })),
    })
    setAplicando(false)
    setImporte('')
    alCerrar()
  }

  return (
    <Dialogo abierto={abierto} alCerrar={alCerrar} titulo="Usar plantilla de asiento" ancho="max-w-3xl"
      descripcion="Elija la operación e indique el importe: las líneas se completan solas. Después puede revisarlas y modificarlas antes de registrar."
      pie={<><Boton onClick={alCerrar}>Cancelar</Boton><Boton variante="primario" onClick={aplicar} cargando={aplicando} disabled={lineas.length === 0}>Usar estas líneas</Boton></>}>
      <div className="grid gap-5 md:grid-cols-[15rem_1fr]">
        <div role="radiogroup" aria-label="Plantillas" className="space-y-1">
          {PLANTILLAS.map((p) => (
            <button key={p.id} type="button" role="radio" aria-checked={p.id === plantilla.id} onClick={() => setPlantilla(p)}
              className={cx('w-full rounded-md border px-3 py-2 text-left text-[13px] transition-colors',
                p.id === plantilla.id ? 'border-corporativo bg-corporativo-claro/60 font-medium text-corporativo' : 'border-transparent hover:bg-slate-50')}>
              {p.titulo}
            </button>
          ))}
        </div>
        <div className="min-w-0">
          <p className="text-[13px] text-texto-sec">{plantilla.descripcion}</p>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-texto-sec">{plantilla.etiquetaImporte} (S/)</span>
              <input autoFocus inputMode="decimal" value={importe} onChange={(e) => setImporte(e.target.value)} placeholder="0.00"
                className={cx('codigo h-9 w-40 rounded-md border px-3 text-right text-sm focus:border-corporativo focus:ring-2 focus:ring-corporativo/15 focus:outline-none',
                  centimos === null ? 'border-error' : 'border-borde')} />
            </label>
            {plantilla.conIgv && (
              <>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-texto-sec">Tasa IGV (%)</span>
                  <input inputMode="decimal" value={tasa} onChange={(e) => setTasa(e.target.value)}
                    className={cx('codigo h-9 w-20 rounded-md border px-3 text-right text-sm focus:outline-none', tasaValida ? 'border-borde' : 'border-error')} />
                </label>
                <fieldset className="flex gap-3 pb-2 text-[13px]">
                  <label className="flex items-center gap-1.5"><input type="radio" checked={!incluyeIgv} onChange={() => setIncluyeIgv(false)} className="accent-[#1d4ed8]" /> Es la base imponible</label>
                  <label className="flex items-center gap-1.5"><input type="radio" checked={incluyeIgv} onChange={() => setIncluyeIgv(true)} className="accent-[#1d4ed8]" /> Incluye IGV</label>
                </fieldset>
              </>
            )}
          </div>

          <div className="mt-4 overflow-hidden rounded-md border border-borde">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-semibold text-texto-sec uppercase">
                  <th className="px-3 py-2">Cuenta</th><th className="px-3 py-2 text-right">Debe</th><th className="px-3 py-2 text-right">Haber</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borde">
                {plantilla.lineas.map((l, i) => {
                  const c = cuentas.get(l.codigo)
                  const calc = lineas[i]
                  return (
                    <tr key={i}>
                      <td className={cx('px-3 py-1.5', l.lado === 'haber' && 'pl-8')}>
                        <Codigo valor={l.codigo} /> <span className={c ? '' : 'text-error'}>{c?.denominacion ?? (cuentas.size ? 'No disponible en esta versión' : '…')}</span>
                        {l.glosa && <span className="block text-xs text-texto-sec">{l.glosa}</span>}
                      </td>
                      <td className="codigo px-3 py-1.5 text-right">{calc && l.lado === 'debe' ? formatearImporte(calc.centimos / 100) : ''}</td>
                      <td className="codigo px-3 py-1.5 text-right">{calc && l.lado === 'haber' ? formatearImporte(calc.centimos / 100) : ''}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {plantilla.aviso && <Aviso tono="info" className="mt-3">{plantilla.aviso}</Aviso>}
          {faltantes.length > 0 && (
            <Aviso tono="advertencia" className="mt-3">
              Las cuentas {faltantes.join(', ')} no están disponibles (no existen, están inactivas o tienen subcuentas). Esas líneas quedarán sin cuenta para que la elija.
            </Aviso>
          )}
        </div>
      </div>
    </Dialogo>
  )
}
