package pe.contabilidad.dto;

import pe.contabilidad.entity.TipoFuente;

import java.time.LocalDate;

public record FuenteNormativaDto(Long id, TipoFuente tipo, String titulo, String numero, String entidadEmisora,
                                 LocalDate fechaEmision, String url, String nombreArchivo, String sha256,
                                 LocalDate fechaConsulta, boolean verificada, String notas) {
}
