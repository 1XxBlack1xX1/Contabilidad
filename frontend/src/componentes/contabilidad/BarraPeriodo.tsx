import { FileSpreadsheet, FileText } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { ApiError, api, construirQuery } from '../../api/cliente'
import { useNotificar } from '../../contexto/Notificaciones'
import { Boton } from '../ui'

const estiloFecha =
  'h-9 rounded-md border border-borde bg-white px-3 text-sm focus:border-corporativo focus:ring-2 focus:ring-corporativo/15 focus:outline-none'

export function CampoFecha({ etiqueta, valor, alCambiar, max }: { etiqueta: string; valor: string; alCambiar: (v: string) => void; max?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-texto-sec">{etiqueta}</span>
      <input type="date" value={valor} max={max} onChange={(e) => alCambiar(e.target.value)} className={estiloFecha} />
    </label>
  )
}

/** Botones de exportación a Excel y PDF de un libro o reporte. */
export function BotonesExportar({ ruta, parametros, deshabilitado }: { ruta: string; parametros: Record<string, string | number | undefined>; deshabilitado?: boolean }) {
  const [generando, setGenerando] = useState<string | null>(null)
  const notificar = useNotificar()
  const descargar = async (formato: 'XLSX' | 'PDF') => {
    setGenerando(formato)
    try {
      await api.descargar(`${ruta}${construirQuery({ ...parametros, formato })}`)
    } catch (e) {
      notificar.error(e instanceof ApiError ? e.message : 'No se pudo generar el archivo.')
    } finally {
      setGenerando(null)
    }
  }
  return (
    <div className="flex gap-2">
      <Boton icono={<FileSpreadsheet className="size-4" />} cargando={generando === 'XLSX'} disabled={deshabilitado} onClick={() => descargar('XLSX')}>
        Excel
      </Boton>
      <Boton icono={<FileText className="size-4" />} cargando={generando === 'PDF'} disabled={deshabilitado} onClick={() => descargar('PDF')}>
        PDF
      </Boton>
    </div>
  )
}

/** Barra de filtros de período (desde / hasta) con controles adicionales y exportación. */
export function BarraPeriodo({ desde, hasta, alCambiarDesde, alCambiarHasta, children, exportar, error }: {
  desde?: string
  hasta: string
  alCambiarDesde?: (v: string) => void
  alCambiarHasta: (v: string) => void
  children?: ReactNode
  exportar?: ReactNode
  error?: string | null
}) {
  return (
    <div className="border-b border-borde p-4">
      <div className="flex flex-wrap items-end gap-3">
        {alCambiarDesde && desde !== undefined && <CampoFecha etiqueta="Desde" valor={desde} alCambiar={alCambiarDesde} max={hasta} />}
        <CampoFecha etiqueta={alCambiarDesde ? 'Hasta' : 'Al'} valor={hasta} alCambiar={alCambiarHasta} />
        {children}
        {exportar && <div className="ml-auto">{exportar}</div>}
      </div>
      {error && <p className="mt-2 text-[13px] text-error">{error}</p>}
    </div>
  )
}
