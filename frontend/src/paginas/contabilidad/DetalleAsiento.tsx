import { Ban } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { ApiError } from '../../api/cliente'
import { useAnularAsiento, useAsiento } from '../../api/contabilidad'
import { AreaTexto, Aviso, Boton, Cargando, Codigo, Dialogo, EstadoVacio, Insignia, Tarjeta } from '../../componentes/ui'
import { useNotificar } from '../../contexto/Notificaciones'
import { PERMISOS, useSesion } from '../../contexto/Sesion'
import { formatearFecha, formatearFechaHora, formatearImporte } from '../../utilidades/formato'

export default function DetalleAsiento() {
  const id = Number(useParams().id)
  const { data: a, isLoading, isError } = useAsiento(id)
  const { puede } = useSesion()
  const anular = useAnularAsiento(id)
  const notificar = useNotificar()
  const [dialogo, setDialogo] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (isLoading) return <Cargando />
  if (isError || !a) {
    return <EstadoVacio titulo="No se encontró el asiento" accion={<Link to="/asientos" className="font-medium text-corporativo hover:underline">Volver a asientos</Link>} />
  }

  const confirmar = async () => {
    setError(null)
    try {
      await anular.mutateAsync(motivo)
      notificar.exito(`Asiento ${a.numero} anulado.`)
      setDialogo(false)
    } catch (e) {
      setError(e instanceof ApiError ? (e.campos?.motivo ?? e.message) : 'No se pudo anular el asiento.')
    }
  }

  return (
    <>
      <div className="mb-2 text-[13px] text-texto-sec"><Link to="/asientos" className="hover:text-corporativo">Asientos contables</Link></div>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Insignia tono={a.estado === 'REGISTRADO' ? 'exito' : 'neutro'} punto>{a.estado === 'REGISTRADO' ? 'Registrado' : 'Anulado'}</Insignia>
            <span className="text-[13px] text-texto-sec">{a.versionNombre}</span>
          </div>
          <h1 className="mt-2 text-[22px] font-semibold tracking-tight">Asiento <Codigo valor={a.numero} className="text-[22px]" /></h1>
          <p className="mt-1 text-[14px]">{a.glosa}</p>
        </div>
        {a.estado === 'REGISTRADO' && puede(PERMISOS.anularAsientos) && (
          <Boton variante="peligro" icono={<Ban className="size-4" />} onClick={() => { setMotivo(''); setError(null); setDialogo(true) }}>Anular asiento</Boton>
        )}
      </header>

      {a.estado === 'ANULADO' && (
        <Aviso tono="advertencia" titulo="Asiento anulado" className="mb-6">
          Anulado por <strong>{a.anuladoPor}</strong> el {formatearFechaHora(a.anuladoEn)}. Motivo: {a.motivoAnulacion}. No afecta los libros ni los reportes.
        </Aviso>
      )}

      <Tarjeta>
        <dl className="grid gap-4 border-b border-borde p-5 text-[13px] sm:grid-cols-4">
          <div><dt className="text-texto-sec">Fecha</dt><dd className="codigo mt-0.5 font-medium">{formatearFecha(a.fecha)}</dd></div>
          <div><dt className="text-texto-sec">Documento</dt><dd className="mt-0.5 font-medium">{a.documentoReferencia ?? '—'}</dd></div>
          <div><dt className="text-texto-sec">Moneda</dt><dd className="mt-0.5 font-medium">Soles (PEN)</dd></div>
          <div><dt className="text-texto-sec">Registrado por</dt><dd className="mt-0.5 font-medium">{a.creadoPor} · {formatearFechaHora(a.creadoEn)}</dd></div>
        </dl>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-[13.5px]">
            <thead>
              <tr className="border-b border-borde bg-slate-50/80 text-left text-xs font-semibold tracking-wide text-texto-sec uppercase">
                <th className="w-10 px-5 py-2.5">#</th>
                <th className="w-28 px-3 py-2.5">Cuenta</th>
                <th className="px-3 py-2.5">Denominación</th>
                <th className="w-40 px-3 py-2.5 text-right">Debe (S/)</th>
                <th className="w-40 px-5 py-2.5 text-right">Haber (S/)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borde">
              {a.lineas.map((l) => (
                <tr key={l.linea}>
                  <td className="px-5 py-2.5 text-texto-sec">{l.linea}</td>
                  <td className="px-3 py-2.5"><Link to={`/plan-contable/cuentas/${l.cuentaId}`} className="hover:underline"><Codigo valor={l.cuentaCodigo} /></Link></td>
                  <td className={l.haber > 0 ? 'px-3 py-2.5 pl-10' : 'px-3 py-2.5'}>
                    {l.cuentaDenominacion}
                    {l.glosa && <span className="block text-xs text-texto-sec">{l.glosa}</span>}
                  </td>
                  <td className="codigo px-3 py-2.5 text-right">{formatearImporte(l.debe, true)}</td>
                  <td className="codigo px-5 py-2.5 text-right">{formatearImporte(l.haber, true)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-marino/20 bg-slate-50/80 font-semibold">
                <td colSpan={3} className="px-5 py-3 text-right">Totales</td>
                <td className="codigo px-3 py-3 text-right">{formatearImporte(a.totalDebe)}</td>
                <td className="codigo px-5 py-3 text-right">{formatearImporte(a.totalHaber)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Tarjeta>

      <Dialogo abierto={dialogo} alCerrar={() => setDialogo(false)} titulo={`Anular asiento ${a.numero}`}
        pie={<><Boton onClick={() => setDialogo(false)}>Cancelar</Boton><Boton variante="peligro" onClick={confirmar} cargando={anular.isPending} disabled={motivo.trim().length < 5}>Anular</Boton></>}>
        <Aviso tono="advertencia">
          El asiento dejará de afectar los libros y reportes, pero se conservará con su motivo para la trazabilidad. La anulación no se puede deshacer:
          si corresponde, registre luego un asiento correcto.
        </Aviso>
        <div className="mt-4">
          <AreaTexto etiqueta="Motivo de la anulación" obligatorio value={motivo} maxLength={500} autoFocus onChange={(e) => setMotivo(e.target.value)} ayuda="Mínimo 5 caracteres. Queda registrado en el historial." />
        </div>
        {error && <Aviso tono="error" className="mt-4">{error}</Aviso>}
      </Dialogo>
    </>
  )
}
