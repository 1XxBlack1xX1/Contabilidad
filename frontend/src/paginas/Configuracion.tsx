import { ExternalLink } from 'lucide-react'
import { Link } from 'react-router'
import { EncabezadoPagina, EncabezadoTarjeta, Insignia, Selector, Tarjeta } from '../componentes/ui'
import { PERMISOS, useSesion } from '../contexto/Sesion'
import { useVersionActiva } from '../contexto/Version'
import { ETIQUETA_ROL } from '../utilidades/formato'

const NOMBRE_PERMISO: Record<string, string> = {
  CATALOGO_CONSULTAR: 'Consultar el catálogo',
  CATALOGO_EXPORTAR: 'Exportar a Excel, PDF y CSV',
  CUENTAS_GESTIONAR: 'Registrar, editar, activar y desactivar cuentas',
  CATALOGO_IMPORTAR: 'Importar catálogos',
  USUARIOS_GESTIONAR: 'Administrar usuarios',
  CONFIGURACION_GESTIONAR: 'Cambiar la configuración general',
  CONTABILIDAD_CONSULTAR: 'Consultar asientos, libros y reportes',
  ASIENTOS_REGISTRAR: 'Registrar asientos contables',
  ASIENTOS_ANULAR: 'Anular asientos contables',
}

export default function Configuracion() {
  const { versiones, version, seleccionar } = useVersionActiva()
  const { usuario, puede } = useSesion()
  const predeterminada = versiones.find((v) => v.predeterminada)

  return (
    <>
      <EncabezadoPagina titulo="Configuración" descripcion="Preferencias de trabajo y parámetros generales del sistema." />
      <div className="grid gap-6 xl:grid-cols-2">
        <Tarjeta>
          <EncabezadoTarjeta titulo="Versión de trabajo" descripcion="Se aplica solo en este navegador." />
          <div className="space-y-4 p-5">
            <Selector etiqueta="Versión del PCGE con la que trabaja" value={version?.codigo ?? ''} onChange={(e) => seleccionar(e.target.value)}>
              {versiones.map((v) => <option key={v.codigo} value={v.codigo}>{v.nombre} — {v.estadoEtiqueta}</option>)}
            </Selector>
            <p className="text-[13px] text-texto-sec">
              Versión predeterminada para todos los usuarios: <strong className="text-texto">{predeterminada?.nombre ?? '—'}</strong>.{' '}
              {puede(PERMISOS.configurar)
                ? <Link to="/plan-contable/versiones" className="font-medium text-corporativo hover:underline">Cambiarla en Versiones y fuentes</Link>
                : 'Solo un administrador puede cambiarla.'}
            </p>
          </div>
        </Tarjeta>

        <Tarjeta>
          <EncabezadoTarjeta titulo="Su acceso" descripcion="Permisos que otorgan sus roles." />
          <div className="p-5">
            <div className="flex flex-wrap gap-1.5">{usuario?.roles.map((r) => <Insignia key={r} tono="marino">{ETIQUETA_ROL[r] ?? r}</Insignia>)}</div>
            <ul className="mt-4 space-y-1.5 text-[13px]">
              {Object.entries(NOMBRE_PERMISO).map(([p, nombre]) => (
                <li key={p} className="flex items-center gap-2">
                  <span className={puede(p) ? 'text-exito' : 'text-slate-300'} aria-hidden>{puede(p) ? '●' : '○'}</span>
                  <span className={puede(p) ? '' : 'text-texto-sec line-through decoration-slate-300'}>{nombre}</span>
                </li>
              ))}
            </ul>
          </div>
        </Tarjeta>

        <Tarjeta className="xl:col-span-2">
          <EncabezadoTarjeta titulo="Seguridad y transparencia" />
          <ul className="grid gap-4 p-5 text-[13px] text-texto-sec md:grid-cols-2">
            <li><strong className="block text-texto">Sesión segura</strong>Cookie HttpOnly con SameSite estricto, protección CSRF y expiración tras 30 minutos de inactividad.</li>
            <li><strong className="block text-texto">Catálogo oficial protegido</strong>La base de datos impide modificar o eliminar cuentas oficiales, además de las validaciones de la aplicación.</li>
            <li><strong className="block text-texto">Historial inalterable</strong>Cada cambio registra usuario, fecha, valores anteriores y motivo; el historial no puede editarse ni borrarse.</li>
            <li><strong className="block text-texto">Origen de los datos</strong>Cada versión documenta su norma, el documento fuente, su huella SHA-256 y la fecha de consulta.</li>
          </ul>
          <div className="border-t border-borde px-5 py-3 text-[13px]">
            <a href="/swagger-ui.html" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-corporativo hover:underline">
              Documentación técnica de la API <ExternalLink className="size-3.5" aria-hidden />
            </a>
          </div>
        </Tarjeta>
      </div>
    </>
  )
}
