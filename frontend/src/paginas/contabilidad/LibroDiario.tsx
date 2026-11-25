import { BookText } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { useLibroDiario } from '../../api/contabilidad'
import { BarraPeriodo, BotonesExportar } from '../../componentes/contabilidad/BarraPeriodo'
import { Aviso, Cargando, Codigo, EncabezadoPagina, EstadoVacio, Tarjeta } from '../../componentes/ui'
import { useVersionActiva } from '../../contexto/Version'
import { formatearFecha, formatearImporte, hoyISO, inicioDeAnioISO } from '../../utilidades/formato'

export default function LibroDiario() {
  const { codigo: version } = useVersionActiva()
  const [desde, setDesde] = useState(inicioDeAnioISO())
  const [hasta, setHasta] = useState(hoyISO())
  const rangoInvalido = !!desde && !!hasta && desde > hasta
  const { data, isLoading, isError, error } = useLibroDiario(version, desde, hasta)

  return (
    <>
      <EncabezadoPagina titulo="Libro diario" descripcion="Asientos registrados en orden cronológico. Los asientos anulados no se incluyen." />
      <Tarjeta>
        <BarraPeriodo desde={desde} hasta={hasta} alCambiarDesde={setDesde} alCambiarHasta={setHasta}
          error={rangoInvalido ? 'La fecha inicial no puede ser posterior a la final.' : null}
          exportar={<BotonesExportar ruta="/api/libros/diario/exportar" parametros={{ version, desde, hasta }} deshabilitado={!data || data.asientos.length === 0} />} />
        {isError ? <div className="p-5"><Aviso tono="error">{(error as Error).message}</Aviso></div>
          : isLoading ? <Cargando />
          : !data || data.asientos.length === 0 ? <EstadoVacio icono={<BookText className="size-5" />} titulo="Sin asientos en el período" descripcion="Ajuste las fechas o registre asientos." />
          : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-[13px]">
                <thead>
                  <tr className="border-b border-borde bg-slate-50/80 text-left text-xs font-semibold tracking-wide text-texto-sec uppercase">
                    <th className="w-28 px-5 py-2.5">Cuenta</th>
                    <th className="px-3 py-2.5">Denominación</th>
                    <th className="w-40 px-3 py-2.5 text-right">Debe (S/)</th>
                    <th className="w-40 px-5 py-2.5 text-right">Haber (S/)</th>
                  </tr>
                </thead>
                {data.asientos.map((a) => (
                  <tbody key={a.id} className="border-b border-borde">
                    <tr className="bg-corporativo-claro/60">
                      <td colSpan={4} className="px-5 py-2">
                        <Link to={`/asientos/${a.id}`} className="font-semibold text-marino hover:underline"><span className="codigo">{a.numero}</span></Link>
                        <span className="codigo ml-3 text-texto-sec">{formatearFecha(a.fecha)}</span>
                        <span className="ml-3">{a.glosa}</span>
                        {a.documentoReferencia && <span className="ml-3 text-xs text-texto-sec">Doc.: {a.documentoReferencia}</span>}
                      </td>
                    </tr>
                    {a.lineas.map((l) => (
                      <tr key={l.linea}>
                        <td className="px-5 py-1.5"><Codigo valor={l.cuentaCodigo} /></td>
                        <td className={l.haber > 0 ? 'px-3 py-1.5 pl-10' : 'px-3 py-1.5'}>{l.cuentaDenominacion}{l.glosa && <span className="text-texto-sec"> — {l.glosa}</span>}</td>
                        <td className="codigo px-3 py-1.5 text-right">{formatearImporte(l.debe, true)}</td>
                        <td className="codigo px-5 py-1.5 text-right">{formatearImporte(l.haber, true)}</td>
                      </tr>
                    ))}
                  </tbody>
                ))}
                <tfoot>
                  <tr className="border-t-2 border-marino/20 bg-slate-50 font-semibold">
                    <td colSpan={2} className="px-5 py-3 text-right">Totales del período · {data.asientos.length} asientos</td>
                    <td className="codigo px-3 py-3 text-right">{formatearImporte(data.totalDebe)}</td>
                    <td className="codigo px-5 py-3 text-right">{formatearImporte(data.totalHaber)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
      </Tarjeta>
    </>
  )
}
