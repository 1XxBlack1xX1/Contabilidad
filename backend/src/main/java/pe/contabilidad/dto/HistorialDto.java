package pe.contabilidad.dto;

import pe.contabilidad.entity.AccionHistorial;

import java.time.Instant;
import java.util.Map;

public record HistorialDto(Long id, AccionHistorial accion, String resumen, Map<String, Object> detalle, String motivo,
                           Long cuentaId, String cuentaCodigo, String versionCodigo, String usuario, Instant fecha) {
}
