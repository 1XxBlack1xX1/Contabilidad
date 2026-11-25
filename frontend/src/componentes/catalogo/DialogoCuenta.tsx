import { Info } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { ApiError, api } from '../../api/cliente'
import { useActualizarCuenta, useCrearCuenta } from '../../api/consultas'
import type { CuentaDetalle, Naturaleza } from '../../api/tipos'
import { useNotificar } from '../../contexto/Notificaciones'
import { useVersionActiva } from '../../contexto/Version'
import { etiquetaDigitos } from '../../utilidades/formato'
import { AreaTexto, Aviso, Boton, CampoTexto, Codigo, Dialogo, Selector } from '../ui'

interface Props {
  abierto: boolean
  alCerrar: () => void
  /** Cuenta a editar; si no se indica, se registra una nueva. */
  cuenta?: CuentaDetalle
  /** Cuenta superior sugerida al registrar una nueva. */
  superior?: { codigo: string; denominacion: string }
}

/** Registro y edición de cuentas personalizadas. */
export function DialogoCuenta({ abierto, alCerrar, cuenta, superior }: Props) {
  const { version } = useVersionActiva()
  const navegar = useNavigate()
  const notificar = useNotificar()
  const crear = useCrearCuenta()
  const actualizar = useActualizarCuenta(cuenta?.id ?? 0)
  const editando = !!cuenta

  const [codigo, setCodigo] = useState('')
  const [denominacion, setDenominacion] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [naturaleza, setNaturaleza] = useState<Naturaleza | ''>('')
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [padre, setPadre] = useState<{ codigo: string; denominacion: string; activa: boolean } | null | 'no-existe'>(null)

  useEffect(() => {
    if (!abierto) return
    setCodigo(cuenta?.codigo ?? superior?.codigo ?? '')
    setDenominacion(cuenta?.denominacion ?? '')
    setDescripcion(cuenta?.descripcion ?? '')
    setNaturaleza(cuenta?.naturaleza ?? '')
    setErrores({})
    setErrorGeneral(null)
  }, [abierto, cuenta, superior])

  // Muestra la cuenta superior que corresponde al código ingresado.
  useEffect(() => {
    if (editando || !version || codigo.length < 3 || !/^\d+$/.test(codigo)) {
      setPadre(null)
      return
    }
    const cp = codigo.slice(0, -1)
    const t = setTimeout(() => {
      api
        .get<CuentaDetalle>(`/api/cuentas/codigo/${cp}?version=${version.codigo}`)
        .then((c) => setPadre({ codigo: c.codigo, denominacion: c.denominacion, activa: c.activa }))
        .catch(() => setPadre('no-existe'))
    }, 250)
    return () => clearTimeout(t)
  }, [codigo, editando, version])

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    setErrores({})
    setErrorGeneral(null)
    try {
      if (editando) {
        await actualizar.mutateAsync({
          denominacion,
          descripcion: descripcion || undefined,
          naturaleza: naturaleza || undefined,
          versionRegistro: cuenta.versionRegistro,
        })
        notificar.exito(`La cuenta ${cuenta.codigo} se actualizó.`)
        alCerrar()
      } else {
        const nueva = await crear.mutateAsync({
          version: version!.codigo,
          codigo,
          denominacion,
          descripcion: descripcion || undefined,
          naturaleza: naturaleza || undefined,
        })
        notificar.exito(`La cuenta ${nueva.codigo} se registró como cuenta personalizada.`)
        alCerrar()
        navegar(`/plan-contable/cuentas/${nueva.id}`)
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.campos) setErrores(err.campos)
        if (!err.campos || err.estado === 409) setErrorGeneral(err.message)
      } else setErrorGeneral('No se pudo guardar la cuenta.')
    }
  }

  const guardando = crear.isPending || actualizar.isPending

  return (
    <Dialogo
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={editando ? `Editar cuenta ${cuenta.codigo}` : 'Registrar cuenta personalizada'}
      descripcion={editando ? 'Solo las cuentas personalizadas pueden modificarse. El código no cambia.' : `Se registrará en el ${version?.nombre ?? 'plan contable'}.`}
      ancho="max-w-xl"
      pie={
        <>
          <Boton onClick={alCerrar}>Cancelar</Boton>
          <Boton variante="primario" type="submit" form="form-cuenta" cargando={guardando}>
            {editando ? 'Guardar cambios' : 'Registrar cuenta'}
          </Boton>
        </>
      }
    >
      <form id="form-cuenta" onSubmit={enviar} className="space-y-4" noValidate>
        {!editando && (
          <Aviso tono="info">
            Las cuentas personalizadas se crean como subdivisión de una cuenta existente y tienen un dígito más que ella.
            Por ejemplo, bajo <strong>1041 Cuentas corrientes operativas</strong> puede registrar <strong>10411 Banco … – cuenta en soles</strong>.
          </Aviso>
        )}
        <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
          <CampoTexto
            etiqueta="Código"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 10))}
            inputMode="numeric"
            disabled={editando}
            obligatorio
            error={errores.codigo}
            className="codigo font-semibold"
            ayuda={codigo.length >= 2 ? etiquetaDigitos(codigo.length) : undefined}
          />
          <CampoTexto
            etiqueta="Denominación"
            value={denominacion}
            onChange={(e) => setDenominacion(e.target.value)}
            maxLength={300}
            obligatorio
            error={errores.denominacion}
            autoFocus={editando}
          />
        </div>
        {!editando && padre && (
          <div className="flex items-start gap-2 rounded-md bg-slate-50 px-3 py-2.5 text-[13px]">
            <Info className="mt-0.5 size-4 shrink-0 text-texto-sec" aria-hidden />
            {padre === 'no-existe' ? (
              <span className="text-error">No existe la cuenta superior {codigo.slice(0, -1)} en esta versión.</span>
            ) : (
              <span>
                Cuenta superior: <Codigo valor={padre.codigo} /> {padre.denominacion}
                {!padre.activa && <span className="text-error"> (inactiva: actívela primero)</span>}
              </span>
            )}
          </div>
        )}
        <AreaTexto
          etiqueta="Descripción"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          maxLength={2000}
          error={errores.descripcion}
          ayuda="Opcional. Explique el uso previsto de la cuenta para orientar a otros usuarios."
        />
        <Selector etiqueta="Naturaleza" value={naturaleza} onChange={(e) => setNaturaleza(e.target.value as Naturaleza | '')} ayuda="Opcional. Indica si el saldo habitual es deudor o acreedor.">
          <option value="">Sin especificar</option>
          <option value="DEUDORA">Deudora</option>
          <option value="ACREEDORA">Acreedora</option>
        </Selector>
        {errorGeneral && <Aviso tono="error">{errorGeneral}</Aviso>}
      </form>
    </Dialogo>
  )
}
