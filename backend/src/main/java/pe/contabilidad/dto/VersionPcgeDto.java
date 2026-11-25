package pe.contabilidad.dto;

import pe.contabilidad.entity.EstadoVigencia;

import java.time.LocalDate;
import java.util.List;

public record VersionPcgeDto(
        Long id,
        String codigo,
        String nombre,
        String descripcion,
        boolean oficial,
        EstadoVigencia estado,
        String estadoEtiqueta,
        LocalDate fechaAprobacion,
        LocalDate fechaAplicacionObligatoria,
        LocalDate fechaFinVigencia,
        Boolean permiteAplicacionAnticipada,
        boolean predeterminada,
        String notas,
        long totalCuentas,
        List<FuenteNormativaDto> fuentes) {
}
