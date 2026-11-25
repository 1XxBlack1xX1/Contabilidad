import { Link } from 'react-router'
import { EstadoVacio } from '../componentes/ui'

export default function NoEncontrado() {
  return (
    <EstadoVacio
      titulo="Página no encontrada"
      descripcion="La dirección que intentó abrir no existe o fue movida."
      accion={<Link to="/" className="font-medium text-corporativo hover:underline">Ir al panel principal</Link>}
    />
  )
}
