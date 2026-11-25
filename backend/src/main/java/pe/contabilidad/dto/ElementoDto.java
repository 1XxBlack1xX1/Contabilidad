package pe.contabilidad.dto;

public record ElementoDto(Long id, short numero, String denominacion, String descripcion, Integer paginaFuente,
                          String seccionFuente, Long totalCuentas) {
}
