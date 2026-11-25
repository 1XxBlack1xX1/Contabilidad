import { CheckCircle2, XCircle } from 'lucide-react'
import { useState } from 'react'
import { useResultados, useSituacion } from '../../api/contabilidad'
import type { SeccionReporte } from '../../api/tipos'
import { BarraPeriodo, BotonesExportar } from '../../componentes/contabilidad/BarraPeriodo'
import { Aviso, Cargando, Codigo, EncabezadoPagina, Tarjeta, cx } from '../../componentes/ui'
import { useVersionActiva } from '../../contexto/Version'
import { formatearFechaLarga, formatearImporte, hoyISO, inicioDeAnioISO } from '../../utilidades/formato'

function Seccion({ s }: { s: SeccionReporte }) {
  return (
    <>
      <tr className="bg-corporativo-claro/60"><td colSpan={3} className="px-5 py-2 text-xs font-semibold tracking-wide text-marino uppercase">{s.titulo}</td></tr>
      {s.lineas.length === 0 && <tr><td colSpan={3} className="px-5 py-2 pl-10 text-texto-sec">Sin saldos</td></tr>}
      {s.lineas.map((l) => (
        <tr key={l.codigo}>
          <td className="w-20 px-5 py-1.5 pl-10"><Codigo valor={l.codigo} /></td>
          <td className="px-3 py-1.5">{l.denominacion}</td>
          <td className="codigo w-44 px-5 py-1.5 text-right">{formatearImporte(l.importe)}</td>
        </tr>
      ))}
      <tr className="border-t border-borde font-semibold">
        <td />
        <td className="px-3 py-2">Total {s.titulo.toLowerCase()}</td>
        <td className="codigo px-5 py-2 text-right">{formatearImporte(s.total)}</td>
      </tr>
    </>
  )
}

function Situacion({ version }: { version?: string }) {
  const [hasta, setHasta] = useState(hoyISO())
  const { data, isLoading, isError, error } = useSituacion(version, hasta)
  return (
    <>
      <BarraPeriodo hasta={hasta} alCambiarHasta={setHasta}
        exportar={<BotonesExportar ruta="/api/reportes/situacion-financiera/exportar" parametros={{ version, hasta }} deshabilitado={!data} />} />
      {isError ? <div className="p-5"><Aviso tono="error">{(error as Error).message}</Aviso></div> : isLoading || !data ? <Cargando /> : (
        <>
          <div className="border-b border-borde px-5 py-3 text-[13px]">
            {data.cuadra
              ? <span className="inline-flex items-center gap-1.5 font-medium text-exito"><CheckCircle2 className="size-4" /> Activo = Pasivo + Patrimonio</span>
              : <span className="inline-flex items-center gap-1.5 font-medium text-error"><XCircle className="size-4" /> La ecuación contable no cuadra.</span>}
            <span className="ml-3 text-texto-sec">Al {formatearFechaLarga(data.hasta)} · importes en soles</span>
          </div>
          <div className="grid items-start gap-0 lg:grid-cols-2 lg:divide-x lg:divide-borde">
            <table className="w-full text-[13px]"><tbody><Seccion s={data.activo} />
              <tr className="border-t-2 border-marino/20 bg-slate-50 font-semibold"><td /><td className="px-3 py-3">TOTAL ACTIVO</td><td className="codigo px-5 py-3 text-right">{formatearImporte(data.activo.total)}</td></tr>
            </tbody></table>
            <table className="w-full text-[13px]"><tbody>
              <Seccion s={data.pasivo} />
              <Seccion s={data.patrimonio} />
              <tr><td /><td className="px-3 py-2">Resultado del ejercicio (no trasladado al patrimonio)</td><td className="codigo px-5 py-2 text-right">{formatearImporte(data.resultadoEjercicio)}</td></tr>
              <tr className="border-t-2 border-marino/20 bg-slate-50 font-semibold"><td /><td className="px-3 py-3">TOTAL PASIVO Y PATRIMONIO</td><td className="codigo px-5 py-3 text-right">{formatearImporte(data.totalPasivoPatrimonio)}</td></tr>
            </tbody></table>
          </div>
        </>
      )}
    </>
  )
}

function Resultados({ version }: { version?: string }) {
  const [desde, setDesde] = useState(inicioDeAnioISO())
  const [hasta, setHasta] = useState(hoyISO())
  const { data, isLoading, isError, error } = useResultados(version, desde, hasta)
  return (
    <>
      <BarraPeriodo desde={desde} hasta={hasta} alCambiarDesde={setDesde} alCambiarHasta={setHasta}
        exportar={<BotonesExportar ruta="/api/reportes/resultados/exportar" parametros={{ version, desde, hasta }} deshabilitado={!data} />} />
      {isError ? <div className="p-5"><Aviso tono="error">{(error as Error).message}</Aviso></div> : isLoading || !data ? <Cargando /> : (
        <table className="w-full max-w-4xl text-[13px]"><tbody>
          <Seccion s={data.ingresos} />
          <Seccion s={data.gastos} />
          <tr className={cx('border-t-2 border-marino/20 bg-slate-50 font-semibold', data.resultado < 0 && 'text-error')}>
            <td /><td className="px-3 py-3">{data.resultado >= 0 ? 'UTILIDAD DEL PERÍODO' : 'PÉRDIDA DEL PERÍODO'}</td>
            <td className="codigo w-44 px-5 py-3 text-right">{formatearImporte(data.resultado)}</td>
          </tr>
        </tbody></table>
      )}
    </>
  )
}

export default function Reportes() {
  const { codigo: version } = useVersionActiva()
  const [pestana, setPestana] = useState<'situacion' | 'resultados'>('situacion')
  return (
    <>
      <EncabezadoPagina titulo="Reportes" descripcion="Reportes de gestión calculados con los saldos de los asientos registrados." />
      <div role="tablist" className="mb-4 flex gap-1 border-b border-borde">
        {([['situacion', 'Estado de situación financiera'], ['resultados', 'Estado de resultados']] as const).map(([id, t]) => (
          <button key={id} role="tab" aria-selected={pestana === id} onClick={() => setPestana(id)}
            className={cx('-mb-px border-b-2 px-4 py-2.5 text-[13.5px] font-medium transition-colors',
              pestana === id ? 'border-corporativo text-corporativo' : 'border-transparent text-texto-sec hover:text-texto')}>
            {t}
          </button>
        ))}
      </div>
      <Tarjeta>{pestana === 'situacion' ? <Situacion version={version} /> : <Resultados version={version} />}</Tarjeta>
      <Aviso tono="info" className="mt-4">
        {pestana === 'situacion'
          ? 'Activo: elementos 1 a 3; pasivo: elemento 4; patrimonio: elemento 5. El resultado del ejercicio suma los elementos 6 a 9 (las cargas imputables de la cuenta 79 se compensan con el elemento 9). '
          : 'Ingresos: elemento 7, sin la cuenta 79 (cargas imputables). Gastos: elemento 6. Si ya registró los asientos de cierre, los saldos se habrán trasladado al elemento 8. '}
        Son reportes de gestión: no reemplazan a los estados financieros elaborados conforme a las NIIF (clasificación corriente/no corriente, revelaciones).
      </Aviso>
    </>
  )
}
