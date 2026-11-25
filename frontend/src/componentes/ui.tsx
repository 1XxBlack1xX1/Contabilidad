import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Info, Loader2, X, XCircle } from 'lucide-react'
import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')
export { cx }

// ------------------------------------------------------------------ Botón

type Variante = 'primario' | 'secundario' | 'fantasma' | 'peligro'

interface PropsBoton extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante
  tamano?: 'sm' | 'md'
  icono?: ReactNode
  cargando?: boolean
}

const VARIANTES: Record<Variante, string> = {
  primario: 'bg-corporativo text-white hover:bg-[#1a44c2] shadow-sm disabled:bg-corporativo/50',
  secundario: 'bg-white text-texto border border-borde hover:bg-slate-50 hover:border-slate-300 shadow-sm',
  fantasma: 'text-texto-sec hover:text-texto hover:bg-slate-100',
  peligro: 'bg-error text-white hover:bg-[#a31818] shadow-sm disabled:bg-error/50',
}

export const Boton = forwardRef<HTMLButtonElement, PropsBoton>(function Boton(
  { variante = 'secundario', tamano = 'md', icono, cargando, className, children, disabled, type = 'button', ...resto },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || cargando}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors whitespace-nowrap',
        'disabled:cursor-not-allowed disabled:opacity-60',
        tamano === 'sm' ? 'h-8 px-3 text-[13px]' : 'h-9 px-4 text-sm',
        VARIANTES[variante],
        className,
      )}
      {...resto}
    >
      {cargando ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icono}
      {children}
    </button>
  )
})

// ------------------------------------------------------------------ Insignia

export type Tono = 'exito' | 'error' | 'advertencia' | 'info' | 'neutro' | 'marino'

const TONOS: Record<Tono, string> = {
  exito: 'bg-exito-claro text-exito ring-exito/20',
  error: 'bg-error-claro text-error ring-error/20',
  advertencia: 'bg-advertencia-claro text-advertencia ring-advertencia/25',
  info: 'bg-corporativo-claro text-corporativo ring-corporativo/20',
  neutro: 'bg-slate-100 text-slate-600 ring-slate-500/15',
  marino: 'bg-marino text-white ring-marino',
}

export function Insignia({ tono = 'neutro', children, punto, className }: { tono?: Tono; children: ReactNode; punto?: boolean; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap', TONOS[tono], className)}>
      {punto && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  )
}

export function InsigniaEstado({ activa }: { activa: boolean }) {
  return (
    <Insignia tono={activa ? 'exito' : 'neutro'} punto>
      {activa ? 'Activa' : 'Inactiva'}
    </Insignia>
  )
}

export function InsigniaOrigen({ origen }: { origen: 'OFICIAL' | 'IMPORTADA' | 'PERSONALIZADA' }) {
  if (origen === 'OFICIAL') return <Insignia tono="marino">Oficial</Insignia>
  if (origen === 'IMPORTADA') return <Insignia tono="advertencia">Importada</Insignia>
  return <Insignia tono="info">Personalizada</Insignia>
}

// ------------------------------------------------------------------ Contenedores

export function Tarjeta({ children, className, ...resto }: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx('rounded-lg border border-borde bg-white shadow-tarjeta', className)} {...resto}>
      {children}
    </div>
  )
}

export function EncabezadoTarjeta({ titulo, descripcion, acciones }: { titulo: ReactNode; descripcion?: ReactNode; acciones?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-borde px-5 py-4">
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold text-texto">{titulo}</h2>
        {descripcion && <p className="mt-0.5 text-[13px] text-texto-sec">{descripcion}</p>}
      </div>
      {acciones && <div className="flex items-center gap-2">{acciones}</div>}
    </div>
  )
}

export function EncabezadoPagina({ titulo, descripcion, acciones, migas }: { titulo: string; descripcion?: ReactNode; acciones?: ReactNode; migas?: ReactNode }) {
  return (
    <header className="mb-6">
      {migas && <div className="mb-2 text-[13px] text-texto-sec">{migas}</div>}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[22px] font-semibold tracking-tight text-texto">{titulo}</h1>
          {descripcion && <p className="mt-1 max-w-3xl text-sm text-texto-sec">{descripcion}</p>}
        </div>
        {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
      </div>
    </header>
  )
}

// ------------------------------------------------------------------ Formularios

const estiloCampo =
  'block w-full rounded-md border border-borde bg-white px-3 text-sm text-texto shadow-sm transition-colors placeholder:text-slate-400 ' +
  'hover:border-slate-300 focus:border-corporativo focus:outline-none focus:ring-2 focus:ring-corporativo/15 disabled:bg-slate-50 disabled:text-texto-sec'

interface PropsCampo {
  etiqueta: string
  ayuda?: ReactNode
  error?: string
  obligatorio?: boolean
}

function Envoltura({ id, etiqueta, ayuda, error, obligatorio, children }: PropsCampo & { id: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-texto">
        {etiqueta}
        {obligatorio && <span className="ml-0.5 text-error" aria-hidden>*</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-msg`} className="mt-1.5 flex items-start gap-1 text-[12.5px] text-error">
          <XCircle className="mt-px size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : (
        ayuda && <p id={`${id}-msg`} className="mt-1.5 text-[12.5px] text-texto-sec">{ayuda}</p>
      )}
    </div>
  )
}

export function CampoTexto({ etiqueta, ayuda, error, obligatorio, className, ...resto }: PropsCampo & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId()
  return (
    <Envoltura id={id} etiqueta={etiqueta} ayuda={ayuda} error={error} obligatorio={obligatorio}>
      <input
        id={id}
        aria-invalid={!!error}
        aria-describedby={error || ayuda ? `${id}-msg` : undefined}
        required={obligatorio}
        className={cx(estiloCampo, 'h-9', error && 'border-error focus:border-error focus:ring-error/15', className)}
        {...resto}
      />
    </Envoltura>
  )
}

export function AreaTexto({ etiqueta, ayuda, error, obligatorio, className, ...resto }: PropsCampo & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId()
  return (
    <Envoltura id={id} etiqueta={etiqueta} ayuda={ayuda} error={error} obligatorio={obligatorio}>
      <textarea
        id={id}
        aria-invalid={!!error}
        aria-describedby={error || ayuda ? `${id}-msg` : undefined}
        required={obligatorio}
        className={cx(estiloCampo, 'min-h-20 py-2', error && 'border-error', className)}
        {...resto}
      />
    </Envoltura>
  )
}

export function Selector({ etiqueta, ayuda, error, obligatorio, className, children, ...resto }: PropsCampo & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId()
  return (
    <Envoltura id={id} etiqueta={etiqueta} ayuda={ayuda} error={error} obligatorio={obligatorio}>
      <select id={id} className={cx(estiloCampo, 'h-9 pr-8', className)} {...resto}>
        {children}
      </select>
    </Envoltura>
  )
}

/** Selector compacto para barras de filtros (etiqueta visualmente oculta). */
export function Filtro({ etiqueta, className, children, ...resto }: { etiqueta: string } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-texto-sec">{etiqueta}</span>
      <select className={cx(estiloCampo, 'h-9 pr-8', className)} {...resto}>
        {children}
      </select>
    </label>
  )
}

// ------------------------------------------------------------------ Estados

export function Cargando({ texto = 'Cargando…', className }: { texto?: string; className?: string }) {
  return (
    <div role="status" className={cx('flex items-center justify-center gap-2 py-12 text-sm text-texto-sec', className)}>
      <Loader2 className="size-4 animate-spin" aria-hidden />
      {texto}
    </div>
  )
}

export function Esqueleto({ className }: { className?: string }) {
  return <div className={cx('animate-pulse rounded bg-slate-200/70', className)} aria-hidden />
}

export function EstadoVacio({ icono, titulo, descripcion, accion }: { icono?: ReactNode; titulo: string; descripcion?: ReactNode; accion?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {icono && <div className="mb-3 rounded-full bg-slate-100 p-3 text-slate-500">{icono}</div>}
      <p className="font-medium text-texto">{titulo}</p>
      {descripcion && <p className="mt-1 max-w-md text-[13px] text-texto-sec">{descripcion}</p>}
      {accion && <div className="mt-4">{accion}</div>}
    </div>
  )
}

const ICONOS_AVISO = { info: Info, exito: CheckCircle2, advertencia: AlertTriangle, error: XCircle }
const ESTILO_AVISO = {
  info: 'border-corporativo/20 bg-corporativo-claro text-[#1e3a8a]',
  exito: 'border-exito/20 bg-exito-claro text-[#14532d]',
  advertencia: 'border-advertencia/25 bg-advertencia-claro text-[#78350f]',
  error: 'border-error/20 bg-error-claro text-[#7f1d1d]',
}

export function Aviso({ tono = 'info', titulo, children, className }: { tono?: keyof typeof ICONOS_AVISO; titulo?: string; children?: ReactNode; className?: string }) {
  const Icono = ICONOS_AVISO[tono]
  return (
    <div role={tono === 'error' ? 'alert' : 'note'} className={cx('flex gap-3 rounded-md border px-4 py-3 text-[13px]', ESTILO_AVISO[tono], className)}>
      <Icono className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 leading-relaxed">
        {titulo && <p className="font-semibold">{titulo}</p>}
        {children}
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ Diálogo

export function Dialogo({
  abierto,
  alCerrar,
  titulo,
  descripcion,
  children,
  pie,
  ancho = 'max-w-lg',
}: {
  abierto: boolean
  alCerrar: () => void
  titulo: string
  descripcion?: ReactNode
  children?: ReactNode
  pie?: ReactNode
  ancho?: string
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (abierto && !d.open) d.showModal()
    if (!abierto && d.open) d.close()
  }, [abierto])

  return (
    <dialog
      ref={ref}
      onClose={alCerrar}
      onCancel={(e) => {
        e.preventDefault()
        alCerrar()
      }}
      onClick={(e) => e.target === ref.current && alCerrar()}
      className={cx(
        'm-auto w-[calc(100%-2rem)] rounded-xl border border-borde bg-white p-0 text-texto shadow-flotante backdrop:bg-marino/40 backdrop:backdrop-blur-[2px]',
        ancho,
      )}
    >
      {abierto && (
        <div className="flex max-h-[85vh] flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-borde px-6 py-4">
            <div>
              <h2 className="text-base font-semibold">{titulo}</h2>
              {descripcion && <p className="mt-1 text-[13px] text-texto-sec">{descripcion}</p>}
            </div>
            <button onClick={alCerrar} className="-mr-2 rounded-md p-1.5 text-texto-sec hover:bg-slate-100 hover:text-texto" aria-label="Cerrar">
              <X className="size-4" />
            </button>
          </div>
          <div className="overflow-y-auto px-6 py-5">{children}</div>
          {pie && <div className="flex justify-end gap-2 border-t border-borde bg-slate-50/60 px-6 py-3.5">{pie}</div>}
        </div>
      )}
    </dialog>
  )
}

// ------------------------------------------------------------------ Paginación

export function Paginacion({ pagina, totalPaginas, total, tamano, alCambiar }: { pagina: number; totalPaginas: number; total: number; tamano: number; alCambiar: (p: number) => void }) {
  if (total === 0) return null
  const desde = pagina * tamano + 1
  const hasta = Math.min(total, (pagina + 1) * tamano)
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-borde px-5 py-3 text-[13px] text-texto-sec">
      <span>
        Mostrando <strong className="font-medium text-texto">{desde.toLocaleString('es-PE')}–{hasta.toLocaleString('es-PE')}</strong> de{' '}
        <strong className="font-medium text-texto">{total.toLocaleString('es-PE')}</strong> cuentas
      </span>
      <div className="flex items-center gap-1">
        <Boton tamano="sm" variante="fantasma" disabled={pagina === 0} onClick={() => alCambiar(pagina - 1)} icono={<ChevronLeft className="size-4" />}>
          Anterior
        </Boton>
        <span className="px-2">
          Página {pagina + 1} de {Math.max(totalPaginas, 1)}
        </span>
        <Boton tamano="sm" variante="fantasma" disabled={pagina + 1 >= totalPaginas} onClick={() => alCambiar(pagina + 1)}>
          Siguiente
          <ChevronRight className="size-4" />
        </Boton>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ Código contable

export function Codigo({ valor, className }: { valor: string; className?: string }) {
  return <span className={cx('codigo font-semibold text-marino', className)}>{valor}</span>
}
