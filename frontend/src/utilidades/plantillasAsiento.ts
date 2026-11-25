// Ayudas para registrar asientos: cálculo del IGV y plantillas de operaciones frecuentes.
// Los importes se calculan en céntimos enteros para evitar errores de redondeo.

/** Tasa general del IGV en el Perú: 16 % de IGV + 2 % de Impuesto de Promoción Municipal. Editable en cada uso. */
export const TASA_IGV = 18

export const CUENTA_IGV = '40111'

export type Lado = 'debe' | 'haber'

type Importe =
  | 'base'
  | 'igv'
  | 'total'
  | { porcentaje: number }
  /** Importe que cuadra el asiento (diferencia entre debe y haber). */
  | 'resto'

export interface LineaPlantilla {
  codigo: string
  lado: Lado
  importe: Importe
  glosa?: string
}

export interface Plantilla {
  id: string
  titulo: string
  descripcion: string
  glosa: string
  etiquetaImporte: string
  conIgv: boolean
  lineas: LineaPlantilla[]
  aviso?: string
}

export const PLANTILLAS: Plantilla[] = [
  {
    id: 'venta',
    titulo: 'Venta con IGV',
    descripcion: 'Factura emitida a un cliente: cuenta por cobrar, IGV por pagar y venta.',
    glosa: 'Venta de mercaderías según factura',
    etiquetaImporte: 'Importe de la venta',
    conIgv: true,
    lineas: [
      { codigo: '1212', lado: 'debe', importe: 'total' },
      { codigo: CUENTA_IGV, lado: 'haber', importe: 'igv' },
      { codigo: '70121', lado: 'haber', importe: 'base' },
    ],
  },
  {
    id: 'compra',
    titulo: 'Compra con IGV',
    descripcion: 'Factura de un proveedor: compra, IGV crédito fiscal y cuenta por pagar.',
    glosa: 'Compra de mercaderías según factura',
    etiquetaImporte: 'Importe de la compra',
    conIgv: true,
    lineas: [
      { codigo: '6011', lado: 'debe', importe: 'base' },
      { codigo: CUENTA_IGV, lado: 'debe', importe: 'igv' },
      { codigo: '4212', lado: 'haber', importe: 'total' },
    ],
  },
  {
    id: 'servicio',
    titulo: 'Servicio recibido con IGV',
    descripcion: 'Gasto por un servicio de terceros (luz, mantenimiento, transporte…). Cambie la cuenta de gasto si corresponde.',
    glosa: 'Servicio prestado por terceros según factura',
    etiquetaImporte: 'Importe del servicio',
    conIgv: true,
    lineas: [
      { codigo: '6361', lado: 'debe', importe: 'base' },
      { codigo: CUENTA_IGV, lado: 'debe', importe: 'igv' },
      { codigo: '4212', lado: 'haber', importe: 'total' },
    ],
  },
  {
    id: 'cobranza',
    titulo: 'Cobranza a cliente',
    descripcion: 'Depósito en cuenta corriente por la cobranza de una factura.',
    glosa: 'Cobranza de la factura',
    etiquetaImporte: 'Importe cobrado',
    conIgv: false,
    lineas: [
      { codigo: '1041', lado: 'debe', importe: 'base' },
      { codigo: '1212', lado: 'haber', importe: 'base' },
    ],
  },
  {
    id: 'pago',
    titulo: 'Pago a proveedor',
    descripcion: 'Pago de una factura con transferencia desde la cuenta corriente.',
    glosa: 'Pago de la factura al proveedor',
    etiquetaImporte: 'Importe pagado',
    conIgv: false,
    lineas: [
      { codigo: '4212', lado: 'debe', importe: 'base' },
      { codigo: '1041', lado: 'haber', importe: 'base' },
    ],
  },
  {
    id: 'destino',
    titulo: 'Ingreso de mercaderías al almacén',
    descripcion: 'Traslado de las compras del período al inventario (cuenta 20 contra variación de existencias 61).',
    glosa: 'Ingreso de mercaderías al almacén',
    etiquetaImporte: 'Costo de las mercaderías',
    conIgv: false,
    lineas: [
      { codigo: '20111', lado: 'debe', importe: 'base' },
      { codigo: '6111', lado: 'haber', importe: 'base' },
    ],
  },
  {
    id: 'planilla',
    titulo: 'Planilla de remuneraciones (ONP)',
    descripcion: 'Sueldos, retención del 13 % para la ONP, neto por pagar (4111) y aporte del empleador a EsSalud (9 %).',
    glosa: 'Planilla de remuneraciones del mes',
    etiquetaImporte: 'Remuneración bruta',
    conIgv: false,
    lineas: [
      { codigo: '6211', lado: 'debe', importe: 'base' },
      { codigo: '4032', lado: 'haber', importe: { porcentaje: 13 }, glosa: 'Retención ONP 13 %' },
      { codigo: '4111', lado: 'haber', importe: 'resto', glosa: 'Neto por pagar a los trabajadores' },
      { codigo: '6271', lado: 'debe', importe: { porcentaje: 9 }, glosa: 'Aporte EsSalud 9 %' },
      { codigo: '4031', lado: 'haber', importe: { porcentaje: 9 }, glosa: 'Aporte EsSalud 9 %' },
    ],
    aviso: 'Si los trabajadores están afiliados a una AFP, cambie la cuenta 4032 por la de la AFP (417) y ajuste el porcentaje. Verifique las tasas vigentes.',
  },
]

export interface Montos {
  base: number
  igv: number
  total: number
}

/** Calcula base, IGV y total (en céntimos) a partir de la base imponible o del total con IGV. */
export function calcularMontos(centimos: number, incluyeIgv: boolean, tasa: number, conIgv: boolean): Montos {
  if (!conIgv) return { base: centimos, igv: 0, total: centimos }
  if (incluyeIgv) {
    const base = Math.round(centimos / (1 + tasa / 100))
    return { base, igv: centimos - base, total: centimos }
  }
  const igv = Math.round((centimos * tasa) / 100)
  return { base: centimos, igv, total: centimos + igv }
}

export interface LineaCalculada {
  codigo: string
  lado: Lado
  centimos: number
  glosa?: string
}

/** Genera las líneas de una plantilla con sus importes. Las líneas "resto" cuadran el asiento. */
export function aplicarPlantilla(p: Plantilla, m: Montos): LineaCalculada[] {
  const lineas: LineaCalculada[] = p.lineas.map((l) => {
    const centimos =
      l.importe === 'resto' ? 0
        : typeof l.importe === 'object' ? Math.round((m.base * l.importe.porcentaje) / 100)
        : m[l.importe]
    return { codigo: l.codigo, lado: l.lado, centimos, glosa: l.glosa }
  })
  const debe = lineas.filter((l) => l.lado === 'debe').reduce((s, l) => s + l.centimos, 0)
  const haber = lineas.filter((l) => l.lado === 'haber').reduce((s, l) => s + l.centimos, 0)
  lineas.forEach((l, i) => {
    if (p.lineas[i].importe === 'resto') l.centimos = l.lado === 'haber' ? debe - haber : haber - debe
  })
  return lineas
}

export interface SugerenciaIgv {
  /** Cuenta por pagar (compras) o por cobrar (ventas) que completa la operación. */
  contrapartida: string
  descripcion: string
  /** Lado de la línea de IGV: al debe en compras (crédito fiscal), al haber en ventas (débito fiscal). */
  ladoIgv: Lado
}

/**
 * Sugiere agregar IGV cuando la cuenta es típicamente gravada:
 * compras (60), servicios de terceros (63) y activos fijos (33, 34) al debe; ventas (70) y otros ingresos de gestión (75) al haber.
 */
export function sugerenciaIgv(codigo: string, lado: Lado): SugerenciaIgv | null {
  if (lado === 'debe' && /^(60|63|33|34)/.test(codigo)) {
    return { contrapartida: '4212', descripcion: 'y cuenta por pagar 4212', ladoIgv: 'debe' }
  }
  if (lado === 'haber' && /^(70|75)/.test(codigo)) {
    return { contrapartida: '1212', descripcion: 'y cuenta por cobrar 1212', ladoIgv: 'haber' }
  }
  return null
}
