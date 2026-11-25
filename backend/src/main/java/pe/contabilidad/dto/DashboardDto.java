package pe.contabilidad.dto;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public record DashboardDto(
        VersionPcgeDto version,
        long totalCuentas,
        long totalElementos,
        long cuentasActivas,
        long cuentasInactivas,
        long cuentasPersonalizadas,
        long cuentasConObservacion,
        Map<String, Long> cuentasPorNivel,
        Instant ultimaActualizacion,
        List<HistorialDto> ultimasModificaciones) {
}
