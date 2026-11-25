package pe.contabilidad.dto;

import pe.contabilidad.entity.Naturaleza;
import pe.contabilidad.entity.OrigenCuenta;
import pe.contabilidad.entity.TipoNivel;

/** Datos de una cuenta para listados y resultados de búsqueda. */
public record CuentaResumenDto(
        Long id,
        String codigo,
        String denominacion,
        int nivel,
        TipoNivel tipoNivel,
        short elemento,
        String elementoDenominacion,
        String codigoPadre,
        Naturaleza naturaleza,
        OrigenCuenta origen,
        boolean activa,
        boolean conObservacion) {
}
