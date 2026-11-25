package pe.contabilidad.dto;

import java.util.List;

public record ElementoArbolDto(Long id, short numero, String denominacion, int totalCuentas, List<CuentaNodoDto> cuentas) {
}
