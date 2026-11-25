import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ApiError } from './api/cliente'
import App from './App'
import { ProveedorNotificaciones } from './contexto/Notificaciones'
import { ProveedorSesion } from './contexto/Sesion'
import { ProveedorVersion } from './contexto/Version'
import './index.css'

const clienteConsultas = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // No se reintentan errores del cliente (401, 403, 404, 422…).
      retry: (intentos, error) => !(error instanceof ApiError && error.estado >= 400 && error.estado < 500) && intentos < 2,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={clienteConsultas}>
      <ProveedorNotificaciones>
        <ProveedorSesion>
          <ProveedorVersion>
            <App />
          </ProveedorVersion>
        </ProveedorSesion>
      </ProveedorNotificaciones>
    </QueryClientProvider>
  </StrictMode>,
)
