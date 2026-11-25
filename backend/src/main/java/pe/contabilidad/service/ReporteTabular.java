package pe.contabilidad.service;

import java.util.List;

/**
 * Representación neutra de un reporte en forma de tabla, que el {@link ExportadorReportes} convierte a Excel o PDF.
 *
 * @param titulo     título principal
 * @param encabezado líneas descriptivas (versión, período, generado por…)
 * @param columnas   definición de columnas
 * @param filas      filas de datos
 * @param nota       texto aclaratorio al pie (opcional)
 */
public record ReporteTabular(String titulo, List<String> encabezado, List<Columna> columnas, List<Fila> filas, String nota) {

    /** @param importe si la columna contiene montos (se alinea a la derecha con formato de moneda) */
    public record Columna(String titulo, boolean importe, float ancho) {
    }

    public enum Estilo { NORMAL, GRUPO, TOTAL }

    /** Las celdas de columnas de importe deben ser {@link java.math.BigDecimal} o {@code null}. */
    public record Fila(List<Object> celdas, Estilo estilo, int sangria) {

        public static Fila normal(Object... celdas) {
            return new Fila(java.util.Arrays.asList(celdas), Estilo.NORMAL, 0);
        }

        public static Fila grupo(Object... celdas) {
            return new Fila(java.util.Arrays.asList(celdas), Estilo.GRUPO, 0);
        }

        public static Fila total(Object... celdas) {
            return new Fila(java.util.Arrays.asList(celdas), Estilo.TOTAL, 0);
        }
    }
}
