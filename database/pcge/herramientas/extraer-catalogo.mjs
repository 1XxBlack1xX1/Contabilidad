// Extrae el catálogo de cuentas del PCGE desde el PDF oficial y genera CSV validados.
//
// Uso:
//   node extraer-catalogo.mjs --version 2019 --pdf <ruta PCGE_2019.pdf> --salida ../datos
//   node extraer-catalogo.mjs --version 2026 --pdf <ruta PCGE_2026.pdf> --salida ../datos
//
// El script NO inventa ni corrige denominaciones: transcribe el texto del PDF tal como
// aparece en el Capítulo II (Catálogo de cuentas). Solo reconstruye las denominaciones
// que el PDF parte en dos líneas y elimina encabezados y números de página.
// Cualquier situación ambigua se reporta y hace fallar la ejecución.

import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, v, i, arr) => (v.startsWith('--') ? [...acc, [v.slice(2), arr[i + 1]]] : acc), []),
);
const version = args.version;
if (!['2019', '2026'].includes(version) || !args.pdf || !args.salida) {
  console.error('Uso: node extraer-catalogo.mjs --version 2019|2026 --pdf <archivo.pdf> --salida <directorio>');
  process.exit(2);
}

// Tipo de nivel según la cantidad de dígitos. El PCGE llega a cinco dígitos en general,
// pero algunas cuentas se desagregan hasta seis (p. ej. 682111); se tratan como subdivisionarias de 6 dígitos.
const NIVELES = { 2: 'CUENTA', 3: 'SUBCUENTA', 4: 'DIVISIONARIA', 5: 'SUBDIVISIONARIA', 6: 'SUBDIVISIONARIA' };

// Erratas tipográficas del documento fuente, revisadas manualmente (ver ../erratas.csv).
function leerErratas(ruta, version) {
  const [cab, ...filas] = fs.readFileSync(ruta, 'utf8').trim().split(/\r?\n/);
  const campos = cab.split(',');
  return filas
    .map((f) => {
      const vals = f.match(/("([^"]|"")*"|[^,]*)(,|$)/g).map((v) => v.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"'));
      return Object.fromEntries(campos.map((c, i) => [c, vals[i]]));
    })
    .filter((e) => e.version === version)
    .map((e) => ({ ...e, ocurrencia: Number(e.ocurrencia), aplicada: 0 }));
}

function aplicarErratas(cuentas, erratas, errores) {
  const vistos = {};
  for (const c of cuentas) {
    vistos[c.codigo] = (vistos[c.codigo] ?? 0) + 1;
    const e = erratas.find((x) => x.codigo_impreso === c.codigo && x.ocurrencia === vistos[c.codigo]);
    if (!e) continue;
    if (Number(e.pagina_pdf) !== c.pagina || e.denominacion !== c.denominacion) {
      errores.push(`Errata ${e.codigo_impreso}#${e.ocurrencia} no coincide con la fuente (pág. ${c.pagina}, "${c.denominacion}")`);
      continue;
    }
    c.codigoFuente = c.codigo;
    c.codigo = e.codigo_aplicado;
    c.observacion = e.motivo;
    e.aplicada++;
  }
  for (const e of erratas.filter((x) => x.aplicada !== 1)) errores.push(`Errata no aplicada: ${e.codigo_impreso}#${e.ocurrencia}`);
}

// ---------------------------------------------------------------- lectura del PDF
async function leerLineas(rutaPdf) {
  const data = new Uint8Array(fs.readFileSync(rutaPdf));
  const doc = await getDocument({ data, useSystemFonts: true, verbosity: 0 }).promise;
  const lineas = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const { items } = await page.getTextContent();
    const filas = [];
    for (const it of items) {
      if (!it.str || !it.str.trim()) continue;
      const [, , , h, x, y] = it.transform;
      let fila = filas.find((f) => Math.abs(f.y - y) < 2.5);
      if (!fila) filas.push((fila = { y, items: [] }));
      fila.items.push({ x, w: it.width, h: Math.abs(h) || 10, s: it.str });
    }
    filas.sort((a, b) => b.y - a.y);
    for (const f of filas) {
      f.items.sort((a, b) => a.x - b.x);
      let texto = '';
      let fin = null;
      for (const it of f.items) {
        // Solo se inserta un espacio cuando existe una separación visible entre fragmentos.
        if (fin !== null && it.x - fin > it.h * 0.18 && !texto.endsWith(' ') && !it.s.startsWith(' ')) texto += ' ';
        texto += it.s;
        fin = it.x + it.w;
      }
      texto = texto.replace(/\s+/g, ' ').trim();
      if (texto) lineas.push({ pagina: p, x: Math.round(f.items[0].x), texto });
    }
  }
  return { lineas, paginas: doc.numPages };
}

// ---------------------------------------------------------------- utilidades
const esIndice = (t) => /\.{5,}/.test(t); // líneas del índice ("....... 17")
const esNumeroPagina = (l) => /^-?\s*\d{1,3}\s*-?$/.test(l.texto) && l.x > 200;
const esEncabezado = (t) => /^PLAN CONTABLE GENERAL EMPRESARIAL/.test(t) || t === 'CATÁLOGO DE CUENTAS';
const reElemento = /^ELEMENTO (\d): (.+)$/;
const esMayusculas = (t) => /\p{L}/u.test(t) && t === t.toLocaleUpperCase('es') && !/^\d/.test(t);

function indiceDe(lineas, pred, desde = 0) {
  for (let i = desde; i < lineas.length; i++) if (pred(lineas[i])) return i;
  return -1;
}

// Lee encabezados "ELEMENTO N: ..." uniendo la(s) línea(s) siguientes en mayúsculas.
function leerElemento(lineas, i) {
  const m = lineas[i].texto.match(reElemento);
  let nombre = m[2];
  let j = i + 1;
  // La continuación del título está en la misma columna que el encabezado, o centrada (Capítulo III).
  // Una línea en la columna de las denominaciones de cuentas pertenece a la cuenta siguiente.
  const mismaColumna = (l) => Math.abs(l.x - lineas[i].x) <= 3 || l.x - lineas[i].x > 50;
  while (j < lineas.length && esMayusculas(lineas[j].texto) && mismaColumna(lineas[j]) && !reElemento.test(lineas[j].texto)
         && !/^CAP[IÍ]TULO/.test(lineas[j].texto) && lineas[j].texto.length < 70 && !/^\d/.test(lineas[j].texto)) {
    nombre += ' ' + lineas[j].texto;
    j++;
  }
  return { numero: Number(m[1]), denominacion: nombre.trim(), pagina: lineas[i].pagina, siguiente: j };
}

// ---------------------------------------------------------------- análisis del catálogo
function analizarCatalogo(lineas, inicio, fin, avisos, errores) {
  const elementos = new Map();
  const cuentas = [];
  let elementoActual = null;
  let textoPendiente = [];
  let abierta = null; // cuenta cuyo código apareció solo, a la espera del resto de su denominación
  let ultima = null;

  const cerrarAbierta = () => {
    if (!abierta) return;
    abierta.denominacion = [...abierta.prefijo, ...abierta.sufijo].join(' ').trim();
    if (!abierta.denominacion) errores.push(`Código ${abierta.codigo} (pág. ${abierta.pagina}) sin denominación`);
    avisos.push(`Denominación reconstruida en dos líneas: ${abierta.codigo} "${abierta.denominacion}" (pág. ${abierta.pagina})`);
    delete abierta.prefijo;
    delete abierta.sufijo;
    abierta = null;
  };
  const cerrarPendiente = () => {
    if (textoPendiente.length && ultima) {
      avisos.push(`Continuación de denominación: ${ultima.codigo} + "${textoPendiente.join(' ')}" (pág. ${ultima.pagina})`);
      ultima.denominacion += ' ' + textoPendiente.join(' ');
    } else if (textoPendiente.length) {
      errores.push(`Texto huérfano sin código: "${textoPendiente.join(' ')}"`);
    }
    textoPendiente = [];
  };
  const nueva = (codigo, l, denominacion) => {
    if (!elementoActual) errores.push(`Cuenta ${codigo} fuera de un elemento (pág. ${l.pagina})`);
    const c = { codigo, denominacion, elemento: elementoActual, pagina: l.pagina, x: l.x };
    cuentas.push(c);
    return c;
  };

  for (let i = inicio; i < fin; i++) {
    const l = lineas[i];
    const t = l.texto;
    if (esEncabezado(t) || esNumeroPagina(l)) continue;

    if (reElemento.test(t)) {
      cerrarAbierta();
      cerrarPendiente();
      const el = leerElemento(lineas, i);
      elementos.set(el.numero, { numero: el.numero, denominacion: el.denominacion, pagina: el.pagina, seccion: 'Capítulo II - Catálogo de cuentas' });
      elementoActual = el.numero;
      ultima = null;
      i = el.siguiente - 1;
      continue;
    }

    let m;
    if ((m = t.match(/^(\d{2,6})$/))) {
      // Código solo en su línea: la denominación está partida alrededor del código.
      if (abierta && abierta.sufijo.length && !textoPendiente.length) {
        const mitad = Math.ceil(abierta.sufijo.length / 2);
        textoPendiente = abierta.sufijo.splice(mitad);
        avisos.push(`AMBIGUO: reparto de líneas entre ${abierta.codigo} y ${m[1]} (pág. ${l.pagina}) — revisar`);
      }
      cerrarAbierta();
      const c = nueva(m[1], l, '');
      c.prefijo = textoPendiente;
      c.sufijo = [];
      textoPendiente = [];
      abierta = c;
      ultima = c;
      continue;
    }
    if ((m = t.match(/^(\d{2,6}) (\D.*)$/))) {
      cerrarAbierta();
      cerrarPendiente();
      ultima = nueva(m[1], l, m[2]);
      continue;
    }
    if (/^\d/.test(t)) {
      errores.push(`Línea con formato no reconocido (pág. ${l.pagina}): "${t}"`);
      continue;
    }
    if (abierta) abierta.sufijo.push(t);
    else textoPendiente.push(t);
  }
  cerrarAbierta();
  cerrarPendiente();
  return { elementos, cuentas };
}

// Lee las cuentas de orden (elemento 0) del Capítulo III del PCGE 2019, pues no figuran en el Capítulo II.
function analizarCuentasDeOrden(lineas, desde, avisos) {
  const i0 = indiceDe(lineas, (l) => /^ELEMENTO 0: CUENTAS DE ORDEN$/.test(l.texto), desde);
  if (i0 < 0) return null;
  const fin = indiceDe(lineas, (l) => /^CAP[IÍ]TULO IV/.test(l.texto), i0);
  const cuentas = [];
  for (let i = i0; i < fin; i++) {
    const m = lineas[i].texto.match(/^(0\d) (\D.+)$/);
    if (m) cuentas.push({ codigo: m[1], denominacion: m[2], elemento: 0, pagina: lineas[i].pagina, x: lineas[i].x, seccion: 'Capítulo III - Elemento 0' });
  }
  avisos.push(`Elemento 0 tomado del Capítulo III (no figura en el Capítulo II): ${cuentas.map((c) => c.codigo).join(', ')}`);
  return { elemento: { numero: 0, denominacion: 'CUENTAS DE ORDEN', pagina: lineas[i0].pagina, seccion: 'Capítulo III - Descripción y dinámica contable' }, cuentas };
}

// ---------------------------------------------------------------- validaciones
function validar(elementos, cuentas, avisos, errores) {
  const porCodigo = new Map();
  for (const c of cuentas) {
    if (porCodigo.has(c.codigo)) errores.push(`Código duplicado: ${c.codigo} (págs. ${porCodigo.get(c.codigo).pagina} y ${c.pagina})`);
    porCodigo.set(c.codigo, c);
  }
  for (const c of cuentas) {
    if (!NIVELES[c.codigo.length]) errores.push(`Longitud de código no prevista: ${c.codigo}`);
    if (Number(c.codigo[0]) !== c.elemento) errores.push(`Cuenta ${c.codigo} ubicada en el elemento ${c.elemento}`);
    if (!elementos.has(c.elemento)) errores.push(`Elemento ${c.elemento} inexistente para ${c.codigo}`);
    if (c.codigo.length > 2 && !porCodigo.has(c.codigo.slice(0, -1))) errores.push(`Cuenta ${c.codigo} sin cuenta padre ${c.codigo.slice(0, -1)}`);
    if (!c.denominacion || /\s{2,}/.test(c.denominacion)) errores.push(`Denominación inválida en ${c.codigo}: "${c.denominacion}"`);
    // Posibles artefactos de extracción: letras sueltas dentro de una palabra ("financier a s").
    if (/(^| )\p{L} \p{L}( |$)/u.test(c.denominacion) || /\d \d/.test(c.denominacion)) {
      avisos.push(`REVISAR posible artefacto de texto en ${c.codigo}: "${c.denominacion}"`);
    }
  }
  // Coherencia entre la sangría del PDF y la longitud del código.
  const columnas = {};
  for (const c of cuentas.filter((x) => !x.seccion)) (columnas[c.codigo.length] ??= []).push(c.x);
  for (const [len, xs] of Object.entries(columnas)) {
    const moda = [...xs].sort((a, b) => xs.filter((v) => v === a).length - xs.filter((v) => v === b).length).pop();
    for (const c of cuentas.filter((x) => !x.seccion && x.codigo.length === Number(len) && Math.abs(x.x - moda) > 15)) {
      avisos.push(`REVISAR sangría atípica en ${c.codigo} (x=${c.x}, esperado ≈${moda})`);
    }
  }
}

// ---------------------------------------------------------------- CSV
const csv = (v) => (v === null || v === undefined ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
const fila = (vals) => vals.map(csv).join(',');

// ---------------------------------------------------------------- principal
const avisos = [];
const errores = [];
const { lineas, paginas } = await leerLineas(args.pdf);
const sha256 = crypto.createHash('sha256').update(fs.readFileSync(args.pdf)).digest('hex');

const iCap2 = indiceDe(lineas, (l) => /^CAP[IÍ]TULO II - CLASIFICACI[OÓ]N Y CAT[AÁ]LOGO DE CUENTAS$/.test(l.texto));
const iCat = indiceDe(lineas, (l) => l.texto === 'CATÁLOGO DE CUENTAS', iCap2);
const iCap3 = indiceDe(lineas, (l) => /^CAP[IÍ]TULO III - DESCRIPCI[OÓ]N/.test(l.texto) && !esIndice(l.texto), iCat);
if (iCap2 < 0 || iCat < 0 || iCap3 < 0) {
  console.error('No se encontraron los límites del catálogo en el PDF.');
  process.exit(1);
}

const { elementos, cuentas } = analizarCatalogo(lineas, iCat + 1, iCap3, avisos, errores);

// Elementos que figuran en el Capítulo III pero no tienen cuentas codificadas en el Capítulo II.
for (let i = iCap3; i < lineas.length; i++) {
  if (!reElemento.test(lineas[i].texto) || esIndice(lineas[i].texto)) continue;
  const el = leerElemento(lineas, i);
  if (!elementos.has(el.numero) && el.numero !== 0) {
    elementos.set(el.numero, { numero: el.numero, denominacion: el.denominacion, pagina: el.pagina, seccion: 'Capítulo III - Descripción y dinámica contable' });
    avisos.push(`Elemento ${el.numero} sin cuentas codificadas en el catálogo; denominación tomada del Capítulo III`);
  }
}
const orden = analizarCuentasDeOrden(lineas, iCap3, avisos);
if (orden) {
  elementos.set(0, orden.elemento);
  cuentas.push(...orden.cuentas);
}

const erratas = leerErratas(path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..', 'erratas.csv'), version);
aplicarErratas(cuentas, erratas, errores);
validar(elementos, cuentas, avisos, errores);

fs.mkdirSync(args.salida, { recursive: true });
const elementosOrdenados = [...elementos.values()].sort((a, b) => a.numero - b.numero);
fs.writeFileSync(
  path.join(args.salida, `pcge-${version}-elementos.csv`),
  [fila(['numero', 'denominacion', 'pagina_pdf', 'seccion']), ...elementosOrdenados.map((e) => fila([e.numero, e.denominacion, e.pagina, e.seccion]))].join('\n') + '\n',
);
const cuentasOrdenadas = [...cuentas].sort((a, b) => a.elemento - b.elemento || cuentas.indexOf(a) - cuentas.indexOf(b));
fs.writeFileSync(
  path.join(args.salida, `pcge-${version}-cuentas.csv`),
  [
    fila(['codigo', 'denominacion', 'nivel', 'elemento', 'codigo_padre', 'pagina_pdf', 'seccion', 'codigo_fuente', 'observacion']),
    ...cuentasOrdenadas.map((c) => fila([
      c.codigo, c.denominacion, NIVELES[c.codigo.length], c.elemento, c.codigo.length > 2 ? c.codigo.slice(0, -1) : '',
      c.pagina, c.seccion ?? 'Capítulo II - Catálogo de cuentas', c.codigoFuente ?? '', c.observacion ?? '',
    ])),
  ].join('\n') + '\n',
);

const resumen = {
  version,
  archivo: path.basename(args.pdf),
  sha256,
  paginas,
  elementos: elementosOrdenados.length,
  cuentas: cuentas.length,
  porDigitos: Object.fromEntries([2, 3, 4, 5, 6].map((d) => [d, cuentas.filter((c) => c.codigo.length === d).length])),
  porElemento: Object.fromEntries(elementosOrdenados.map((e) => [e.numero, cuentas.filter((c) => c.elemento === e.numero).length])),
  erratasAplicadas: erratas.filter((e) => e.aplicada === 1).length,
  avisos,
  errores,
};
fs.writeFileSync(path.join(args.salida, `pcge-${version}-resumen.json`), JSON.stringify(resumen, null, 2) + '\n');

console.log(JSON.stringify({ ...resumen, avisos: avisos.length, errores }, null, 2));
if (errores.length) process.exit(1);
