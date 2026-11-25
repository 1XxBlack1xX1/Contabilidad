import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useVersiones } from '../api/consultas'
import type { VersionPcge } from '../api/tipos'
import { useSesion } from './Sesion'

const CLAVE = 'contabilidad.version'

interface ValorVersion {
  versiones: VersionPcge[]
  version?: VersionPcge
  codigo?: string
  seleccionar: (codigo: string) => void
}

const ContextoVersion = createContext<ValorVersion | null>(null)

/** Versión del PCGE con la que trabaja el usuario. Se recuerda entre sesiones en este navegador. */
export function ProveedorVersion({ children }: { children: ReactNode }) {
  const { usuario } = useSesion()
  const { data: versiones = [] } = useVersiones(!!usuario)
  const [elegida, setElegida] = useState<string | null>(() => localStorage.getItem(CLAVE))

  const version = useMemo(
    () => versiones.find((v) => v.codigo === elegida) ?? versiones.find((v) => v.predeterminada) ?? versiones[0],
    [versiones, elegida],
  )

  useEffect(() => {
    if (versiones.length && elegida && !versiones.some((v) => v.codigo === elegida)) {
      localStorage.removeItem(CLAVE)
      setElegida(null)
    }
  }, [versiones, elegida])

  const valor = useMemo<ValorVersion>(
    () => ({
      versiones,
      version,
      codigo: version?.codigo,
      seleccionar: (codigo) => {
        localStorage.setItem(CLAVE, codigo)
        setElegida(codigo)
      },
    }),
    [versiones, version],
  )
  return <ContextoVersion.Provider value={valor}>{children}</ContextoVersion.Provider>
}

export function useVersionActiva() {
  const ctx = useContext(ContextoVersion)
  if (!ctx) throw new Error('useVersionActiva debe usarse dentro de ProveedorVersion')
  return ctx
}
