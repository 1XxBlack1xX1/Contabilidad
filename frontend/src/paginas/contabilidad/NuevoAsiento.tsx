import { CheckCircle2, LayoutTemplate, Plus, Sparkles, Trash2, XCircle } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { ApiError } from '../../api/cliente'
import { resolverCuentas, useCrearAsiento } from '../../api/contabilidad'
import { DialogoPlantilla, aCentimos, type ResultadoPlantilla } from '../../componentes/contabilidad/DialogoPlantilla'
import { SelectorCuenta, type CuentaElegida } from '../../componentes/contabilidad/SelectorCuenta'
import { Aviso, Boton, CampoTexto, EncabezadoPagina, Tarjeta, cx } from '../../componentes/ui'
import { useNotificar } from '../../contexto/Notificaciones'
import { useVersionActiva } from '../../contexto/Version'
import { formatearImporte, hoyISO } from '../../utilidades/formato'
import { CUENTA_IGV, TASA_IGV, sugerenciaIgv } from '../../utilidades/plantillasAsiento'

interface Linea {
  clave: number
  cuenta: CuentaElegida | null
  glosa: string
  debe: string
  haber: string
}

let siguienteClave = 1
const lineaVacia = (): Linea => ({ clave: siguienteClave++, cuenta: null, glosa: '', debe: '', haber: '' })

const estiloImporte =
  'codigo h-9 w-full rounded-md border bg-white px-2.5 text-right text-[13px] focus:border-corporativo focus:ring-2 focus:ring-corporativo/15 focus:outline-none'

export default function NuevoAsiento() {
  const { version } = useVersionActiva()
  const navegar = useNavigate()
  const notificar = useNotificar()
  const crear = useCrearAsiento()
  const [fecha, setFecha] = useState(hoyISO())
  const [glosa, setGlosa] = useState('')
  const [documento, setDocumento] = useState('')
  const [lineas, setLineas] = useState<Linea[]>([lineaVacia(), lineaVacia()])
  const [intentado, setIntentado] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [erroresCampos, setErroresCampos] = useState<Record<string, string>>({})
  const [plantillaAbierta, setPlantillaAbierta] = useState(false)
  const tieneIgv = lineas.some((l) => l.cuenta?.codigo === CUENTA_IGV)

  /** Agrega las líneas de la plantilla, conservando las que ya tienen datos. */
  const aplicarPlantilla = (r: ResultadoPlantilla) => {
    const conDatos = lineas.filter((l) => l.cuenta || l.debe || l.haber || l.glosa)
    setLineas([...conDatos, ...r.lineas.map((l) => ({ ...lineaVacia(), cuenta: l.cuenta, glosa: l.glosa, debe: l.debe, haber: l.haber }))])
    if (!glosa.trim()) setGlosa(r.glosa)
    notificar.exito('Líneas generadas. Revíselas antes de registrar.')
  }

  /** Agrega la línea de IGV y la cuenta por pagar o por cobrar, tomando como base imponible el importe de la línea. */
  const agregarIgv = async (l: Linea) => {
    const lado = aCentimos(l.debe) ? 'debe' : 'haber'
    const s = l.cuenta ? sugerenciaIgv(l.cuenta.codigo, lado) : null
    const base = aCentimos(lado === 'debe' ? l.debe : l.haber)
    if (!s || !base || !version) return
    const cuentas = await resolverCuentas(version.codigo, [CUENTA_IGV, s.contrapartida])
    const igv = Math.round((base * TASA_IGV) / 100)
    const texto = (n: number) => (n / 100).toFixed(2)
    const lineaIgv: Linea = {
      ...lineaVacia(), cuenta: cuentas.get(CUENTA_IGV) ?? null, glosa: `IGV ${TASA_IGV} %`,
      debe: s.ladoIgv === 'debe' ? texto(igv) : '', haber: s.ladoIgv === 'haber' ? texto(igv) : '',
    }
    const lineaTotal: Linea = {
      ...lineaVacia(), cuenta: cuentas.get(s.contrapartida) ?? null, glosa: '',
      debe: s.ladoIgv === 'haber' ? texto(base + igv) : '', haber: s.ladoIgv === 'debe' ? texto(base + igv) : '',
    }
    setLineas((ls) => [...ls.filter((x) => x.cuenta || x.debe || x.haber), lineaIgv, lineaTotal])
    notificar.exito(`Se agregó el IGV (S/ ${formatearImporte(igv / 100)}) y la cuenta ${s.contrapartida} por S/ ${formatearImporte((base + igv) / 100)}.`)
  }

  const cambiar = (clave: number, cambios: Partial<Linea>) =>
    setLineas((ls) => ls.map((l) => (l.clave === clave ? { ...l, ...cambios } : l)))

  const resumen = useMemo(() => {
    let debe = 0
    let haber = 0
    let invalidas = 0
    lineas.forEach((l) => {
      const d = aCentimos(l.debe)
      const h = aCentimos(l.haber)
      if (d === null || h === null || !l.cuenta || (d > 0) === (h > 0)) invalidas++
      debe += d ?? 0
      haber += h ?? 0
    })
    return { debe, haber, diferencia: debe - haber, invalidas }
  }, [lineas])
  const cuadra = resumen.debe > 0 && resumen.diferencia === 0
  const listo = cuadra && resumen.invalidas === 0 && glosa.trim().length > 0 && !!fecha && lineas.length >= 2

  const errorLinea = (l: Linea) => {
    if (!intentado) return null
    if (!l.cuenta) return 'Seleccione la cuenta'
    const d = aCentimos(l.debe)
    const h = aCentimos(l.haber)
    if (d === null || h === null) return 'Importe no válido (use punto decimal y hasta 2 decimales)'
    if ((d > 0) === (h > 0)) return 'Indique un importe al debe o al haber'
    return null
  }

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    setIntentado(true)
    setError(null)
    setErroresCampos({})
    if (!listo || !version) return
    try {
      const a = await crear.mutateAsync({
        version: version.codigo,
        fecha,
        glosa: glosa.trim(),
        documentoReferencia: documento.trim() || undefined,
        lineas: lineas.map((l) => ({
          cuentaId: l.cuenta!.id,
          glosa: l.glosa.trim() || undefined,
          debe: aCentimos(l.debe)! / 100,
          haber: aCentimos(l.haber)! / 100,
        })),
      })
      notificar.exito(`Asiento ${a.numero} registrado.`)
      navegar(`/asientos/${a.id}`)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
        if (err.campos) setErroresCampos(err.campos)
      } else setError('No se pudo registrar el asiento.')
    }
  }

  return (
    <>
      <EncabezadoPagina
        titulo="Nuevo asiento"
        migas={<Link to="/asientos" className="hover:text-corporativo">Asientos contables</Link>}
        descripcion={`Partida doble con las cuentas de movimiento del ${version?.nombre ?? 'PCGE'}. Una vez registrado, el asiento no se modifica: si hay un error, se anula y se registra uno nuevo.`}
      />
      <form onSubmit={enviar} noValidate>
        <Tarjeta>
          <div className="grid gap-4 border-b border-borde p-5 md:grid-cols-[11rem_1fr_14rem]">
            <CampoTexto etiqueta="Fecha" type="date" obligatorio value={fecha} max={hoyISO()} onChange={(e) => setFecha(e.target.value)} error={erroresCampos.fecha} />
            <CampoTexto etiqueta="Glosa" obligatorio value={glosa} maxLength={300} onChange={(e) => setGlosa(e.target.value)}
              placeholder="Descripción de la operación, p. ej. Venta de mercaderías según factura F001-125"
              error={intentado && !glosa.trim() ? 'Indique la glosa del asiento' : erroresCampos.glosa} />
            <CampoTexto etiqueta="Documento de referencia" value={documento} maxLength={60} onChange={(e) => setDocumento(e.target.value)} placeholder="F001-000125" />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-borde px-5 py-2.5">
            <p className="text-[13px] text-texto-sec">Elija las cuentas e importes, o use una plantilla de operación frecuente.</p>
            <Boton tamano="sm" icono={<LayoutTemplate className="size-4" />} onClick={() => setPlantillaAbierta(true)}>Usar plantilla</Boton>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-[13px]">
              <thead>
                <tr className="border-b border-borde bg-slate-50/80 text-left text-xs font-semibold tracking-wide text-texto-sec uppercase">
                  <th className="w-10 px-4 py-2.5 text-center">#</th>
                  <th className="px-2 py-2.5">Cuenta</th>
                  <th className="w-64 px-2 py-2.5">Glosa de la línea (opcional)</th>
                  <th className="w-36 px-2 py-2.5 text-right">Debe (S/)</th>
                  <th className="w-36 px-2 py-2.5 text-right">Haber (S/)</th>
                  <th className="w-12 px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {lineas.map((l, i) => {
                  const err = errorLinea(l)
                  return (
                    <tr key={l.clave} className="border-b border-borde align-top">
                      <td className="px-4 py-2.5 text-center text-texto-sec">{i + 1}</td>
                      <td className="px-2 py-2">
                        <SelectorCuenta valor={l.cuenta} alCambiar={(c) => cambiar(l.clave, { cuenta: c })} invalido={!!err && !l.cuenta} etiqueta={`Cuenta de la línea ${i + 1}`} />
                        {err && <p className="mt-1 text-xs text-error">{err}</p>}
                        <SugerenciaIgv linea={l} tieneIgv={tieneIgv} alAgregar={() => agregarIgv(l)} />
                      </td>
                      <td className="px-2 py-2">
                        <input value={l.glosa} maxLength={300} onChange={(e) => cambiar(l.clave, { glosa: e.target.value })} aria-label={`Glosa de la línea ${i + 1}`}
                          className="h-9 w-full rounded-md border border-borde px-2.5 focus:border-corporativo focus:ring-2 focus:ring-corporativo/15 focus:outline-none" />
                      </td>
                      <td className="px-2 py-2">
                        <input inputMode="decimal" value={l.debe} placeholder="0.00" aria-label={`Debe de la línea ${i + 1}`}
                          onChange={(e) => cambiar(l.clave, { debe: e.target.value, haber: e.target.value ? '' : l.haber })}
                          className={cx(estiloImporte, aCentimos(l.debe) === null ? 'border-error' : 'border-borde')} />
                      </td>
                      <td className="px-2 py-2">
                        <input inputMode="decimal" value={l.haber} placeholder="0.00" aria-label={`Haber de la línea ${i + 1}`}
                          onChange={(e) => cambiar(l.clave, { haber: e.target.value, debe: e.target.value ? '' : l.debe })}
                          className={cx(estiloImporte, aCentimos(l.haber) === null ? 'border-error' : 'border-borde')} />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button type="button" disabled={lineas.length <= 2} onClick={() => setLineas((ls) => ls.filter((x) => x.clave !== l.clave))}
                          className="grid size-9 place-items-center rounded-md text-texto-sec hover:bg-error-claro hover:text-error disabled:invisible" aria-label={`Quitar línea ${i + 1}`}>
                          <Trash2 className="size-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50/80 font-semibold">
                  <td colSpan={2} className="px-4 py-3">
                    <Boton tamano="sm" variante="fantasma" icono={<Plus className="size-4" />} onClick={() => setLineas((ls) => [...ls, lineaVacia()])} disabled={lineas.length >= 200}>
                      Agregar línea
                    </Boton>
                  </td>
                  <td className="px-2 py-3 text-right text-texto-sec">Totales</td>
                  <td className="codigo px-4 py-3 text-right">{formatearImporte(resumen.debe / 100)}</td>
                  <td className="codigo px-4 py-3 text-right">{formatearImporte(resumen.haber / 100)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex flex-wrap items-center gap-4 px-5 py-4">
            {resumen.debe === 0 && resumen.haber === 0 ? (
              <span className="text-[13px] text-texto-sec">Ingrese los importes de cada línea.</span>
            ) : cuadra ? (
              <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-exito"><CheckCircle2 className="size-4" /> El asiento cuadra: debe = haber</span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-error">
                <XCircle className="size-4" /> Diferencia de S/ {formatearImporte(Math.abs(resumen.diferencia) / 100)} {resumen.diferencia > 0 ? 'en el debe' : 'en el haber'}
              </span>
            )}
            <div className="ml-auto flex gap-2">
              <Boton onClick={() => navegar('/asientos')}>Cancelar</Boton>
              <Boton type="submit" variante="primario" cargando={crear.isPending} disabled={!listo && intentado}>Registrar asiento</Boton>
            </div>
          </div>
          {error && <div className="px-5 pb-5"><Aviso tono="error">{error}</Aviso></div>}
        </Tarjeta>
      </form>
      <DialogoPlantilla abierto={plantillaAbierta} alCerrar={() => setPlantillaAbierta(false)} alAplicar={aplicarPlantilla} />
    </>
  )
}

/** Botón que aparece bajo una línea de compra (al debe) o de venta (al haber) para agregar el IGV. */
function SugerenciaIgv({ linea, tieneIgv, alAgregar }: { linea: Linea; tieneIgv: boolean; alAgregar: () => void }) {
  const lado = aCentimos(linea.debe) ? 'debe' : aCentimos(linea.haber) ? 'haber' : null
  const s = linea.cuenta && lado && !tieneIgv ? sugerenciaIgv(linea.cuenta.codigo, lado) : null
  if (!s) return null
  return (
    <button type="button" onClick={alAgregar}
      className="mt-1.5 inline-flex items-center gap-1.5 rounded-md bg-corporativo-claro px-2 py-1 text-xs font-medium text-corporativo hover:bg-corporativo hover:text-white">
      <Sparkles className="size-3.5" aria-hidden /> Agregar IGV {TASA_IGV} % {s.descripcion}
    </button>
  )
}
