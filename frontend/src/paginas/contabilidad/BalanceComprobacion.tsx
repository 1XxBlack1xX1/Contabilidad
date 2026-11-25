import { CheckCircle2, Scale, XCircle } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { useBalance } from '../../api/contabilidad'
import { BarraPeriodo, BotonesExportar } from '../../componentes/contabilidad/BarraPeriodo'
import { Aviso, Cargando, Codigo, EncabezadoPagina, EstadoVacio, Filtro, Tarjeta } from '../../componentes/ui'
import { useVersionActiva } from '../../contexto/Version'
import { formatearImporte, hoyISO, inicioDeAnioISO } from '../../utilidades/formato'

export default function BalanceComprobacion() {
  const { codigo: version } = useVersionActiva()
  const [desde, setDesde] = useState(inicioDeAnioISO())
  const [hasta, setHasta] = useState(hoyISO())
  const [nivel, setNivel] = useState('2')
  const { data, isLoading, isError, error } = useBalance(version, desde, hasta, nivel || undefined)

  return (
    <>
      <EncabezadoPagina titulo="Balance de comprobación" descripcion="Sumas del debe y del haber, y saldos deudores y acreedores de cada cuenta en el período." />
      <Tarjeta>
        <BarraPeriodo desde={desde} hasta={hasta} alCambiarDesde={setDesde} alCambiarHasta={setHasta}
          exportar={<BotonesExportar ruta="/api/libros/balance-comprobacion/exportar" parametros={{ version, desde, hasta, nivel: nivel || undefined }} deshabilitado={!data || data.filas.length === 0} />}>
          <Filtro etiqueta="Agrupar por" value={nivel} onChange={(e) => setNivel(e.target.value)}>
            <option value="2">Cuentas (2 dígitos)</option>
            <option value="3">Subcuentas (3 dígitos)</option>
            <option value="4">Divisionarias (4 dígitos)</option>
            <option value="">Último nivel</option>
          </Filtro>
        </BarraPeriodo>
        {isError ? <div className="p-5"><Aviso tono="error">{(error as Error).message}</Aviso></div>
          : isLoading ? <Cargando />
          : !data || data.filas.length === 0 ? <EstadoVacio icono={<Scale className="size-5" />} titulo="Sin movimientos en el período" />
          : (
            <>
              <div className="border-b border-borde px-5 py-3">
                {data.cuadra
                  ? <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-exito"><CheckCircle2 className="size-4" /> El balance cuadra: sumas y saldos del debe y del haber son iguales.</span>
                  : <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-error"><XCircle className="size-4" /> El balance no cuadra. Revise los asientos del período.</span>}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-[13px]">
                  <thead>
                    <tr className="border-b border-borde bg-slate-50/80 text-xs font-semibold tracking-wide text-texto-sec uppercase">
                      <th rowSpan={2} className="w-24 px-5 py-2 text-left align-bottom">Cuenta</th>
                      <th rowSpan={2} className="px-3 py-2 text-left align-bottom">Denominación</th>
                      <th colSpan={2} className="border-l border-borde px-3 pt-2 pb-1 text-center">Sumas</th>
                      <th colSpan={2} className="border-l border-borde px-3 pt-2 pb-1 text-center">Saldos</th>
                    </tr>
                    <tr className="border-b border-borde bg-slate-50/80 text-xs font-semibold tracking-wide text-texto-sec uppercase">
                      <th className="w-32 border-l border-borde px-3 py-1.5 text-right">Debe</th>
                      <th className="w-32 px-3 py-1.5 text-right">Haber</th>
                      <th className="w-32 border-l border-borde px-3 py-1.5 text-right">Deudor</th>
                      <th className="w-32 px-5 py-1.5 text-right">Acreedor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-borde">
                    {data.filas.map((f) => (
                      <tr key={f.codigo} className="hover:bg-slate-50">
                        <td className="px-5 py-2"><Link to={`/libro-mayor?cuenta=${f.codigo}`} className="hover:underline" title="Ver libro mayor"><Codigo valor={f.codigo} /></Link></td>
                        <td className="px-3 py-2">{f.denominacion}</td>
                        <td className="codigo border-l border-borde px-3 py-2 text-right">{formatearImporte(f.debe, true)}</td>
                        <td className="codigo px-3 py-2 text-right">{formatearImporte(f.haber, true)}</td>
                        <td className="codigo border-l border-borde px-3 py-2 text-right">{formatearImporte(f.saldoDeudor, true)}</td>
                        <td className="codigo px-5 py-2 text-right">{formatearImporte(f.saldoAcreedor, true)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-marino/20 bg-slate-50 font-semibold">
                      <td colSpan={2} className="px-5 py-3 text-right">Totales</td>
                      <td className="codigo border-l border-borde px-3 py-3 text-right">{formatearImporte(data.totalDebe)}</td>
                      <td className="codigo px-3 py-3 text-right">{formatearImporte(data.totalHaber)}</td>
                      <td className="codigo border-l border-borde px-3 py-3 text-right">{formatearImporte(data.totalDeudor)}</td>
                      <td className="codigo px-5 py-3 text-right">{formatearImporte(data.totalAcreedor)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
      </Tarjeta>
    </>
  )
}
