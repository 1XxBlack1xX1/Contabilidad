package pe.contabilidad.dto;

import java.util.List;
import java.util.Map;

/** Resultado de validar un archivo antes de importarlo. No modifica la base de datos. */
public record ImportacionVistaPreviaDto(
        String nombreArchivo,
        String sha256,
        int filasLeidas,
        int totalElementos,
        int totalCuentas,
        Map<String, Long> cuentasPorNivel,
        List<Incidencia> errores,
        List<Incidencia> advertencias,
        List<FilaVistaPrevia> muestra,
        boolean valido) {

    public record Incidencia(Integer fila, String codigo, String mensaje) {
    }

    public record FilaVistaPrevia(int fila, String codigo, String denominacion, String tipoNivel, String codigoPadre) {
    }
}
