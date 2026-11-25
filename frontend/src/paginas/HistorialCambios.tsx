import { ClipboardList } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { useHistorial } from '../api/consultas'
import { Aviso, Boton, Cargando, EncabezadoPagina, EstadoVacio, Insignia, Tarjeta } from '../componentes/ui'
import { useVersionActiva } from '../contexto/Version'
import { ETIQUETA_ACCION, formatearFechaHora } from '../utilidades/formato'

export default function HistorialCambios() {
  const { codigo, version } = useVersionActiva()
  const [params, setParams] = useSearchParams()
  const pagina = Number(params.get('pagina') ?? 0)
  const { data, isLoading, isError } = useHistorial(codigo, pagina)

  return (
    <>
      <EncabezadoPagina
        titulo="Historial de cambios"
        descripcion={`Registro inalterable de las modificaciones del ${version?.nombre ?? 'catálogo'}: quién, cuándo, qué y por qué.`}
      />
      <Tarjeta>
        {isError ? <div className="p-5"><Aviso tono="error">No se pudo cargar el historial.</Aviso></div>
          : isLoading || !data ? <Cargando />
          : data.contenido.length === 0 ? <EstadoVacio icono={<ClipboardList className="size-5" />} titulo="Sin cambios registrados" />
          : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-[13.5px]">
                <thead>
                  <tr className="border-b border-borde bg-slate-50/80 text-left text-xs font-semibold tracking-wide text-texto-sec uppercase">
                    <th scope="col" className="w-44 px-5 py-2.5">Fecha y hora</th>
                    <th scope="col" className="w-36 px-3 py-2.5">Acción</th>
                    <th scope="col" className="px-3 py-2.5">Detalle</th>
                    <th scope="col" className="w-36 px-5 py-2.5">Usuario</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borde">
                  {data.contenido.map((h) => (
                    <tr key={h.id}>
                      <td className="codigo px-5 py-3 text-texto-sec">{formatearFechaHora(h.fecha)}</td>
                      <td className="px-3 py-3"><Insignia>{ETIQUETA_ACCION[h.accion]}</Insignia></td>
                      <td className="px-3 py-3">
                        {h.cuentaId ? <Link to={`/plan-contable/cuentas/${h.cuentaId}`} className="hover:text-corporativo hover:underline">{h.resumen}</Link> : h.resumen}
                        {h.motivo && <span className="block text-xs text-texto-sec">Motivo: {h.motivo}</span>}
                      </td>
                      <td className="px-5 py-3">{h.usuario}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        {data && data.totalPaginas > 1 && (
          <div className="flex items-center justify-end gap-2 border-t border-borde px-5 py-3 text-[13px] text-texto-sec">
            <Boton tamano="sm" variante="fantasma" disabled={pagina === 0} onClick={() => setParams({ pagina: String(pagina - 1) })}>Anterior</Boton>
            Página {pagina + 1} de {data.totalPaginas}
            <Boton tamano="sm" variante="fantasma" disabled={pagina + 1 >= data.totalPaginas} onClick={() => setParams({ pagina: String(pagina + 1) })}>Siguiente</Boton>
          </div>
        )}
      </Tarjeta>
    </>
  )
}
