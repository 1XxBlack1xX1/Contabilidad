import { CheckCircle2, FileSpreadsheet, RotateCcw, UploadCloud, XCircle } from 'lucide-react'
import { useRef, useState, type DragEvent, type FormEvent } from 'react'
import { Link } from 'react-router'
import { ApiError } from '../api/cliente'
import { useConfirmarImportacion, useVistaPrevia } from '../api/consultas'
import type { VersionPcge } from '../api/tipos'
import { AreaTexto, Aviso, Boton, CampoTexto, Codigo, EncabezadoPagina, EncabezadoTarjeta, Tarjeta, cx } from '../componentes/ui'
import { useNotificar } from '../contexto/Notificaciones'
import { useVersionActiva } from '../contexto/Version'
import { formatearNumero } from '../utilidades/formato'

const PASOS = ['Seleccionar archivo', 'Revisar vista previa', 'Confirmar importación']

function Pasos({ actual }: { actual: number }) {
  return (
    <ol className="mb-6 flex flex-wrap gap-x-8 gap-y-2">
      {PASOS.map((p, i) => (
        <li key={p} className="flex items-center gap-2.5 text-[13px]">
          <span className={cx('grid size-6 place-items-center rounded-full text-xs font-semibold',
            i < actual ? 'bg-exito text-white' : i === actual ? 'bg-corporativo text-white' : 'bg-slate-200 text-texto-sec')}>
            {i < actual ? '✓' : i + 1}
          </span>
          <span className={i === actual ? 'font-medium text-texto' : 'text-texto-sec'}>{p}</span>
        </li>
      ))}
    </ol>
  )
}

export default function Importar() {
  const [archivo, setArchivo] = useState<File | null>(null)
  const [arrastrando, setArrastrando] = useState(false)
  const [resultado, setResultado] = useState<VersionPcge | null>(null)
  const [datos, setDatos] = useState({ codigo: '', nombre: '', descripcion: '', fuenteTitulo: '', fuenteUrl: '', notas: '' })
  const [aceptado, setAceptado] = useState(false)
  const [errores, setErrores] = useState<Record<string, string>>({})
  const entrada = useRef<HTMLInputElement>(null)
  const vista = useVistaPrevia()
  const confirmar = useConfirmarImportacion()
  const notificar = useNotificar()
  const { seleccionar } = useVersionActiva()
  const vp = vista.data

  const elegir = (f: File | undefined) => {
    if (!f) return
    setArchivo(f)
    setResultado(null)
    setAceptado(false)
    vista.mutate(f)
  }
  const reiniciar = () => {
    setArchivo(null)
    setResultado(null)
    setAceptado(false)
    vista.reset()
    confirmar.reset()
  }
  const soltar = (e: DragEvent) => {
    e.preventDefault()
    setArrastrando(false)
    elegir(e.dataTransfer.files[0])
  }
  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    if (!archivo || !vp) return
    setErrores({})
    try {
      const v = await confirmar.mutateAsync({
        archivo,
        datos: { ...datos, descripcion: datos.descripcion || undefined, fuenteUrl: datos.fuenteUrl || undefined, notas: datos.notas || undefined, sha256Revisado: vp.sha256 },
      })
      setResultado(v)
      notificar.exito(`Se importó la versión ${v.nombre}.`)
    } catch (err) {
      if (err instanceof ApiError && err.campos) setErrores(err.campos)
      notificar.error(err instanceof ApiError ? err.message : 'No se pudo completar la importación.')
    }
  }

  const paso = resultado ? 3 : vp?.valido ? 2 : vp ? 1 : 0

  return (
    <>
      <EncabezadoPagina
        titulo="Importar catálogo"
        descripcion="Cargue un catálogo desde Excel o CSV. Se crea como una versión nueva, identificada como no oficial; nunca modifica ni mezcla las versiones existentes."
      />
      <Pasos actual={paso} />

      {resultado ? (
        <Tarjeta className="p-8 text-center">
          <CheckCircle2 className="mx-auto size-10 text-exito" aria-hidden />
          <h2 className="mt-3 text-lg font-semibold">Importación completada</h2>
          <p className="mt-1 text-[13.5px] text-texto-sec">
            Se creó la versión <strong>{resultado.nombre}</strong> con {formatearNumero(resultado.totalCuentas)} cuentas. La operación quedó registrada en el historial.
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <Boton onClick={reiniciar} icono={<RotateCcw className="size-4" />}>Importar otro archivo</Boton>
            <Link
              to="/plan-contable/cuentas"
              onClick={() => seleccionar(resultado.codigo)}
              className="inline-flex h-9 items-center rounded-md bg-corporativo px-4 text-sm font-medium text-white shadow-sm hover:bg-[#1a44c2]"
            >
              Trabajar con esta versión
            </Link>
          </div>
        </Tarjeta>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
          <div className="space-y-6">
            <Tarjeta>
              <div
                onDragOver={(e) => { e.preventDefault(); setArrastrando(true) }}
                onDragLeave={() => setArrastrando(false)}
                onDrop={soltar}
                className={cx('m-4 flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors',
                  arrastrando ? 'border-corporativo bg-corporativo-claro/50' : 'border-borde')}
              >
                {archivo ? (
                  <>
                    <FileSpreadsheet className="size-9 text-marino" aria-hidden />
                    <p className="mt-2 font-medium">{archivo.name}</p>
                    <p className="text-xs text-texto-sec">{(archivo.size / 1024).toLocaleString('es-PE', { maximumFractionDigits: 1 })} KB</p>
                    <Boton tamano="sm" className="mt-3" onClick={reiniciar} icono={<RotateCcw className="size-3.5" />}>Elegir otro archivo</Boton>
                  </>
                ) : (
                  <>
                    <UploadCloud className="size-9 text-slate-400" aria-hidden />
                    <p className="mt-2 font-medium">Arrastre aquí su archivo o</p>
                    <Boton variante="primario" tamano="sm" className="mt-3" onClick={() => entrada.current?.click()}>Seleccionar archivo</Boton>
                    <p className="mt-3 text-xs text-texto-sec">Excel (.xlsx) o CSV (.csv, UTF-8) · máximo 10 MB</p>
                  </>
                )}
                <input ref={entrada} type="file" accept=".xlsx,.csv" className="hidden" onChange={(e) => elegir(e.target.files?.[0])} />
              </div>
              {vista.isPending && <p className="px-5 pb-5 text-[13px] text-texto-sec">Validando el archivo…</p>}
              {vista.isError && <div className="px-5 pb-5"><Aviso tono="error">{vista.error instanceof ApiError ? vista.error.message : 'No se pudo validar el archivo.'}</Aviso></div>}
            </Tarjeta>

            {vp && (
              <Tarjeta>
                <EncabezadoTarjeta
                  titulo="Vista previa"
                  descripcion={`${formatearNumero(vp.filasLeidas)} filas leídas · ${vp.totalElementos} elementos · ${formatearNumero(vp.totalCuentas)} cuentas`}
                  acciones={vp.valido
                    ? <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-exito"><CheckCircle2 className="size-4" /> Sin errores</span>
                    : <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-error"><XCircle className="size-4" /> {vp.errores.length} errores</span>}
                />
                <div className="space-y-4 p-5">
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(vp.cuentasPorNivel).map(([n, c]) => (
                      <span key={n} className="rounded-md bg-slate-50 px-3 py-1.5 text-[13px]"><span className="text-texto-sec">{n}:</span> <strong className="codigo">{formatearNumero(c)}</strong></span>
                    ))}
                  </div>
                  {vp.errores.length > 0 && (
                    <Aviso tono="error" titulo="Corrija estos errores en el archivo y vuelva a cargarlo">
                      <ul className="mt-1 max-h-56 space-y-0.5 overflow-y-auto">
                        {vp.errores.map((e, i) => <li key={i}>{e.fila && `Fila ${e.fila}: `}{e.codigo && <strong className="codigo">{e.codigo} </strong>}{e.mensaje}</li>)}
                      </ul>
                    </Aviso>
                  )}
                  {vp.advertencias.length > 0 && (
                    <Aviso tono="advertencia" titulo="Advertencias">
                      <ul className="mt-1 max-h-40 space-y-0.5 overflow-y-auto">
                        {vp.advertencias.map((e, i) => <li key={i}>{e.fila && `Fila ${e.fila}: `}{e.codigo && <strong className="codigo">{e.codigo} </strong>}{e.mensaje}</li>)}
                      </ul>
                    </Aviso>
                  )}
                  <div className="overflow-x-auto rounded-md border border-borde">
                    <table className="w-full text-[13px]">
                      <thead>
                        <tr className="bg-slate-50 text-left text-xs font-semibold text-texto-sec uppercase">
                          <th className="px-3 py-2">Fila</th><th className="px-3 py-2">Código</th><th className="px-3 py-2">Denominación</th><th className="px-3 py-2">Nivel</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-borde">
                        {vp.muestra.map((f) => (
                          <tr key={f.fila}>
                            <td className="px-3 py-1.5 text-texto-sec">{f.fila}</td>
                            <td className="px-3 py-1.5"><Codigo valor={f.codigo} /></td>
                            <td className="px-3 py-1.5">{f.denominacion}</td>
                            <td className="px-3 py-1.5 text-texto-sec">{f.tipoNivel}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {vp.filasLeidas > vp.muestra.length && <p className="border-t border-borde px-3 py-2 text-xs text-texto-sec">Se muestran las primeras {vp.muestra.length} filas.</p>}
                  </div>
                </div>
              </Tarjeta>
            )}

            {vp?.valido && (
              <Tarjeta>
                <EncabezadoTarjeta titulo="Datos de la nueva versión" descripcion="Documente el origen de los datos para mantener la trazabilidad." />
                <form onSubmit={enviar} className="grid gap-4 p-5 sm:grid-cols-2">
                  <CampoTexto etiqueta="Código de la versión" obligatorio value={datos.codigo} error={errores.codigo}
                    onChange={(e) => setDatos({ ...datos, codigo: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') })}
                    ayuda="Por ejemplo: PLAN_EMPRESA_2026" />
                  <CampoTexto etiqueta="Nombre" obligatorio value={datos.nombre} error={errores.nombre} onChange={(e) => setDatos({ ...datos, nombre: e.target.value })} />
                  <CampoTexto etiqueta="Fuente de los datos" obligatorio value={datos.fuenteTitulo} error={errores.fuenteTitulo}
                    onChange={(e) => setDatos({ ...datos, fuenteTitulo: e.target.value })} ayuda="Documento o sistema del que proviene el archivo." />
                  <CampoTexto etiqueta="Enlace de la fuente" type="url" value={datos.fuenteUrl} error={errores.fuenteUrl} onChange={(e) => setDatos({ ...datos, fuenteUrl: e.target.value })} />
                  <div className="sm:col-span-2">
                    <AreaTexto etiqueta="Notas" value={datos.notas} onChange={(e) => setDatos({ ...datos, notas: e.target.value })} />
                  </div>
                  <label className="flex items-start gap-2.5 text-[13px] sm:col-span-2">
                    <input type="checkbox" checked={aceptado} onChange={(e) => setAceptado(e.target.checked)} className="mt-0.5 size-4 accent-[#1d4ed8]" />
                    Confirmo que revisé la vista previa. Entiendo que el catálogo se registrará como <strong>no oficial</strong> y que la operación quedará en el historial.
                  </label>
                  <div className="flex justify-end gap-2 sm:col-span-2">
                    <Boton onClick={reiniciar}>Cancelar</Boton>
                    <Boton type="submit" variante="primario" cargando={confirmar.isPending}
                      disabled={!aceptado || !datos.codigo || !datos.nombre || !datos.fuenteTitulo}>
                      Importar {formatearNumero(vp.totalCuentas)} cuentas
                    </Boton>
                  </div>
                </form>
              </Tarjeta>
            )}
          </div>

          <Tarjeta className="h-fit">
            <EncabezadoTarjeta titulo="Formato del archivo" />
            <div className="space-y-3 p-5 text-[13px] leading-relaxed text-texto-sec">
              <p>La primera fila debe contener los encabezados:</p>
              <ul className="space-y-1">
                <li><code className="rounded bg-slate-100 px-1.5 py-0.5 text-texto">codigo</code> — solo dígitos, obligatorio</li>
                <li><code className="rounded bg-slate-100 px-1.5 py-0.5 text-texto">denominacion</code> — obligatorio</li>
                <li><code className="rounded bg-slate-100 px-1.5 py-0.5 text-texto">descripcion</code> — opcional</li>
              </ul>
              <p>Los <strong className="text-texto">elementos</strong> se definen con códigos de un dígito. Cada cuenta debe tener su cuenta superior en el archivo (el código sin su último dígito).</p>
              <p>En Excel, guarde la columna de códigos con formato <strong className="text-texto">Texto</strong> para conservar los ceros a la izquierda.</p>
              <p>Puede usar como referencia el CSV que genera la exportación del catálogo: tiene el mismo formato.</p>
            </div>
          </Tarjeta>
        </div>
      )}
    </>
  )
}
