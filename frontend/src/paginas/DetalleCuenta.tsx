import { ChevronRight, FileText, History, Lock, Pencil, Plus, Power, PowerOff } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { useCuenta, useHistorialCuenta } from '../api/consultas'
import type { CuentaDetalle } from '../api/tipos'
import { DialogoCuenta } from '../componentes/catalogo/DialogoCuenta'
import { DialogoEstado } from '../componentes/catalogo/DialogoEstado'
import { Aviso, Boton, Cargando, Codigo, EncabezadoTarjeta, EstadoVacio, Insignia, InsigniaEstado, InsigniaOrigen, Tarjeta } from '../componentes/ui'
import { PERMISOS, useSesion } from '../contexto/Sesion'
import { useVersionActiva } from '../contexto/Version'
import { ETIQUETA_ACCION, ETIQUETA_NIVEL, formatearFechaHora, haceCuanto } from '../utilidades/formato'

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[13rem_1fr] sm:gap-4">
      <dt className="text-[13px] text-texto-sec">{etiqueta}</dt>
      <dd className="text-[13.5px] text-texto">{children}</dd>
    </div>
  )
}

function Procedencia({ c }: { c: CuentaDetalle }) {
  const { versiones } = useVersionActiva()
  const documento = versiones.find((v) => v.codigo === c.version.codigo)?.fuentes.find((f) => f.tipo === 'DOCUMENTO_OFICIAL' || f.tipo === 'ARCHIVO_IMPORTADO')
  return (
    <Tarjeta>
      <EncabezadoTarjeta titulo="Procedencia" descripcion="Origen documental de la cuenta" />
      <div className="space-y-4 p-5 text-[13.5px]">
        {c.origen === 'OFICIAL' && (
          <div className="flex gap-3">
            <Lock className="mt-0.5 size-4 shrink-0 text-marino" aria-hidden />
            <p>
              Cuenta del <strong>catálogo oficial</strong> del {c.version.nombre}. Su código y denominación están protegidos contra modificaciones;
              solo puede activarse o desactivarse.
            </p>
          </div>
        )}
        {c.origen === 'IMPORTADA' && <p>Cuenta cargada desde un archivo importado. No está verificada como fuente oficial.</p>}
        {c.origen === 'PERSONALIZADA' && (
          <p>
            Cuenta <strong>personalizada</strong>, registrada por <strong>{c.creadoPor}</strong> el {formatearFechaHora(c.creadoEn)}. No forma parte del catálogo oficial.
          </p>
        )}
        {(c.seccionFuente || documento) && c.origen !== 'PERSONALIZADA' && (
          <dl className="grid gap-2 rounded-md bg-slate-50 p-3.5 text-[13px]">
            {documento && (
              <div className="flex gap-2">
                <dt className="text-texto-sec">Documento:</dt>
                <dd>
                  {documento.url ? (
                    <a href={documento.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-corporativo hover:underline">
                      <FileText className="size-3.5" aria-hidden />
                      {documento.titulo}
                    </a>
                  ) : documento.titulo}
                </dd>
              </div>
            )}
            {c.seccionFuente && (
              <div className="flex gap-2">
                <dt className="text-texto-sec">Ubicación:</dt>
                <dd>{c.seccionFuente}{c.paginaFuente && `, página ${c.paginaFuente} del PDF`}</dd>
              </div>
            )}
          </dl>
        )}
        {c.observacionFuente && (
          <Aviso tono="advertencia" titulo="Observación sobre la fuente">
            <p>{c.observacionFuente}</p>
            {c.codigoFuente && <p className="mt-1">Código impreso en el documento: <strong className="codigo">{c.codigoFuente}</strong> · código aplicado: <strong className="codigo">{c.codigo}</strong></p>}
          </Aviso>
        )}
      </div>
    </Tarjeta>
  )
}

export default function DetalleCuenta() {
  const id = Number(useParams().id)
  const { data: c, isLoading, isError, error } = useCuenta(id)
  const { data: historial } = useHistorialCuenta(id)
  const { puede } = useSesion()
  const [editar, setEditar] = useState(false)
  const [estado, setEstado] = useState(false)
  const [subcuenta, setSubcuenta] = useState(false)

  if (isLoading) return <Cargando texto="Cargando cuenta…" />
  if (isError || !c) {
    return (
      <EstadoVacio
        titulo="No se encontró la cuenta"
        descripcion={(error as Error)?.message ?? 'La cuenta solicitada no existe.'}
        accion={<Link to="/plan-contable/cuentas" className="font-medium text-corporativo hover:underline">Volver al catálogo</Link>}
      />
    )
  }
  const gestiona = puede(PERMISOS.gestionarCuentas)

  return (
    <>
      <nav aria-label="Ruta jerárquica" className="mb-3 flex flex-wrap items-center gap-1 text-[13px] text-texto-sec">
        <Link to="/plan-contable/explorador" className="hover:text-corporativo">Elemento {c.elemento.numero}</Link>
        {c.ruta.map((r) => (
          <span key={r.id} className="inline-flex items-center gap-1">
            <ChevronRight className="size-3.5" aria-hidden />
            <Link to={`/plan-contable/cuentas/${r.id}`} className="hover:text-corporativo" title={r.denominacion}>
              <span className="codigo">{r.codigo}</span> {r.denominacion.length > 34 ? r.denominacion.slice(0, 34) + '…' : r.denominacion}
            </Link>
          </span>
        ))}
        <ChevronRight className="size-3.5" aria-hidden />
        <span className="codigo font-medium text-texto">{c.codigo}</span>
      </nav>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <InsigniaOrigen origen={c.origen} />
            <InsigniaEstado activa={c.activa} />
            <Insignia>{ETIQUETA_NIVEL[c.tipoNivel]}{c.nivel > 5 ? ` · ${c.nivel} dígitos` : ''}</Insignia>
          </div>
          <h1 className="mt-2 text-[22px] font-semibold tracking-tight">
            <Codigo valor={c.codigo} className="mr-2 text-[22px]" />
            {c.denominacion}
          </h1>
          <p className="mt-1 text-[13px] text-texto-sec">{c.version.nombre} · Elemento {c.elemento.numero}: {c.elemento.denominacion}</p>
        </div>
        {gestiona && (
          <div className="flex flex-wrap gap-2">
            {c.editable && <Boton icono={<Pencil className="size-4" />} onClick={() => setEditar(true)}>Editar</Boton>}
            <Boton icono={c.activa ? <PowerOff className="size-4" /> : <Power className="size-4" />} onClick={() => setEstado(true)}>
              {c.activa ? 'Desactivar' : 'Activar'}
            </Boton>
            {c.activa && c.nivel < 10 && (
              <Boton variante="primario" icono={<Plus className="size-4" />} onClick={() => setSubcuenta(true)}>Registrar subcuenta</Boton>
            )}
          </div>
        )}
      </header>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <Tarjeta>
            <EncabezadoTarjeta titulo="Información de la cuenta" />
            <dl className="divide-y divide-borde px-5">
              <Dato etiqueta="Código contable"><Codigo valor={c.codigo} /></Dato>
              <Dato etiqueta={c.origen === 'OFICIAL' ? 'Denominación oficial' : 'Denominación'}>{c.denominacion}</Dato>
              <Dato etiqueta="Descripción">{c.descripcion ?? <span className="text-texto-sec">{c.origen === 'OFICIAL' ? 'El catálogo oficial no incluye una descripción para este nivel.' : 'Sin descripción.'}</span>}</Dato>
              <Dato etiqueta="Nivel jerárquico">{ETIQUETA_NIVEL[c.tipoNivel]} ({c.nivel} dígitos)</Dato>
              <Dato etiqueta="Elemento">{c.elemento.numero} — {c.elemento.denominacion}</Dato>
              <Dato etiqueta="Cuenta superior">
                {c.padre ? (
                  <Link to={`/plan-contable/cuentas/${c.padre.id}`} className="hover:text-corporativo hover:underline">
                    <Codigo valor={c.padre.codigo} /> {c.padre.denominacion}
                  </Link>
                ) : <span className="text-texto-sec">Es una cuenta de primer nivel del elemento.</span>}
              </Dato>
              <Dato etiqueta="Naturaleza">
                {c.naturaleza ? (c.naturaleza === 'DEUDORA' ? 'Deudora' : 'Acreedora') : <span className="text-texto-sec">No especificada{c.origen === 'OFICIAL' && ' (el PCGE no la define por cuenta)'}</span>}
              </Dato>
              <Dato etiqueta="Versión del PCGE">{c.version.nombre}</Dato>
              <Dato etiqueta="Última actualización">{formatearFechaHora(c.actualizadoEn)}{c.actualizadoPor && ` · ${c.actualizadoPor}`}</Dato>
            </dl>
          </Tarjeta>

          <Tarjeta>
            <EncabezadoTarjeta titulo="Subcuentas" descripcion={c.subcuentas.length === 1 ? `1 cuenta depende directamente de ${c.codigo}` : `${c.subcuentas.length} cuentas dependen directamente de ${c.codigo}`} />
            {c.subcuentas.length === 0 ? (
              <EstadoVacio titulo="Sin subcuentas" descripcion="Esta cuenta no tiene niveles inferiores en el catálogo." />
            ) : (
              <ul className="divide-y divide-borde">
                {c.subcuentas.map((s) => (
                  <li key={s.id}>
                    <Link to={`/plan-contable/cuentas/${s.id}`} className="flex items-center gap-4 px-5 py-2.5 hover:bg-corporativo-claro/50">
                      <Codigo valor={s.codigo} className="w-20" />
                      <span className={s.activa ? 'flex-1' : 'flex-1 text-texto-sec'}>{s.denominacion}</span>
                      {!s.activa && <InsigniaEstado activa={false} />}
                      <ChevronRight className="size-4 text-slate-300" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Tarjeta>
        </div>

        <div className="space-y-6">
          <Procedencia c={c} />
          <Tarjeta>
            <EncabezadoTarjeta titulo="Historial de modificaciones" />
            {!historial || historial.contenido.length === 0 ? (
              <EstadoVacio icono={<History className="size-5" />} titulo="Sin cambios registrados" descripcion="La cuenta se mantiene tal como se cargó en el catálogo." />
            ) : (
              <ol className="relative space-y-5 p-5 before:absolute before:top-6 before:bottom-6 before:left-[27px] before:w-px before:bg-borde">
                {historial.contenido.map((h) => (
                  <li key={h.id} className="relative flex gap-3">
                    <span className="relative z-10 mt-1 size-2.5 shrink-0 rounded-full bg-corporativo ring-4 ring-white" aria-hidden />
                    <div className="min-w-0 text-[13px]">
                      <p><span className="font-medium">{ETIQUETA_ACCION[h.accion]}</span> · {h.resumen}</p>
                      {h.motivo && <p className="mt-0.5 text-texto-sec">Motivo: {h.motivo}</p>}
                      {h.accion === 'MODIFICACION' && h.detalle && (
                        <ul className="mt-1 space-y-0.5 text-xs text-texto-sec">
                          {Object.entries(h.detalle).map(([campo, v]) => {
                            const par = v as { antes?: unknown; despues?: unknown }
                            return <li key={campo}><span className="font-medium">{campo}</span>: “{String(par.antes ?? '—')}” → “{String(par.despues ?? '—')}”</li>
                          })}
                        </ul>
                      )}
                      <p className="mt-0.5 text-xs text-texto-sec" title={formatearFechaHora(h.fecha)}>{h.usuario} · {haceCuanto(h.fecha)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Tarjeta>
        </div>
      </div>

      <DialogoCuenta abierto={editar} alCerrar={() => setEditar(false)} cuenta={c} />
      <DialogoCuenta abierto={subcuenta} alCerrar={() => setSubcuenta(false)} superior={{ codigo: c.codigo, denominacion: c.denominacion }} />
      <DialogoEstado abierto={estado} alCerrar={() => setEstado(false)} cuenta={c} />
    </>
  )
}
