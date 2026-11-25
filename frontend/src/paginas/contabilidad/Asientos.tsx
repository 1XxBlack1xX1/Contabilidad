import { NotebookPen, Plus, Search } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useAsientos } from '../../api/contabilidad'
import type { EstadoAsiento } from '../../api/tipos'
import { CampoFecha } from '../../componentes/contabilidad/BarraPeriodo'
import { Aviso, Boton, Cargando, EncabezadoPagina, EstadoVacio, Filtro, Insignia, Paginacion, Tarjeta, cx } from '../../componentes/ui'
import { PERMISOS, useSesion } from '../../contexto/Sesion'
import { useVersionActiva } from '../../contexto/Version'
import { formatearFecha, formatearImporte } from '../../utilidades/formato'

export default function Asientos() {
  const { codigo: version, version: v } = useVersionActiva()
  const { puede } = useSesion()
  const navegar = useNavigate()
  const [params, setParams] = useSearchParams()
  const desde = params.get('desde') ?? ''
  const hasta = params.get('hasta') ?? ''
  const estado = (params.get('estado') ?? '') as EstadoAsiento | ''
  const termino = params.get('termino') ?? ''
  const pagina = Number(params.get('pagina') ?? 0)

  const actualizar = (cambios: Record<string, string>) => {
    const p = new URLSearchParams(params)
    Object.entries(cambios).forEach(([k, val]) => (val ? p.set(k, val) : p.delete(k)))
    if (!('pagina' in cambios)) p.delete('pagina')
    setParams(p, { replace: true })
  }

  const { data, isLoading, isError, isFetching } = useAsientos({
    version, desde: desde || undefined, hasta: hasta || undefined, estado: estado || undefined, termino: termino || undefined, pagina,
  })

  return (
    <>
      <EncabezadoPagina
        titulo="Asientos contables"
        descripcion={`Registro por partida doble con las cuentas del ${v?.nombre ?? 'PCGE'}. Importes en soles.`}
        acciones={puede(PERMISOS.registrarAsientos) && (
          <Boton variante="primario" icono={<Plus className="size-4" />} onClick={() => navegar('/asientos/nuevo')}>Nuevo asiento</Boton>
        )}
      />
      <Tarjeta>
        <div className="flex flex-wrap items-end gap-3 border-b border-borde p-4">
          <label className="block min-w-[16rem] flex-1">
            <span className="mb-1 block text-xs font-medium text-texto-sec">Buscar</span>
            <span className="relative block">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <input defaultValue={termino} onKeyDown={(e) => e.key === 'Enter' && actualizar({ termino: (e.target as HTMLInputElement).value.trim() })}
                onBlur={(e) => e.target.value.trim() !== termino && actualizar({ termino: e.target.value.trim() })}
                placeholder="Glosa, documento o número de asiento"
                className="h-9 w-full rounded-md border border-borde pr-3 pl-9 text-sm placeholder:text-slate-400 focus:border-corporativo focus:ring-2 focus:ring-corporativo/15 focus:outline-none" />
            </span>
          </label>
          <CampoFecha etiqueta="Desde" valor={desde} alCambiar={(x) => actualizar({ desde: x })} />
          <CampoFecha etiqueta="Hasta" valor={hasta} alCambiar={(x) => actualizar({ hasta: x })} />
          <Filtro etiqueta="Estado" value={estado} onChange={(e) => actualizar({ estado: e.target.value })}>
            <option value="">Todos</option>
            <option value="REGISTRADO">Registrados</option>
            <option value="ANULADO">Anulados</option>
          </Filtro>
        </div>

        {isError ? <div className="p-5"><Aviso tono="error">No se pudieron cargar los asientos.</Aviso></div>
          : isLoading ? <Cargando texto="Cargando asientos…" />
          : !data || data.contenido.length === 0 ? (
            <EstadoVacio icono={<NotebookPen className="size-5" />} titulo="No hay asientos"
              descripcion={termino || desde || hasta || estado ? 'Ningún asiento coincide con los filtros.' : 'Aún no se han registrado asientos en esta versión del plan contable.'}
              accion={puede(PERMISOS.registrarAsientos) && <Link to="/asientos/nuevo" className="font-medium text-corporativo hover:underline">Registrar el primer asiento</Link>} />
          ) : (
            <div className={cx('overflow-x-auto transition-opacity', isFetching && 'opacity-60')}>
              <table className="w-full min-w-[760px] text-[13.5px]">
                <thead>
                  <tr className="border-b border-borde bg-slate-50/80 text-left text-xs font-semibold tracking-wide text-texto-sec uppercase">
                    <th className="w-36 px-5 py-2.5">Número</th>
                    <th className="w-28 px-3 py-2.5">Fecha</th>
                    <th className="px-3 py-2.5">Glosa</th>
                    <th className="w-36 px-3 py-2.5">Documento</th>
                    <th className="w-36 px-3 py-2.5 text-right">Importe (S/)</th>
                    <th className="w-28 px-5 py-2.5">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borde">
                  {data.contenido.map((a) => (
                    <tr key={a.id} onClick={() => navegar(`/asientos/${a.id}`)}
                      className={cx('cursor-pointer hover:bg-corporativo-claro/50', a.estado === 'ANULADO' && 'text-texto-sec')}>
                      <td className="codigo px-5 py-2.5 font-semibold whitespace-nowrap text-marino">{a.numero}</td>
                      <td className="codigo px-3 py-2.5">{formatearFecha(a.fecha)}</td>
                      <td className={cx('px-3 py-2.5', a.estado === 'ANULADO' && 'line-through decoration-slate-300')}>{a.glosa}</td>
                      <td className="px-3 py-2.5 text-texto-sec">{a.documentoReferencia ?? '—'}</td>
                      <td className="codigo px-3 py-2.5 text-right">{formatearImporte(a.total)}</td>
                      <td className="px-5 py-2.5">
                        <Insignia tono={a.estado === 'REGISTRADO' ? 'exito' : 'neutro'} punto>{a.estado === 'REGISTRADO' ? 'Registrado' : 'Anulado'}</Insignia>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        {data && <Paginacion pagina={data.pagina} totalPaginas={data.totalPaginas} total={data.totalElementos} tamano={25} alCambiar={(p) => actualizar({ pagina: String(p) })} />}
      </Tarjeta>
    </>
  )
}
