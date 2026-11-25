import {
  BookOpen,
  BookText,
  ClipboardList,
  FileBarChart,
  FileSpreadsheet,
  FolderTree,
  Landmark,
  Layers,
  LayoutDashboard,
  ListTree,
  Network,
  NotebookPen,
  Scale,
  Settings,
  Upload,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { PERMISOS } from '../../contexto/Sesion'

export interface ItemNavegacion {
  etiqueta: string
  ruta: string
  icono: LucideIcon
  permiso?: string
  hijos?: ItemNavegacion[]
}

export interface SeccionNavegacion {
  titulo?: string
  items: ItemNavegacion[]
}

export const NAVEGACION: SeccionNavegacion[] = [
  { items: [{ etiqueta: 'Dashboard', ruta: '/', icono: LayoutDashboard }] },
  {
    titulo: 'Catálogo',
    items: [
      {
        etiqueta: 'Plan contable',
        ruta: '/plan-contable',
        icono: BookOpen,
        hijos: [
          { etiqueta: 'Elementos', ruta: '/plan-contable/elementos', icono: Layers },
          { etiqueta: 'Cuentas', ruta: '/plan-contable/cuentas', icono: ListTree },
          { etiqueta: 'Subcuentas', ruta: '/plan-contable/subcuentas', icono: FolderTree },
          { etiqueta: 'Explorador jerárquico', ruta: '/plan-contable/explorador', icono: Network },
          { etiqueta: 'Importar catálogo', ruta: '/plan-contable/importar', icono: Upload, permiso: PERMISOS.importar },
          { etiqueta: 'Versiones y fuentes', ruta: '/plan-contable/versiones', icono: Landmark },
          { etiqueta: 'Historial de cambios', ruta: '/plan-contable/historial', icono: ClipboardList },
        ],
      },
    ],
  },
  {
    titulo: 'Contabilidad',
    items: [
      { etiqueta: 'Asientos contables', ruta: '/asientos', icono: NotebookPen, permiso: PERMISOS.consultarContabilidad },
      { etiqueta: 'Libro diario', ruta: '/libro-diario', icono: BookText, permiso: PERMISOS.consultarContabilidad },
      { etiqueta: 'Libro mayor', ruta: '/libro-mayor', icono: FileSpreadsheet, permiso: PERMISOS.consultarContabilidad },
      { etiqueta: 'Balance de comprobación', ruta: '/balance-comprobacion', icono: Scale, permiso: PERMISOS.consultarContabilidad },
      { etiqueta: 'Reportes', ruta: '/reportes', icono: FileBarChart, permiso: PERMISOS.consultarContabilidad },
    ],
  },
  {
    titulo: 'Administración',
    items: [
      { etiqueta: 'Usuarios y permisos', ruta: '/usuarios', icono: Users, permiso: PERMISOS.gestionarUsuarios },
      { etiqueta: 'Configuración', ruta: '/configuracion', icono: Settings },
    ],
  },
]
