package pe.contabilidad.dto;

import java.util.List;

public record CambioEstadoResultadoDto(CuentaDetalleDto cuenta, List<String> codigosAfectados) {
}
