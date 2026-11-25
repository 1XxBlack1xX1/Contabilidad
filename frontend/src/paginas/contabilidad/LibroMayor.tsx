import { FileSpreadsheet } from 'lucide-react'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useLibroMayor } from '../../api/contabilidad'
import { BarraPeriodo, BotonesExportar } from '../../componentes/contabilidad/BarraPeriodo'
import { SelectorCuenta, type CuentaElegida } from '../../componentes/contabilidad/SelectorCuenta'
import { Aviso, Cargando, EncabezadoPagina, EstadoVacio, Tarjeta } from '../../componentes/ui'
import { useVersionActiva } from '../../contexto/Version'
import { formatearFecha, formatearImporte, formatearSaldo, hoyISO, inicioDeAnioISO } from '../../utilidades/formato'

export default function LibroMayor() {
  const { codigo: version } = useVersionActiva()
  const [params] = useSearchParams()
  const [cuenta, setCuenta] = useState<CuentaElegida | null>(null)
  const [desde, setDesde] = useState(inicioDeAnioISO())
  const [hasta, setHasta] = useState(hoyISO())
  const codigoCuenta = cuenta?.codigo ?? params.get('cuenta') ?? undefined
  const { data, isLoading, isError, error } = useLibroMayor(version, codigoCuenta, desde, hasta)

  return (
    <>
      <EncabezadoPagina titulo="Libro mayor"
        descripcion="Movimientos y saldos de una cuenta. Si elige una cuenta con subcuentas (p. ej. 10), se acumulan los movimientos de todas ellas." />
      <Tarjeta>
        <BarraPeriodo desde={desde} hasta={hasta} alCambiarDesde={setDesde} alCambiarHasta={setHasta}
          exportar={<BotonesExportar ruta="/api/libros/mayor/exportar" parametros={{ version, cuenta: codigoCuenta, desde, hasta }} deshabilitado={!data} />}>
          <div className="w-80">
            <span className="mb-1 block text-xs font-medium text-texto-sec">Cuenta</span>
            <SelectorCuenta modo="todas" valor={cuenta ?? (data ? { id: data.cuenta.id, codigo: data.cuenta.codigo, denominacion: data.cuenta.denominacion } : null)}
              alCambiar={setCuenta} />
          </div>
        </BarraPeriodo>
        {!codigoCuenta ? <EstadoVacio icono={<FileSpreadsheet className="size-5" />} titulo="Seleccione una cuenta" descripcion="Busque la cuenta por su código o su nombre." />
          : isError ? <div className="p-5"><Aviso tono="error">{(error as Error).message}</Aviso></div>
          : isLoading || !data ? <Cargando />
          : (
            <>
              <div className="grid gap-4 border-b border-borde p-5 text-[13px] sm:grid-cols-4">
                {[['Saldo inicial', data.saldoInicial], ['Total debe', data.totalDebe], ['Total haber', data.totalHaber], ['Saldo final', data.saldoFinal]].map(([t, v], i) => (
                  <div key={t as string}>
                    <p className="text-texto-sec">{t as string}</p>
                    <p className="codigo mt-0.5 text-lg font-semibold">{i === 0 || i === 3 ? formatearSaldo(v as number) : formatearImporte(v as number)}</p>
                  </div>
                ))}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-[13px]">
                  <thead>
                    <tr className="border-b border-borde bg-slate-50/80 text-left text-xs font-semibold tracking-wide text-texto-sec uppercase">
                      <th className="w-28 px-5 py-2.5">Fecha</th>
                      <th className="w-32 px-3 py-2.5">Asiento</th>
                      <th className="px-3 py-2.5">Glosa</th>
                      <th className="w-32 px-3 py-2.5 text-right">Debe (S/)</th>
                      <th className="w-32 px-3 py-2.5 text-right">Haber (S/)</th>
                      <th className="w-40 px-5 py-2.5 text-right">Saldo (S/)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-borde">
                    <tr className="bg-slate-50/50 text-texto-sec">
                      <td className="codigo px-5 py-2">{formatearFecha(data.desde)}</td>
                      <td colSpan={4} className="px-3 py-2">Saldo inicial</td>
                      <td className="codigo px-5 py-2 text-right">{formatearSaldo(data.saldoInicial)}</td>
                    </tr>
                    {data.movimientos.length === 0 && <tr><td colSpan={6} className="px-5 py-6 text-center text-texto-sec">Sin movimientos en el período.</td></tr>}
                    {data.movimientos.map((m, i) => (
                      <tr key={i}>
                        <td className="codigo px-5 py-2">{formatearFecha(m.fecha)}</td>
                        <td className="px-3 py-2"><Link to={`/asientos/${m.asientoId}`} className="codigo font-medium text-marino hover:underline">{m.asientoNumero}</Link></td>
                        <td className="px-3 py-2">{m.glosa}{m.cuentaCodigo !== data.cuenta.codigo && <span className="ml-2 text-xs text-texto-sec">({m.cuentaCodigo})</span>}</td>
                        <td className="codigo px-3 py-2 text-right">{formatearImporte(m.debe, true)}</td>
                        <td className="codigo px-3 py-2 text-right">{formatearImporte(m.haber, true)}</td>
                        <td className="codigo px-5 py-2 text-right">{formatearSaldo(m.saldo)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="border-t border-borde px-5 py-3 text-xs text-texto-sec">D = saldo deudor · A = saldo acreedor.</p>
            </>
          )}
      </Tarjeta>
    </>
  )
}
