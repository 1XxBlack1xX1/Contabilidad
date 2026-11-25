import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { useSesion } from '../../contexto/Sesion'
import { useVersionActiva } from '../../contexto/Version'
import { Aviso, Cargando } from '../ui'
import { BarraLateral } from './BarraLateral'
import { BarraSuperior } from './BarraSuperior'

/** Estructura de las pantallas autenticadas: barra lateral, barra superior y contenido. */
export function Plantilla() {
  const { usuario, cargando } = useSesion()
  const { version } = useVersionActiva()
  const [menuMovil, setMenuMovil] = useState(false)
  const ubicacion = useLocation()

  useEffect(() => setMenuMovil(false), [ubicacion.pathname])

  if (cargando) return <Cargando texto="Verificando sesión…" className="min-h-screen" />
  if (!usuario) return <Navigate to="/login" replace state={{ desde: ubicacion.pathname + ubicacion.search }} />

  return (
    <div className="min-h-screen bg-fondo">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 xl:block">
        <BarraLateral />
      </aside>
      {menuMovil && (
        <div className="fixed inset-0 z-50 xl:hidden">
          <div className="absolute inset-0 bg-marino/50" onClick={() => setMenuMovil(false)} aria-hidden />
          <aside className="absolute inset-y-0 left-0 w-72 shadow-flotante">
            <BarraLateral alNavegar={() => setMenuMovil(false)} />
          </aside>
        </div>
      )}
      <div className="xl:pl-64">
        <BarraSuperior alAbrirMenu={() => setMenuMovil(true)} />
        <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {version && !version.oficial && (
            <Aviso tono="advertencia" titulo="Está trabajando con un catálogo importado" className="mb-6">
              La versión “{version.nombre}” fue cargada desde un archivo y no está verificada como fuente oficial del PCGE.
            </Aviso>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  )
}
