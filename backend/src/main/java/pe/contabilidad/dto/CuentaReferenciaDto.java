package pe.contabilidad.dto;

import pe.contabilidad.entity.TipoNivel;

/** Referencia breve a otra cuenta (padre, ancestros, hijas). */
public record CuentaReferenciaDto(Long id, String codigo, String denominacion, TipoNivel tipoNivel, boolean activa) {
}
