import { useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, prepararCsrf, registrarExpiracionSesion } from '../api/cliente'
import type { UsuarioSesion } from '../api/tipos'

export const PERMISOS = {
  consultar: 'CATALOGO_CONSULTAR',
  exportar: 'CATALOGO_EXPORTAR',
  gestionarCuentas: 'CUENTAS_GESTIONAR',
  importar: 'CATALOGO_IMPORTAR',
  gestionarUsuarios: 'USUARIOS_GESTIONAR',
  configurar: 'CONFIGURACION_GESTIONAR',
  consultarContabilidad: 'CONTABILIDAD_CONSULTAR',
  registrarAsientos: 'ASIENTOS_REGISTRAR',
  anularAsientos: 'ASIENTOS_ANULAR',
} as const

interface ValorSesion {
  usuario: UsuarioSesion | null
  cargando: boolean
  sesionExpirada: boolean
  iniciar: (usuario: string, password: string) => Promise<void>
  cerrar: () => Promise<void>
  puede: (permiso: string) => boolean
}

const ContextoSesion = createContext<ValorSesion | null>(null)

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null)
  const [cargando, setCargando] = useState(true)
  const [sesionExpirada, setSesionExpirada] = useState(false)
  const qc = useQueryClient()

  useEffect(() => {
    registrarExpiracionSesion(() => {
      setUsuario((u) => {
        if (u) setSesionExpirada(true)
        return null
      })
      qc.clear()
    })
    ;(async () => {
      try {
        await prepararCsrf()
        setUsuario(await api.get<UsuarioSesion>('/api/auth/sesion'))
      } catch {
        setUsuario(null)
      } finally {
        setCargando(false)
      }
    })()
  }, [qc])

  const iniciar = useCallback(async (nombre: string, password: string) => {
    await prepararCsrf()
    const u = await api.post<UsuarioSesion>('/api/auth/login', { usuario: nombre, password })
    setSesionExpirada(false)
    setUsuario(u)
  }, [])

  const cerrar = useCallback(async () => {
    try {
      await api.post('/api/auth/logout')
    } finally {
      setUsuario(null)
      qc.clear()
    }
  }, [qc])

  const puede = useCallback((permiso: string) => !!usuario?.permisos.includes(permiso), [usuario])

  const valor = useMemo(
    () => ({ usuario, cargando, sesionExpirada, iniciar, cerrar, puede }),
    [usuario, cargando, sesionExpirada, iniciar, cerrar, puede],
  )
  return <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>
}

export function useSesion() {
  const ctx = useContext(ContextoSesion)
  if (!ctx) throw new Error('useSesion debe usarse dentro de ProveedorSesion')
  return ctx
}
