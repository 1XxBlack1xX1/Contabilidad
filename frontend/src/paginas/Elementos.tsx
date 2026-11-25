import { ArrowRight, Network } from 'lucide-react'
import { Link } from 'react-router'
import { useElementos } from '../api/consultas'
import { Aviso, Cargando, EncabezadoPagina, Tarjeta } from '../componentes/ui'
import { useVersionActiva } from '../contexto/Version'

/** Clasificación de los elementos según el PCGE: estado de situación financiera, resultados y otros. */
function grupo(numero: number) {
  if (numero >= 1 && numero <= 5) return 'Estado de situación financiera'
  if (numero >= 6 && numero <= 9) return 'Resultados y gestión'
  return 'Fuera de balance'
}

export default function Elementos() {
  const { codigo, version } = useVersionActiva()
  const { data: elementos, isLoading, isError } = useElementos(codigo)

  return (
    <>
      <EncabezadoPagina
        titulo="Elementos contables"
        descripcion={`El primer dígito de cada código identifica su elemento. ${version?.nombre ?? ''}`}
      />
      {isError && <Aviso tono="error">No se pudieron cargar los elementos.</Aviso>}
      {isLoading ? <Cargando /> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {elementos?.map((e) => (
            <Tarjeta key={e.id} className="flex flex-col p-5">
              <div className="flex items-start gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-marino text-xl font-semibold text-white">{e.numero}</span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold tracking-[0.1em] text-texto-sec uppercase">{grupo(e.numero)}</p>
                  <h2 className="mt-1 text-[15px] leading-snug font-semibold">{e.denominacion}</h2>
                </div>
              </div>
              <p className="mt-4 text-[13px] text-texto-sec">
                {e.totalCuentas ? (
                  <><strong className="codigo font-semibold text-texto">{e.totalCuentas.toLocaleString('es-PE')}</strong> cuentas en todos los niveles</>
                ) : 'Sin cuentas codificadas en el PCGE: su desarrollo queda a criterio de cada entidad.'}
              </p>
              {e.seccionFuente && (
                <p className="mt-1 text-xs text-slate-400">Fuente: {e.seccionFuente}{e.paginaFuente && `, pág. ${e.paginaFuente}`}</p>
              )}
              <div className="mt-auto flex gap-4 pt-5 text-[13px] font-medium">
                <Link to={`/plan-contable/cuentas?elemento=${e.numero}`} className="inline-flex items-center gap-1 text-corporativo hover:underline">
                  Ver cuentas <ArrowRight className="size-3.5" aria-hidden />
                </Link>
                <Link to="/plan-contable/explorador" className="inline-flex items-center gap-1 text-texto-sec hover:text-corporativo">
                  <Network className="size-3.5" aria-hidden /> Explorar
                </Link>
              </div>
            </Tarjeta>
          ))}
        </div>
      )}
    </>
  )
}
