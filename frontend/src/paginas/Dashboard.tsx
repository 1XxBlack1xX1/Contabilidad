import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  CircleSlash,
  Download,
  FileText,
  Layers,
  Network,
  NotebookPen,
  Scale,
  Search,
  Upload,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { useDashboard } from '../api/consultas'
import type { Historial } from '../api/tipos'
import { DialogoExportar } from '../componentes/catalogo/DialogoExportar'
import { Aviso, EncabezadoPagina, EncabezadoTarjeta, Esqueleto, EstadoVacio, Insignia, Tarjeta, cx } from '../componentes/ui'
import { PERMISOS, useSesion } from '../contexto/Sesion'
import { useVersionActiva } from '../contexto/Version'
import { ETIQUETA_ACCION, TONO_VIGENCIA, formatearFechaHora, formatearFechaLarga, formatearNumero, haceCuanto } from '../utilidades/formato'

function Indicador({ titulo, valor, detalle, icono: Icono, tono = 'marino' }: { titulo: string; valor?: number; detalle?: string; icono: LucideIcon; tono?: 'marino' | 'exito' | 'neutro' }) {
  const color = { marino: 'bg-corporativo-claro text-corporativo', exito: 'bg-exito-claro text-exito', neutro: 'bg-slate-100 text-slate-500' }[tono]
  return (
    <Tarjeta className="p-5">
      <div className="flex items-start justify-between">
        <p className="text-[13px] font-medium text-texto-sec">{titulo}</p>
        <span className={cx('grid size-8 place-items-center rounded-md', color)}>
          <Icono className="size-4" aria-hidden />
        </span>
      </div>
      {valor === undefined ? <Esqueleto className="mt-3 h-8 w-24" /> : <p className="codigo mt-2 text-[28px] font-semibold tracking-tight text-texto">{formatearNumero(valor)}</p>}
      {detalle && <p className="mt-1 text-xs text-texto-sec">{detalle}</p>}
    </Tarjeta>
  )
}

const TONO_ACCION: Record<Historial['accion'], 'exito' | 'info' | 'neutro' | 'advertencia' | 'marino'> = {
  CREACION: 'info',
  MODIFICACION: 'info',
  ACTIVACION: 'exito',
  DESACTIVACION: 'neutro',
  IMPORTACION: 'marino',
  CONFIGURACION: 'advertencia',
}

export default function Dashboard() {
  const { codigo } = useVersionActiva()
  const { puede } = useSesion()
  const { data: d, isError } = useDashboard(codigo)
  const [exportar, setExportar] = useState(false)
  const v = d?.version
  const resolucion = v?.fuentes.find((f) => f.tipo === 'RESOLUCION')
  const documento = v?.fuentes.find((f) => f.tipo === 'DOCUMENTO_OFICIAL' || f.tipo === 'ARCHIVO_IMPORTADO')

  const accesos: { titulo: string; texto: string; icono: LucideIcon; a?: string; accion?: () => void; visible?: boolean }[] = [
    { titulo: 'Consultar plan contable', texto: 'Listado completo con filtros', icono: BookOpen, a: '/plan-contable/cuentas' },
    { titulo: 'Buscar cuenta', texto: 'Por código o denominación', icono: Search, a: '/plan-contable/cuentas?enfocar=1' },
    { titulo: 'Explorar elementos', texto: 'Árbol jerárquico del catálogo', icono: Network, a: '/plan-contable/explorador' },
    { titulo: 'Importar catálogo', texto: 'Desde Excel o CSV, con vista previa', icono: Upload, a: '/plan-contable/importar', visible: puede(PERMISOS.importar) },
    { titulo: 'Exportar catálogo', texto: 'Excel, PDF o CSV', icono: Download, accion: () => setExportar(true), visible: puede(PERMISOS.exportar) },
    { titulo: 'Registrar asiento', texto: 'Partida doble con cuentas del PCGE', icono: NotebookPen, a: '/asientos/nuevo', visible: puede(PERMISOS.registrarAsientos) },
    { titulo: 'Balance de comprobación', texto: 'Sumas y saldos del período', icono: Scale, a: '/balance-comprobacion', visible: puede(PERMISOS.consultarContabilidad) },
  ]

  return (
    <>
      <EncabezadoPagina titulo="Panel principal" descripcion="Resumen del catálogo de cuentas con el que está trabajando." />

      {isError && <Aviso tono="error">No se pudo cargar el resumen del catálogo.</Aviso>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador titulo="Total de cuentas" valor={d?.totalCuentas} icono={BookOpen}
          detalle={d ? `${formatearNumero(d.cuentasPersonalizadas)} personalizadas` : undefined} />
        <Indicador titulo="Elementos contables" valor={d?.totalElementos} icono={Layers} detalle="Primer dígito del código" />
        <Indicador titulo="Cuentas activas" valor={d?.cuentasActivas} icono={CheckCircle2} tono="exito"
          detalle={d && d.totalCuentas ? `${((d.cuentasActivas / d.totalCuentas) * 100).toFixed(1)} % del catálogo` : undefined} />
        <Indicador titulo="Cuentas inactivas" valor={d?.cuentasInactivas} icono={CircleSlash} tono="neutro" detalle="No disponibles para registro" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <Tarjeta>
          <EncabezadoTarjeta
            titulo="Versión del PCGE instalada"
            acciones={<Link to="/plan-contable/versiones" className="text-[13px] font-medium text-corporativo hover:underline">Ver fuentes normativas</Link>}
          />
          {!v ? (
            <div className="space-y-3 p-5"><Esqueleto className="h-6 w-64" /><Esqueleto className="h-4 w-full" /><Esqueleto className="h-4 w-3/4" /></div>
          ) : (
            <div className="p-5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-lg font-semibold">{v.nombre}</p>
                <Insignia tono={TONO_VIGENCIA[v.estado]} punto>{v.estadoEtiqueta}</Insignia>
                {v.oficial ? <Insignia tono="marino">Oficial</Insignia> : <Insignia tono="advertencia">No oficial</Insignia>}
              </div>
              {v.descripcion && <p className="mt-2 text-[13px] leading-relaxed text-texto-sec">{v.descripcion}</p>}
              <dl className="mt-5 grid gap-x-8 gap-y-4 text-[13px] sm:grid-cols-2">
                <div>
                  <dt className="text-texto-sec">Norma de aprobación</dt>
                  <dd className="mt-0.5 font-medium">{resolucion ? `Resolución CNC N.° ${resolucion.numero}` : 'No registrada'}</dd>
                </div>
                <div>
                  <dt className="text-texto-sec">Aplicación obligatoria</dt>
                  <dd className="mt-0.5 font-medium">
                    {v.fechaAplicacionObligatoria ? `Desde el ${formatearFechaLarga(v.fechaAplicacionObligatoria)}` : 'No documentada'}
                    {v.fechaFinVigencia && <span className="block text-xs font-normal text-texto-sec">Hasta el {formatearFechaLarga(v.fechaFinVigencia)}</span>}
                  </dd>
                </div>
                <div>
                  <dt className="text-texto-sec">Documento fuente</dt>
                  <dd className="mt-0.5 font-medium">
                    {documento?.url ? (
                      <a href={documento.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-corporativo hover:underline">
                        <FileText className="size-3.5" aria-hidden />
                        {documento.nombreArchivo ?? documento.titulo}
                      </a>
                    ) : (documento?.titulo ?? '—')}
                  </dd>
                </div>
                <div>
                  <dt className="text-texto-sec">Última actualización del catálogo</dt>
                  <dd className="mt-0.5 font-medium">{formatearFechaHora(d?.ultimaActualizacion)}</dd>
                </div>
              </dl>
              {d && d.cuentasConObservacion > 0 && (
                <Aviso tono="info" className="mt-5">
                  {d.cuentasConObservacion} cuentas tienen una observación sobre la fuente: el documento oficial contiene erratas tipográficas en sus códigos.
                  Cada corrección está documentada en el detalle de la cuenta.{' '}
                  <Link to="/plan-contable/cuentas?observacion=1" className="font-medium underline">Revisarlas</Link>
                </Aviso>
              )}
            </div>
          )}
        </Tarjeta>

        <Tarjeta>
          <EncabezadoTarjeta titulo="Composición del catálogo" descripcion="Cantidad de cuentas por nivel jerárquico" />
          <div className="p-5">
            {!d ? <Esqueleto className="h-32 w-full" /> : (
              <ul className="space-y-3">
                {Object.entries(d.cuentasPorNivel).map(([nivel, n]) => (
                  <li key={nivel}>
                    <div className="flex justify-between text-[13px]">
                      <span>{nivel}</span>
                      <span className="codigo font-medium">{formatearNumero(n)}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-slate-100">
                      <div className="h-1.5 rounded-full bg-marino-600" style={{ width: `${Math.max(2, (n / d.totalCuentas) * 100)}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Tarjeta>
      </div>

      <h2 className="mt-8 mb-3 text-[15px] font-semibold">Accesos rápidos</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {accesos.filter((a) => a.visible !== false).map(({ titulo, texto, icono: Icono, a, accion }) => {
          const contenido = (
            <>
              <span className="grid size-10 shrink-0 place-items-center rounded-md bg-corporativo-claro text-corporativo transition-colors group-hover:bg-corporativo group-hover:text-white">
                <Icono className="size-[18px]" aria-hidden />
              </span>
              <span className="min-w-0 flex-1 text-left">
                <span className="block text-[13.5px] font-medium text-texto">{titulo}</span>
                <span className="block text-xs text-texto-sec">{texto}</span>
              </span>
              <ArrowRight className="size-4 text-slate-300 transition-colors group-hover:text-corporativo" aria-hidden />
            </>
          )
          const clase = 'group flex items-center gap-3 rounded-lg border border-borde bg-white p-4 shadow-tarjeta transition-colors hover:border-corporativo/40'
          return a ? <Link key={titulo} to={a} className={clase}>{contenido}</Link> : <button key={titulo} onClick={accion} className={clase}>{contenido}</button>
        })}
      </div>

      <Tarjeta className="mt-8">
        <EncabezadoTarjeta
          titulo="Últimas modificaciones"
          descripcion="Cambios registrados en esta versión del catálogo"
          acciones={<Link to="/plan-contable/historial" className="text-[13px] font-medium text-corporativo hover:underline">Ver historial completo</Link>}
        />
        {!d ? <div className="p-5"><Esqueleto className="h-20 w-full" /></div> : d.ultimasModificaciones.length === 0 ? (
          <EstadoVacio titulo="Sin modificaciones" descripcion="Aún no se han registrado cambios en esta versión." />
        ) : (
          <ul className="divide-y divide-borde">
            {d.ultimasModificaciones.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3">
                <Insignia tono={TONO_ACCION[h.accion]}>{ETIQUETA_ACCION[h.accion]}</Insignia>
                <span className="min-w-0 flex-1 text-[13px]">
                  {h.cuentaId ? <Link to={`/plan-contable/cuentas/${h.cuentaId}`} className="hover:text-corporativo hover:underline">{h.resumen}</Link> : h.resumen}
                  {h.motivo && <span className="block text-xs text-texto-sec">Motivo: {h.motivo}</span>}
                </span>
                <span className="text-xs text-texto-sec" title={formatearFechaHora(h.fecha)}>{h.usuario} · {haceCuanto(h.fecha)}</span>
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>

      <DialogoExportar abierto={exportar} alCerrar={() => setExportar(false)} filtros={{ version: codigo }} />
    </>
  )
}
