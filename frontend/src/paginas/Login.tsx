import { FileCheck2, History, Lock, ShieldCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { ApiError } from '../api/cliente'
import { Aviso, Boton, CampoTexto } from '../componentes/ui'
import { useSesion } from '../contexto/Sesion'

const PILARES = [
  { icono: FileCheck2, titulo: 'Catálogo oficial', texto: 'Transcrito del documento del MEF, con su norma de aprobación y fecha de consulta.' },
  { icono: ShieldCheck, titulo: 'Cuentas protegidas', texto: 'Las cuentas oficiales no se modifican; las personalizadas quedan identificadas.' },
  { icono: History, titulo: 'Trazabilidad', texto: 'Cada cambio queda registrado con usuario, fecha y motivo.' },
]

export default function Login() {
  const { usuario, iniciar, sesionExpirada } = useSesion()
  const navegar = useNavigate()
  const ubicacion = useLocation()
  const [nombre, setNombre] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const destino = (ubicacion.state as { desde?: string } | null)?.desde ?? '/'

  if (usuario) return <Navigate to={destino} replace />

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setEnviando(true)
    try {
      await iniciar(nombre, password)
      navegar(destino, { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo iniciar sesión.')
      setPassword('')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-marino p-12 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '44px 44px' }}
          aria-hidden
        />
        <div className="relative flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-lg bg-white/10 ring-1 ring-white/15">
            <svg viewBox="0 0 32 32" className="size-6" aria-hidden>
              <path d="M9 22V10h3v12zM14.5 22V14h3v8zM20 22v-5h3v5z" fill="#fff" />
              <path d="M8 24.5h16" stroke="#60A5FA" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </div>
          <span className="text-lg font-semibold tracking-[0.1em]">CONTABILIDAD</span>
        </div>
        <div className="relative max-w-lg">
          <h1 className="text-[34px] leading-tight font-semibold tracking-tight">Plan Contable General Empresarial del Perú</h1>
          <p className="mt-4 text-[15px] leading-relaxed text-slate-300">
            Consulte, organice y adapte el catálogo de cuentas con la precisión y la trazabilidad que exige la práctica contable.
          </p>
          <ul className="mt-10 space-y-5">
            {PILARES.map(({ icono: Icono, titulo, texto }) => (
              <li key={titulo} className="flex gap-4">
                <div className="grid size-9 shrink-0 place-items-center rounded-md bg-white/10">
                  <Icono className="size-[18px] text-[#9cc0ff]" aria-hidden />
                </div>
                <div>
                  <p className="font-medium">{titulo}</p>
                  <p className="mt-0.5 text-[13.5px] text-slate-400">{texto}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-slate-500">Fuente del catálogo: Ministerio de Economía y Finanzas — Consejo Normativo de Contabilidad.</p>
      </section>

      <section className="flex items-center justify-center bg-fondo px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <p className="text-lg font-semibold tracking-[0.1em] text-marino">CONTABILIDAD</p>
            <p className="text-[13px] text-texto-sec">Plan Contable General Empresarial</p>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">Iniciar sesión</h2>
          <p className="mt-1.5 text-sm text-texto-sec">Ingrese con su usuario o su correo institucional.</p>

          {sesionExpirada && !error && (
            <Aviso tono="advertencia" className="mt-6">
              Su sesión expiró por inactividad. Ingrese nuevamente para continuar.
            </Aviso>
          )}
          {error && (
            <Aviso tono="error" className="mt-6">
              {error}
            </Aviso>
          )}

          <form onSubmit={enviar} className="mt-6 space-y-4" noValidate>
            <CampoTexto etiqueta="Usuario o correo electrónico" value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="username" autoFocus obligatorio />
            <CampoTexto
              etiqueta="Contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              obligatorio
            />
            <Boton type="submit" variante="primario" className="w-full" cargando={enviando} disabled={!nombre || !password} icono={<Lock className="size-4" />}>
              Ingresar
            </Boton>
          </form>
          <p className="mt-8 text-center text-xs text-texto-sec">Conexión protegida. Tras 5 intentos fallidos la cuenta se bloquea temporalmente.</p>
        </div>
      </section>
    </div>
  )
}
