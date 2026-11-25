import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router'
import { Plantilla } from './componentes/layout/Plantilla'
import { Cargando, EstadoVacio } from './componentes/ui'
import { PERMISOS, useSesion } from './contexto/Sesion'

const Login = lazy(() => import('./paginas/Login'))
const Dashboard = lazy(() => import('./paginas/Dashboard'))
const Cuentas = lazy(() => import('./paginas/Cuentas'))
const DetalleCuenta = lazy(() => import('./paginas/DetalleCuenta'))
const Explorador = lazy(() => import('./paginas/Explorador'))
const Elementos = lazy(() => import('./paginas/Elementos'))
const Versiones = lazy(() => import('./paginas/Versiones'))
const HistorialCambios = lazy(() => import('./paginas/HistorialCambios'))
const Importar = lazy(() => import('./paginas/Importar'))
const Usuarios = lazy(() => import('./paginas/Usuarios'))
const Configuracion = lazy(() => import('./paginas/Configuracion'))
const Asientos = lazy(() => import('./paginas/contabilidad/Asientos'))
const NuevoAsiento = lazy(() => import('./paginas/contabilidad/NuevoAsiento'))
const DetalleAsiento = lazy(() => import('./paginas/contabilidad/DetalleAsiento'))
const LibroDiario = lazy(() => import('./paginas/contabilidad/LibroDiario'))
const LibroMayor = lazy(() => import('./paginas/contabilidad/LibroMayor'))
const BalanceComprobacion = lazy(() => import('./paginas/contabilidad/BalanceComprobacion'))
const Reportes = lazy(() => import('./paginas/contabilidad/Reportes'))
const NoEncontrado = lazy(() => import('./paginas/NoEncontrado'))

const conCarga = (n: ReactNode) => <Suspense fallback={<Cargando />}>{n}</Suspense>

/** Protege una ruta por permiso; el backend aplica la misma regla. */
function ConPermiso({ permiso, children }: { permiso: string; children: ReactNode }) {
  const { puede } = useSesion()
  return puede(permiso) ? children : (
    <EstadoVacio titulo="Acceso restringido" descripcion="Su usuario no tiene permisos para esta sección. Solicítelo al administrador del sistema." />
  )
}

const router = createBrowserRouter([
  { path: '/login', element: conCarga(<Login />) },
  {
    element: <Plantilla />,
    children: [
      { index: true, element: conCarga(<Dashboard />) },
      { path: 'plan-contable', element: <Navigate to="/plan-contable/cuentas" replace /> },
      { path: 'plan-contable/elementos', element: conCarga(<Elementos />) },
      { path: 'plan-contable/cuentas', element: conCarga(<Cuentas />) },
      { path: 'plan-contable/subcuentas', element: conCarga(<Cuentas modo="subcuentas" key="subcuentas" />) },
      { path: 'plan-contable/cuentas/:id', element: conCarga(<DetalleCuenta />) },
      { path: 'plan-contable/explorador', element: conCarga(<Explorador />) },
      { path: 'plan-contable/versiones', element: conCarga(<Versiones />) },
      { path: 'plan-contable/historial', element: conCarga(<HistorialCambios />) },
      { path: 'plan-contable/importar', element: conCarga(<ConPermiso permiso={PERMISOS.importar}><Importar /></ConPermiso>) },
      { path: 'asientos', element: conCarga(<ConPermiso permiso={PERMISOS.consultarContabilidad}><Asientos /></ConPermiso>) },
      { path: 'asientos/nuevo', element: conCarga(<ConPermiso permiso={PERMISOS.registrarAsientos}><NuevoAsiento /></ConPermiso>) },
      { path: 'asientos/:id', element: conCarga(<ConPermiso permiso={PERMISOS.consultarContabilidad}><DetalleAsiento /></ConPermiso>) },
      { path: 'libro-diario', element: conCarga(<ConPermiso permiso={PERMISOS.consultarContabilidad}><LibroDiario /></ConPermiso>) },
      { path: 'libro-mayor', element: conCarga(<ConPermiso permiso={PERMISOS.consultarContabilidad}><LibroMayor /></ConPermiso>) },
      { path: 'balance-comprobacion', element: conCarga(<ConPermiso permiso={PERMISOS.consultarContabilidad}><BalanceComprobacion /></ConPermiso>) },
      { path: 'reportes', element: conCarga(<ConPermiso permiso={PERMISOS.consultarContabilidad}><Reportes /></ConPermiso>) },
      { path: 'usuarios', element: conCarga(<ConPermiso permiso={PERMISOS.gestionarUsuarios}><Usuarios /></ConPermiso>) },
      { path: 'configuracion', element: conCarga(<Configuracion />) },
      { path: '*', element: conCarga(<NoEncontrado />) },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
