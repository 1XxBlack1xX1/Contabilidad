# Catálogo oficial del PCGE: fuentes, metodología y validación

Esta carpeta contiene todo lo necesario para reproducir y auditar la carga del
Plan Contable General Empresarial (PCGE) del Perú en el sistema.

Fecha de consulta de las fuentes: **24/11/2026**.

## Versiones cargadas

| Versión | Norma de aprobación | Aplicación obligatoria | Estado (24/11/2026) | Elementos | Cuentas |
|---|---|---|---|---|---|
| **PCGE Modificado 2019** | Res. CNC N.° 002-2019-EF/30 | 01/01/2020 – 31/12/2027 | Vigente | 10 (0–9) | 1772 |
| **PCGE 2026** | Res. CNC N.° 002-2026-EF/30 (Lima, 01/09/2026) | Desde el 01/01/2028 (se permite aplicarlo antes) | Aprobado, aún no obligatorio | 9 (1–9) | 1628 |

Las dos versiones se guardan por separado (`version_pcge`) y **nunca se mezclan**.
El sistema calcula el estado de vigencia a partir de las fechas, así que el 01/01/2028
el PCGE 2026 pasará a figurar como vigente y el PCGE 2019 como derogado, sin cambios manuales.

Cuentas por cantidad de dígitos:

| Dígitos | Nivel | 2019 | 2026 |
|---|---|---|---|
| 2 | Cuenta | 82 | 77 |
| 3 | Subcuenta | 322 | 311 |
| 4 | Divisionaria | 645 | 641 |
| 5 | Subdivisionaria | 702 | 587 |
| 6 | Subdivisionaria (6 díg.) | 21 | 12 |

No todas las cuentas tienen la misma profundidad: algunas llegan solo a la subcuenta y otras a seis dígitos.

## Fuentes

| Documento | URL | SHA-256 | Verificación |
|---|---|---|---|
| PCGE Modificado 2019 (311 págs.) | https://cdn.www.gob.pe/uploads/document/file/315820/PCGE_2019.pdf | `f3c683d973a834fcb26e3283f062350ec8df9d89102b2443467b2a9fee7b2e7c` | Catálogo extraído y verificado |
| PCGE 2026 (203 págs.) | https://cdn.www.gob.pe/uploads/document/file/10567153/8559148-plan-contable-general-empresarial-pcge-2026(2).pdf | `48c568ca196c68348743dda96c55c38593b0437ce732a4c5d77d7c9aca896b19` | Catálogo extraído y verificado |
| Res. CNC N.° 002-2026-EF/30 | https://www.gob.pe/institucion/mef/normas-legales/8559200-002-2026-ef-30 | — | Texto verificado sobre la copia difundida por el CCP de Lambayeque (https://ccplamb.org.pe/descargas/rcnc-2-2026-ef.pdf): Art. 1, 2.ª Disp. Compl. Final y Disp. Compl. Derogatoria Única |
| Res. CNC N.° 002-2019-EF/30 | https://www.gob.pe/institucion/mef/normas-legales/277088-002-2019-ef-30 | — | **Pendiente**: el portal no permitió la descarga automatizada. La fecha de aplicación obligatoria (01/01/2020) proviene de fuentes secundarias y la fecha de emisión se registra como "no verificada" |

Los PDF no se incluyen en el repositorio (ver `.gitignore`). Para reproducir la extracción,
descárguelos desde las URL indicadas y compruebe su SHA-256.

## Metodología

1. **Extracción** (`herramientas/extraer-catalogo.mjs`). Usa `pdfjs-dist` para leer el texto con
   su posición en la página. Separa palabras solo donde hay un espacio visible, lo que evita
   artefactos como "financier a s", y respeta la columna de cada línea.
2. **Ámbito**. Se lee únicamente el *Capítulo II – Catálogo de cuentas*. Excepciones documentadas:
   - **2019, Elemento 0 (Cuentas de orden)**: no figura en el Capítulo II. Sus cuentas (01–04, 06–09)
     se toman del Capítulo III.
   - **2019, Elemento 9**: el PCGE no codifica cuentas; deja su desarrollo a criterio de cada
     entidad. Se carga el elemento sin cuentas, con la denominación del Capítulo III.
   - **2026**: no contiene Elemento 0.
3. **Denominaciones partidas en dos líneas**. Se reconstruyen uniendo el texto antes y después del
   código. Cada reconstrucción queda registrada en `datos/pcge-<versión>-resumen.json`.
4. **Validaciones automáticas**. Si alguna falla, la herramienta se detiene. Verifica que:
   - No haya códigos duplicados.
   - Toda cuenta de tres o más dígitos tenga su cuenta superior (el código sin su último dígito).
   - El primer dígito coincida con el elemento.
   - Las denominaciones no estén vacías ni tengan artefactos de texto.
   - La sangría del PDF sea coherente con la cantidad de dígitos.
5. **Comparación con la fuente**. Por un método independiente se compara el conjunto de códigos
   impresos en el PDF con el de los CSV. Coinciden exactamente: 1764 códigos en 2019 (más los 8
   del Elemento 0) y 1628 en 2026.
6. **Carga** (`herramientas/generar-migraciones.mjs`). Genera las migraciones Flyway
   `V2__catalogo_pcge_2019.sql` y `V3__catalogo_pcge_2026.sql`. Cada migración termina comprobando
   la cantidad de cuentas, elementos y cuentas sin padre; si algo no cuadra, la migración falla.

## Erratas tipográficas del documento oficial

Las validaciones detectaron códigos mal impresos en los PDF oficiales. La prueba de que son
erratas del documento y no de la extracción: en 2019 se repiten idénticas en el Anexo (págs. 239–300).

No se "corrigen" en silencio ni se inventan códigos. Cada caso se revisó a mano y se registró en
[`erratas.csv`](erratas.csv), con su página, el código impreso, la ocurrencia, el código aplicado y
el motivo. El extractor solo aplica una errata si la página y la denominación coinciden exactamente
con la fuente. En la base de datos cada cuenta afectada conserva:

- `codigo_fuente`: el código tal como aparece impreso.
- `observacion_fuente`: la explicación.

El sistema muestra ambos datos en la ficha de la cuenta. También pueden filtrarse con
`GET /api/cuentas?conObservacion=true`.

| Versión | Pág. PDF | Impreso | Aplicado | Motivo resumido |
|---|---|---|---|---|
| 2019 | 27 | 27233 (2.ª) | 27243 | Repetido bajo 2724 |
| 2019 | 31 | 30221 (1.ª) | 30111 | Repetido bajo 3011 |
| 2019 | 31 | 30224 (1.ª) | 30114 | Repetido bajo 3011 |
| 2019 | 38 | 33404 | 36404 | Bajo 3640; no existe 3340 |
| 2019 | 39 | 38472 / 38473 / 38474 | 36472 / 36473 / 36474 | Bajo 3647; no existe 3847 |
| 2019 | 41 | 38352 | 39352 | Bajo 3935; no existe 3835 |
| 2019 | 54 | 683351 | 683151 | Bajo 68315; no existe 68335 |
| 2019 | 55 | 6882 (1.ª) | 6881 | Divisionaria repetida; agrupa a 68812 y 68813 |
| 2019 | 58 | 70111 / 70112 (2.ª) | 70121 / 70122 | Repetidos bajo 7012 |
| 2026 | 48 | 70992 (1.ª) | 70902 | Bajo 7090; 70992 existe bajo 7099 |

## Cómo regenerar

```bash
cd database/pcge/herramientas
npm install
node extraer-catalogo.mjs --version 2019 --pdf <ruta>/PCGE_2019.pdf --salida ../datos
node extraer-catalogo.mjs --version 2026 --pdf <ruta>/PCGE_2026.pdf --salida ../datos
node generar-migraciones.mjs
```

> Las migraciones V2 y V3 ya aplicadas no deben modificarse: Flyway verifica su checksum.
> Una corrección futura del catálogo debe ir en una migración nueva (V4…) y quedar documentada aquí.

## Archivos

| Archivo | Contenido |
|---|---|
| `versiones.json` | Metadatos de cada versión y sus fuentes normativas |
| `erratas.csv` | Erratas de la fuente revisadas manualmente |
| `datos/pcge-<v>-cuentas.csv` | Catálogo extraído: código, denominación, nivel, elemento, padre, página, sección, código impreso y observación |
| `datos/pcge-<v>-elementos.csv` | Elementos con su página y sección de origen |
| `datos/pcge-<v>-resumen.json` | SHA-256 del PDF, totales, avisos y errores de la extracción |
| `herramientas/` | Scripts de extracción y generación de migraciones |
