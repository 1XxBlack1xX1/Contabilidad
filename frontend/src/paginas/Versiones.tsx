import { BadgeCheck, CircleAlert, ExternalLink, FileText, Gavel, Star } from 'lucide-react'
import { ApiError } from '../api/cliente'
import { useVersionPredeterminada } from '../api/consultas'
import type { FuenteNormativa } from '../api/tipos'
import { Boton, Cargando, EncabezadoPagina, EncabezadoTarjeta, Insignia, Tarjeta } from '../componentes/ui'
import { useNotificar } from '../contexto/Notificaciones'
import { PERMISOS, useSesion } from '../contexto/Sesion'
import { useVersionActiva } from '../contexto/Version'
import { TONO_VIGENCIA, formatearFecha, formatearFechaLarga, formatearNumero } from '../utilidades/formato'

const ETIQUETA_TIPO: Record<FuenteNormativa['tipo'], string> = {
  RESOLUCION: 'Norma de aprobación',
  DOCUMENTO_OFICIAL: 'Documento oficial',
  REFERENCIA: 'Referencia',
  ARCHIVO_IMPORTADO: 'Archivo importado',
}

function Fuente({ f }: { f: FuenteNormativa }) {
  const Icono = f.tipo === 'RESOLUCION' ? Gavel : FileText
  return (
    <li className="flex gap-3 py-4">
      <Icono className="mt-0.5 size-4 shrink-0 text-marino" aria-hidden />
      <div className="min-w-0 flex-1 text-[13px]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold tracking-wide text-texto-sec uppercase">{ETIQUETA_TIPO[f.tipo]}</span>
          {f.verificada ? (
            <Insignia tono="exito"><BadgeCheck className="size-3" aria-hidden /> Contenido verificado</Insignia>
          ) : (
            <Insignia tono="advertencia"><CircleAlert className="size-3" aria-hidden /> Pendiente de verificación</Insignia>
          )}
        </div>
        <p className="mt-1 text-[13.5px] font-medium text-texto">
          {f.titulo}
          {f.numero && <span className="font-normal text-texto-sec"> · N.° {f.numero}</span>}
        </p>
        <dl className="mt-1.5 grid gap-x-6 gap-y-1 text-texto-sec sm:grid-cols-2">
          {f.entidadEmisora && <div><dt className="inline">Emisor: </dt><dd className="inline text-texto">{f.entidadEmisora}</dd></div>}
          <div><dt className="inline">Fecha de emisión: </dt><dd className="inline text-texto">{f.fechaEmision ? formatearFechaLarga(f.fechaEmision) : 'No verificada'}</dd></div>
          {f.fechaConsulta && <div><dt className="inline">Fecha de consulta: </dt><dd className="inline text-texto">{formatearFecha(f.fechaConsulta)}</dd></div>}
          {f.nombreArchivo && <div><dt className="inline">Archivo: </dt><dd className="inline text-texto">{f.nombreArchivo}</dd></div>}
        </dl>
        {f.sha256 && <p className="mt-1.5 truncate font-mono text-[11px] text-slate-400" title={f.sha256}>SHA-256 {f.sha256}</p>}
        {f.notas && <p className="mt-2 leading-relaxed text-texto-sec">{f.notas}</p>}
        {f.url && (
          <a href={f.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 font-medium text-corporativo hover:underline">
            Abrir fuente <ExternalLink className="size-3.5" aria-hidden />
          </a>
        )}
      </div>
    </li>
  )
}

export default function Versiones() {
  const { versiones } = useVersionActiva()
  const { puede } = useSesion()
  const predeterminar = useVersionPredeterminada()
  const notificar = useNotificar()

  if (!versiones.length) return <Cargando />

  return (
    <>
      <EncabezadoPagina
        titulo="Versiones y fuentes normativas"
        descripcion="Origen documental de cada versión del catálogo. Las versiones se mantienen separadas: nunca se mezclan cuentas de distintas versiones."
      />
      <div className="space-y-6">
        {versiones.map((v) => (
          <Tarjeta key={v.codigo}>
            <EncabezadoTarjeta
              titulo={
                <span className="flex flex-wrap items-center gap-2">
                  {v.nombre}
                  <Insignia tono={TONO_VIGENCIA[v.estado]} punto>{v.estadoEtiqueta}</Insignia>
                  {v.oficial ? <Insignia tono="marino">Oficial</Insignia> : <Insignia tono="advertencia">No oficial</Insignia>}
                  {v.predeterminada && <Insignia tono="info"><Star className="size-3" aria-hidden /> Predeterminada</Insignia>}
                </span>
              }
              descripcion={v.descripcion}
              acciones={
                puede(PERMISOS.configurar) && !v.predeterminada && (
                  <Boton
                    tamano="sm"
                    cargando={predeterminar.isPending && predeterminar.variables === v.codigo}
                    onClick={() =>
                      predeterminar.mutate(v.codigo, {
                        onSuccess: () => notificar.exito(`${v.nombre} es ahora la versión predeterminada.`),
                        onError: (e) => notificar.error(e instanceof ApiError ? e.message : 'No se pudo cambiar la versión predeterminada.'),
                      })
                    }
                  >
                    Usar como predeterminada
                  </Boton>
                )
              }
            />
            <div className="grid gap-6 p-5 lg:grid-cols-[18rem_1fr]">
              <dl className="space-y-3 text-[13px]">
                <div><dt className="text-texto-sec">Código interno</dt><dd className="codigo font-medium">{v.codigo}</dd></div>
                <div><dt className="text-texto-sec">Cuentas</dt><dd className="font-medium">{formatearNumero(v.totalCuentas)}</dd></div>
                <div><dt className="text-texto-sec">Aprobación</dt><dd className="font-medium">{v.fechaAprobacion ? formatearFechaLarga(v.fechaAprobacion) : 'No verificada'}</dd></div>
                <div><dt className="text-texto-sec">Aplicación obligatoria</dt><dd className="font-medium">{v.fechaAplicacionObligatoria ? `Desde el ${formatearFechaLarga(v.fechaAplicacionObligatoria)}` : 'No documentada'}</dd></div>
                {v.fechaFinVigencia && <div><dt className="text-texto-sec">Fin de vigencia</dt><dd className="font-medium">{formatearFechaLarga(v.fechaFinVigencia)}</dd></div>}
                <div>
                  <dt className="text-texto-sec">Aplicación anticipada</dt>
                  <dd className="font-medium">{v.permiteAplicacionAnticipada === undefined || v.permiteAplicacionAnticipada === null ? 'No documentada' : v.permiteAplicacionAnticipada ? 'Permitida' : 'No permitida'}</dd>
                </div>
              </dl>
              <div className="min-w-0">
                {v.notas && <p className="rounded-md bg-slate-50 p-3.5 text-[13px] leading-relaxed text-texto-sec">{v.notas}</p>}
                <ul className="divide-y divide-borde">{v.fuentes.map((f) => <Fuente key={f.id} f={f} />)}</ul>
              </div>
            </div>
          </Tarjeta>
        ))}
      </div>
    </>
  )
}
