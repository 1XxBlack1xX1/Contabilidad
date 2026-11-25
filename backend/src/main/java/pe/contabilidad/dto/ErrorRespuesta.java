package pe.contabilidad.dto;

import java.time.Instant;
import java.util.Map;

/** Formato uniforme de error de la API. */
public record ErrorRespuesta(int estado, String error, String mensaje, Map<String, String> campos, String ruta,
                             Instant fecha) {
}
