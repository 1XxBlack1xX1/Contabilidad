import { FileSpreadsheet, FileText, FileType2 } from 'lucide-react'
import { useState } from 'react'
import { ApiError, api, construirQuery } from '../../api/cliente'
import type { FiltrosCuentas } from '../../api/tipos'
import { useNotificar } from '../../contexto/Notificaciones'
import { Aviso, Boton, Dialogo, cx } from '../ui'

const FORMATOS = [
  { id: 'XLSX', titulo: 'Excel (.xlsx)', texto: 'Con estructura jerárquica plegable, sangrías y filtros por columna.', icono: FileSpreadsheet },
  { id: 'PDF', titulo: 'PDF', texto: 'Documento para imprimir o archivar, con fuente normativa y paginación.', icono: FileText },
  { id: 'CSV', titulo: 'CSV', texto: 'Texto separado por comas (UTF-8). Compatible con la importación.', icono: FileType2 },
] as const

function describir(f: FiltrosCuentas & { conObservacion?: boolean }) {
  const partes: string[] = []
  if (f.termino) partes.push(`búsqueda “${f.termino}”`)
  if (f.elemento !== undefined) partes.push(`elemento ${f.elemento}`)
  if (f.nivel) partes.push(`nivel de ${f.nivel} dígitos`)
  if (f.estado && f.estado !== 'TODAS') partes.push(f.estado === 'ACTIVAS' ? 'solo activas' : 'solo inactivas')
  if (f.origen) partes.push(`origen ${f.origen.toLowerCase()}`)
  if (f.conObservacion) partes.push('con observación de la fuente')
  return partes
}

export function DialogoExportar({ abierto, alCerrar, filtros }: { abierto: boolean; alCerrar: () => void; filtros: FiltrosCuentas & { conObservacion?: boolean } }) {
  const [formato, setFormato] = useState<(typeof FORMATOS)[number]['id']>('XLSX')
  const [generando, setGenerando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const notificar = useNotificar()
  const partes = describir(filtros)

  const exportar = async () => {
    setGenerando(true)
    setError(null)
    try {
      await api.descargar(`/api/exportaciones/cuentas${construirQuery({ ...filtros, formato })}`)
      notificar.exito('El archivo se generó correctamente.')
      alCerrar()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo generar el archivo.')
    } finally {
      setGenerando(false)
    }
  }

  return (
    <Dialogo
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Exportar catálogo"
      descripcion="El archivo incluye la versión del PCGE, su fuente normativa y la fecha de generación."
      pie={
        <>
          <Boton onClick={alCerrar}>Cancelar</Boton>
          <Boton variante="primario" onClick={exportar} cargando={generando}>Descargar</Boton>
        </>
      }
    >
      <fieldset>
        <legend className="mb-2 text-[13px] font-medium">Formato</legend>
        <div className="space-y-2">
          {FORMATOS.map(({ id, titulo, texto, icono: Icono }) => (
            <label key={id} className={cx('flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors', formato === id ? 'border-corporativo bg-corporativo-claro/50' : 'border-borde hover:border-slate-300')}>
              <input type="radio" name="formato" value={id} checked={formato === id} onChange={() => setFormato(id)} className="mt-1 accent-[#1d4ed8]" />
              <Icono className="mt-0.5 size-5 text-marino" aria-hidden />
              <span>
                <span className="block text-[13.5px] font-medium">{titulo}</span>
                <span className="block text-xs text-texto-sec">{texto}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="mt-4 rounded-md bg-slate-50 px-3.5 py-3 text-[13px]">
        <span className="font-medium">Filtros aplicados: </span>
        <span className="text-texto-sec">{partes.length ? partes.join(', ') : 'ninguno — se exportará el catálogo completo.'}</span>
      </div>
      {error && <Aviso tono="error" className="mt-4">{error}</Aviso>}
    </Dialogo>
  )
}
