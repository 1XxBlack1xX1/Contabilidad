// Genera las migraciones Flyway del catálogo oficial a partir de los CSV validados.
//
// Uso:  node generar-migraciones.mjs
// Lee:  ../versiones.json y ../datos/pcge-<version>-{elementos,cuentas,resumen}.(csv|json)
// Crea: backend/src/main/resources/db/migration/V2__catalogo_pcge_2019.sql, V3__catalogo_pcge_2026.sql
//
// Cada migración termina verificando que la cantidad de elementos y cuentas cargadas
// coincide con la extraída del documento fuente; si no coincide, la migración falla.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const base = path.resolve(aqui, '..');
const destino = path.resolve(aqui, '../../../backend/src/main/resources/db/migration');

function leerCsv(ruta) {
  const [cab, ...filas] = fs.readFileSync(ruta, 'utf8').trim().split(/\r?\n/);
  const campos = cab.split(',');
  return filas.map((f) => {
    const vals = f.match(/("([^"]|"")*"|[^,]*)(,|$)/g).slice(0, campos.length)
      .map((v) => v.replace(/,$/, '')).map((v) => (v.startsWith('"') ? v.slice(1, -1).replace(/""/g, '"') : v));
    return Object.fromEntries(campos.map((c, i) => [c, vals[i] ?? '']));
  });
}

const lit = (v) => (v === null || v === undefined || v === '' ? 'NULL' : typeof v === 'boolean' || typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const fecha = (v) => (v ? `DATE ${lit(v)}` : 'NULL');

const { fechaConsulta, versiones } = JSON.parse(fs.readFileSync(path.join(base, 'versiones.json'), 'utf8'));

versiones.forEach((v, idx) => {
  const elementos = leerCsv(path.join(base, 'datos', `pcge-${v.csv}-elementos.csv`));
  const cuentas = leerCsv(path.join(base, 'datos', `pcge-${v.csv}-cuentas.csv`));
  const resumen = JSON.parse(fs.readFileSync(path.join(base, 'datos', `pcge-${v.csv}-resumen.json`), 'utf8'));
  if (resumen.errores.length) throw new Error(`El resumen de ${v.codigo} tiene errores; corrija la extracción primero.`);
  if (resumen.cuentas !== cuentas.length || resumen.elementos !== elementos.length) throw new Error(`Totales inconsistentes en ${v.codigo}`);

  const ver = `(SELECT id FROM version_pcge WHERE codigo = ${lit(v.codigo)})`;
  const sql = [];
  sql.push(`-- =====================================================================
-- Catálogo oficial ${v.nombre}
-- GENERADO AUTOMÁTICAMENTE por database/pcge/herramientas/generar-migraciones.mjs
-- No editar a mano. Fuente: ${v.fuentes[0].url}
-- SHA-256 del documento fuente: ${resumen.sha256}
-- Fecha de consulta: ${fechaConsulta}
-- Elementos: ${elementos.length} | Cuentas: ${cuentas.length} | Por dígitos: ${JSON.stringify(resumen.porDigitos)}
-- =====================================================================
`);
  sql.push(`INSERT INTO version_pcge (codigo, nombre, descripcion, oficial, fecha_aprobacion, fecha_aplicacion_obligatoria,
                          fecha_fin_vigencia, permite_aplicacion_anticipada, predeterminada, notas)
VALUES (${lit(v.codigo)}, ${lit(v.nombre)}, ${lit(v.descripcion)}, ${v.oficial}, ${fecha(v.fechaAprobacion)},
        ${fecha(v.fechaAplicacionObligatoria)}, ${fecha(v.fechaFinVigencia)}, ${lit(v.permiteAplicacionAnticipada)}, ${v.predeterminada}, ${lit(v.notas)});
`);
  for (const f of v.fuentes) {
    sql.push(`INSERT INTO fuente_normativa (version_id, tipo, titulo, numero, entidad_emisora, fecha_emision, url, nombre_archivo,
                              sha256, fecha_consulta, verificada, notas)
VALUES (${ver}, ${lit(f.tipo)}, ${lit(f.titulo)}, ${lit(f.numero)}, ${lit(f.entidadEmisora)}, ${fecha(f.fechaEmision)},
        ${lit(f.url)}, ${lit(f.nombreArchivo)}, ${lit(f.sha256)}, ${fecha(fechaConsulta)}, ${f.verificada}, ${lit(f.notas)});
`);
  }
  sql.push(`INSERT INTO elemento_contable (version_id, numero, denominacion, pagina_fuente, seccion_fuente)
SELECT ${ver}, e.numero, e.denominacion, e.pagina, e.seccion
FROM (VALUES
${elementos.map((e) => `    (${e.numero}, ${lit(e.denominacion)}, ${e.pagina_pdf}, ${lit(e.seccion)})`).join(',\n')}
) AS e (numero, denominacion, pagina, seccion);
`);
  sql.push(`CREATE TEMPORARY TABLE tmp_cuenta (
    codigo VARCHAR(10), denominacion VARCHAR(300), elemento SMALLINT, codigo_padre VARCHAR(10),
    pagina INTEGER, seccion VARCHAR(120), codigo_fuente VARCHAR(10), observacion TEXT
) ON COMMIT DROP;

INSERT INTO tmp_cuenta VALUES
${cuentas.map((c) => `    (${lit(c.codigo)}, ${lit(c.denominacion)}, ${c.elemento}, ${lit(c.codigo_padre)}, ${c.pagina_pdf}, ${lit(c.seccion)}, ${lit(c.codigo_fuente)}, ${lit(c.observacion)})`).join(',\n')};
`);
  const niveles = [...new Set(cuentas.map((c) => c.codigo.length))].sort();
  for (const n of niveles) {
    sql.push(`INSERT INTO cuenta_contable (version_id, elemento_id, padre_id, codigo, denominacion, nivel, origen, activa,
                             codigo_fuente, observacion_fuente, pagina_fuente, seccion_fuente, creado_por, actualizado_por)
SELECT v.id, e.id, p.id, t.codigo, t.denominacion, ${n}, 'OFICIAL', TRUE, t.codigo_fuente, t.observacion, t.pagina, t.seccion, 'sistema', 'sistema'
FROM tmp_cuenta t
JOIN version_pcge v ON v.codigo = ${lit(v.codigo)}
JOIN elemento_contable e ON e.version_id = v.id AND e.numero = t.elemento
LEFT JOIN cuenta_contable p ON p.version_id = v.id AND p.codigo = t.codigo_padre
WHERE length(t.codigo) = ${n}
ORDER BY t.codigo;
`);
  }
  sql.push(`INSERT INTO historial_cambios (entidad, entidad_id, version_id, accion, resumen, detalle, nombre_usuario)
SELECT 'VERSION_PCGE', id, id, 'IMPORTACION', ${lit(`Carga inicial del catálogo oficial ${v.nombre}`)},
       ${lit(JSON.stringify({ elementos: elementos.length, cuentas: cuentas.length, porDigitos: resumen.porDigitos, sha256: resumen.sha256, erratasDocumentadas: resumen.erratasAplicadas }))}::jsonb,
       'sistema'
FROM version_pcge WHERE codigo = ${lit(v.codigo)};

DO $$
DECLARE
    n_cuentas   INTEGER;
    n_elementos INTEGER;
    n_huerfanas INTEGER;
BEGIN
    SELECT count(*) INTO n_cuentas FROM cuenta_contable c JOIN version_pcge v ON v.id = c.version_id WHERE v.codigo = ${lit(v.codigo)};
    SELECT count(*) INTO n_elementos FROM elemento_contable e JOIN version_pcge v ON v.id = e.version_id WHERE v.codigo = ${lit(v.codigo)};
    SELECT count(*) INTO n_huerfanas FROM cuenta_contable c JOIN version_pcge v ON v.id = c.version_id
     WHERE v.codigo = ${lit(v.codigo)} AND c.nivel > 2 AND c.padre_id IS NULL;
    IF n_cuentas <> ${cuentas.length} OR n_elementos <> ${elementos.length} OR n_huerfanas <> 0 THEN
        RAISE EXCEPTION 'Verificación fallida en ${v.codigo}: % cuentas, % elementos, % huérfanas', n_cuentas, n_elementos, n_huerfanas;
    END IF;
END $$;
`);
  const archivo = path.join(destino, `V${idx + 2}__catalogo_${v.codigo.toLowerCase()}.sql`);
  fs.writeFileSync(archivo, sql.join('\n'));
  console.log(`${path.basename(archivo)}: ${elementos.length} elementos, ${cuentas.length} cuentas`);
});
