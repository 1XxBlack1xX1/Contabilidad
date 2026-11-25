import { useEffect, useState } from 'react'
import { ApiError } from '../../api/cliente'
import { useCambiarEstado } from '../../api/consultas'
import type { CuentaDetalle } from '../../api/tipos'
import { useNotificar } from '../../contexto/Notificaciones'
import { AreaTexto, Aviso, Boton, Codigo, Dialogo } from '../ui'

/** Confirmación para activar o desactivar una cuenta, con motivo obligatorio (queda en el historial). */
export function DialogoEstado({ abierto, alCerrar, cuenta }: { abierto: boolean; alCerrar: () => void; cuenta: CuentaDetalle }) {
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const cambiar = useCambiarEstado(cuenta.id)
  const notificar = useNotificar()
  const activar = !cuenta.activa
  const subcuentasActivas = cuenta.subcuentas.filter((s) => s.activa).length

  useEffect(() => {
    if (abierto) {
      setMotivo('')
      setError(null)
    }
  }, [abierto])

  const confirmar = async () => {
    setError(null)
    try {
      const r = await cambiar.mutateAsync({ activa: activar, motivo })
      notificar.exito(
        activar
          ? `La cuenta ${cuenta.codigo} se activó.`
          : `Se desactivaron ${r.codigosAfectados.length} ${r.codigosAfectados.length === 1 ? 'cuenta' : 'cuentas'}.`,
      )
      alCerrar()
    } catch (e) {
      setError(e instanceof ApiError ? (e.campos?.motivo ?? e.message) : 'No se pudo cambiar el estado.')
    }
  }

  return (
    <Dialogo
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={activar ? 'Activar cuenta' : 'Desactivar cuenta'}
      pie={
        <>
          <Boton onClick={alCerrar}>Cancelar</Boton>
          <Boton variante={activar ? 'primario' : 'peligro'} onClick={confirmar} cargando={cambiar.isPending} disabled={motivo.trim().length < 5}>
            {activar ? 'Activar' : 'Desactivar'}
          </Boton>
        </>
      }
    >
      <p className="text-[13.5px]">
        <Codigo valor={cuenta.codigo} /> {cuenta.denominacion}
      </p>
      {!activar && (
        <Aviso tono="advertencia" className="mt-4">
          La cuenta dejará de estar disponible para nuevos registros.
          {subcuentasActivas > 0 && ' También se desactivarán todas sus subcuentas, divisionarias y subdivisionarias activas.'}
        </Aviso>
      )}
      {activar && <p className="mt-3 text-[13px] text-texto-sec">Sus subcuentas no se activan automáticamente; puede activarlas de forma individual.</p>}
      <div className="mt-4">
        <AreaTexto
          etiqueta="Motivo del cambio"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          obligatorio
          maxLength={500}
          autoFocus
          ayuda="Quedará registrado en el historial de la cuenta (mínimo 5 caracteres)."
        />
      </div>
      {error && <Aviso tono="error" className="mt-4">{error}</Aviso>}
    </Dialogo>
  )
}
