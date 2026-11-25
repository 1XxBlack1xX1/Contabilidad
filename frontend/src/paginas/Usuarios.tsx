import { Pencil, UserPlus } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { ApiError } from '../api/cliente'
import { useGuardarUsuario, useRoles, useUsuarios } from '../api/consultas'
import type { Usuario } from '../api/tipos'
import { Aviso, Boton, CampoTexto, Cargando, Dialogo, EncabezadoPagina, EncabezadoTarjeta, Insignia, Tarjeta } from '../componentes/ui'
import { useNotificar } from '../contexto/Notificaciones'
import { useSesion } from '../contexto/Sesion'
import { ETIQUETA_ROL, formatearFechaHora } from '../utilidades/formato'

function DialogoUsuario({ abierto, alCerrar, usuario }: { abierto: boolean; alCerrar: () => void; usuario?: Usuario }) {
  const { data: roles = [] } = useRoles()
  const guardar = useGuardarUsuario()
  const notificar = useNotificar()
  const [f, setF] = useState({ usuario: '', nombreCompleto: '', email: '', password: '', roles: [] as string[], activo: true })
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!abierto) return
    setF({ usuario: usuario?.usuario ?? '', nombreCompleto: usuario?.nombreCompleto ?? '', email: usuario?.email ?? '', password: '', roles: usuario?.roles ?? [], activo: usuario?.activo ?? true })
    setErrores({})
    setError(null)
  }, [abierto, usuario])

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    setErrores({})
    setError(null)
    const datos = usuario
      ? { nombreCompleto: f.nombreCompleto, email: f.email, roles: f.roles, activo: f.activo, nuevaPassword: f.password || undefined }
      : { usuario: f.usuario, nombreCompleto: f.nombreCompleto, email: f.email, password: f.password, roles: f.roles }
    try {
      await guardar.mutateAsync({ id: usuario?.id, datos })
      notificar.exito(usuario ? 'Usuario actualizado.' : 'Usuario creado.')
      alCerrar()
    } catch (err) {
      if (err instanceof ApiError) {
        setErrores(err.campos ?? {})
        setError(err.message)
      } else setError('No se pudo guardar el usuario.')
    }
  }

  return (
    <Dialogo abierto={abierto} alCerrar={alCerrar} titulo={usuario ? `Editar usuario ${usuario.usuario}` : 'Nuevo usuario'}
      pie={<><Boton onClick={alCerrar}>Cancelar</Boton><Boton type="submit" form="form-usuario" variante="primario" cargando={guardar.isPending}>Guardar</Boton></>}>
      <form id="form-usuario" onSubmit={enviar} className="space-y-4" noValidate>
        {!usuario && (
          <CampoTexto etiqueta="Nombre de usuario" obligatorio value={f.usuario} error={errores.usuario} autoComplete="off"
            onChange={(e) => setF({ ...f, usuario: e.target.value.toLowerCase() })} ayuda="Minúsculas, números, punto o guion. Ej.: maria.quispe" />
        )}
        <CampoTexto etiqueta="Nombre completo" obligatorio value={f.nombreCompleto} error={errores.nombreCompleto} onChange={(e) => setF({ ...f, nombreCompleto: e.target.value })} />
        <CampoTexto etiqueta="Correo electrónico" type="email" obligatorio value={f.email} error={errores.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <CampoTexto etiqueta={usuario ? 'Nueva contraseña' : 'Contraseña'} type="password" obligatorio={!usuario} autoComplete="new-password"
          value={f.password} error={errores.password ?? errores.nuevaPassword} onChange={(e) => setF({ ...f, password: e.target.value })}
          ayuda={usuario ? 'Déjela en blanco para no cambiarla. Mínimo 12 caracteres.' : 'Mínimo 12 caracteres.'} />
        <fieldset>
          <legend className="mb-1.5 text-[13px] font-medium">Roles<span className="text-error">*</span></legend>
          <div className="space-y-2">
            {roles.map((r) => (
              <label key={r.codigo} className="flex items-start gap-2.5 rounded-md border border-borde p-3 text-[13px]">
                <input type="checkbox" className="mt-0.5 size-4 accent-[#1d4ed8]" checked={f.roles.includes(r.codigo)}
                  onChange={(e) => setF({ ...f, roles: e.target.checked ? [...f.roles, r.codigo] : f.roles.filter((x) => x !== r.codigo) })} />
                <span><span className="block font-medium">{r.nombre}</span><span className="text-texto-sec">{r.descripcion}</span></span>
              </label>
            ))}
          </div>
          {errores.roles && <p className="mt-1.5 text-[12.5px] text-error">{errores.roles}</p>}
        </fieldset>
        {usuario && (
          <label className="flex items-center gap-2.5 text-[13px]">
            <input type="checkbox" className="size-4 accent-[#1d4ed8]" checked={f.activo} onChange={(e) => setF({ ...f, activo: e.target.checked })} />
            Usuario activo (puede iniciar sesión)
          </label>
        )}
        {error && <Aviso tono="error">{error}</Aviso>}
      </form>
    </Dialogo>
  )
}

export default function Usuarios() {
  const { data: usuarios, isLoading } = useUsuarios()
  const { usuario: actual } = useSesion()
  const [editando, setEditando] = useState<Usuario | undefined>()
  const [abierto, setAbierto] = useState(false)

  return (
    <>
      <EncabezadoPagina
        titulo="Usuarios y permisos"
        descripcion="Administre quién accede al sistema y qué puede hacer. Las contraseñas se almacenan cifradas con BCrypt."
        acciones={<Boton variante="primario" icono={<UserPlus className="size-4" />} onClick={() => { setEditando(undefined); setAbierto(true) }}>Nuevo usuario</Boton>}
      />
      <Tarjeta>
        <EncabezadoTarjeta titulo="Usuarios registrados" />
        {isLoading ? <Cargando /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-[13.5px]">
              <thead>
                <tr className="border-b border-borde bg-slate-50/80 text-left text-xs font-semibold tracking-wide text-texto-sec uppercase">
                  <th className="px-5 py-2.5">Usuario</th><th className="px-3 py-2.5">Roles</th><th className="px-3 py-2.5">Estado</th><th className="px-3 py-2.5">Último acceso</th><th className="w-20 px-5 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-borde">
                {usuarios?.map((u) => (
                  <tr key={u.id}>
                    <td className="px-5 py-3">
                      <p className="font-medium">{u.nombreCompleto}{u.id === actual?.id && <span className="ml-2 text-xs font-normal text-texto-sec">(usted)</span>}</p>
                      <p className="text-xs text-texto-sec">{u.usuario} · {u.email}</p>
                    </td>
                    <td className="px-3 py-3"><div className="flex flex-wrap gap-1">{u.roles.map((r) => <Insignia key={r} tono={r === 'ADMINISTRADOR' ? 'marino' : 'info'}>{ETIQUETA_ROL[r] ?? r}</Insignia>)}</div></td>
                    <td className="px-3 py-3"><Insignia tono={u.activo ? 'exito' : 'neutro'} punto>{u.activo ? 'Activo' : 'Inactivo'}</Insignia></td>
                    <td className="px-3 py-3 text-texto-sec">{u.ultimoAcceso ? formatearFechaHora(u.ultimoAcceso) : 'Nunca'}</td>
                    <td className="px-5 py-3 text-right">
                      <Boton tamano="sm" variante="fantasma" icono={<Pencil className="size-3.5" />} onClick={() => { setEditando(u); setAbierto(true) }}>Editar</Boton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>
      <DialogoUsuario abierto={abierto} alCerrar={() => setAbierto(false)} usuario={editando} />
    </>
  )
}
