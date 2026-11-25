package pe.contabilidad.dto;

import pe.contabilidad.entity.EstadoVigencia;

public record VersionResumenDto(Long id, String codigo, String nombre, boolean oficial, EstadoVigencia estado,
                                String estadoEtiqueta, boolean predeterminada) {
}
