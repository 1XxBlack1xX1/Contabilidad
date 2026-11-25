package pe.contabilidad.dto;

import pe.contabilidad.entity.OrigenCuenta;

import java.util.List;

/** Nodo del árbol jerárquico del plan contable. */
public record CuentaNodoDto(Long id, String codigo, String denominacion, int nivel, boolean activa, OrigenCuenta origen,
                            boolean conObservacion, List<CuentaNodoDto> hijos) {
}
