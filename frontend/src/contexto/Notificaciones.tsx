import { CheckCircle2, X, XCircle } from 'lucide-react'
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

interface Toast {
  id: number
  tipo: 'exito' | 'error'
  mensaje: string
}

const Contexto = createContext<{ exito: (m: string) => void; error: (m: string) => void } | null>(null)

/** Mensajes breves de confirmación o error tras una acción del usuario. */
export function ProveedorNotificaciones({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const quitar = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), [])
  const agregar = useCallback(
    (tipo: Toast['tipo'], mensaje: string) => {
      const id = Date.now() + Math.random()
      setToasts((t) => [...t.slice(-3), { id, tipo, mensaje }])
      setTimeout(() => quitar(id), tipo === 'error' ? 7000 : 4500)
    },
    [quitar],
  )
  const exito = useCallback((m: string) => agregar('exito', m), [agregar])
  const error = useCallback((m: string) => agregar('error', m), [agregar])

  return (
    <Contexto.Provider value={{ exito, error }}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed right-4 bottom-4 z-[60] flex w-[min(380px,calc(100%-2rem))] flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto flex items-start gap-3 rounded-lg border border-borde bg-white px-4 py-3 text-[13px] shadow-flotante">
            {t.tipo === 'exito' ? <CheckCircle2 className="mt-px size-4 shrink-0 text-exito" /> : <XCircle className="mt-px size-4 shrink-0 text-error" />}
            <p className="flex-1 text-texto">{t.mensaje}</p>
            <button onClick={() => quitar(t.id)} className="text-texto-sec hover:text-texto" aria-label="Cerrar notificación">
              <X className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </Contexto.Provider>
  )
}

export function useNotificar() {
  const ctx = useContext(Contexto)
  if (!ctx) throw new Error('useNotificar debe usarse dentro de ProveedorNotificaciones')
  return ctx
}
