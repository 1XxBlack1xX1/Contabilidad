package pe.contabilidad.dto;

import pe.contabilidad.entity.Naturaleza;
import pe.contabilidad.entity.OrigenCuenta;
import pe.contabilidad.entity.TipoNivel;

import java.time.Instant;
import java.util.List;

/** Ficha completa de una cuenta, incluida su procedencia. */
public record CuentaDetalleDto(
        Long id,
        String codigo,
        String denominacion,
        String descripcion,
        int nivel,
        TipoNivel tipoNivel,
        ElementoDto elemento,
        VersionResumenDto version,
        CuentaReferenciaDto padre,
        List<CuentaReferenciaDto> ruta,
        List<CuentaReferenciaDto> subcuentas,
        Naturaleza naturaleza,
        OrigenCuenta origen,
        boolean activa,
        boolean editable,
        String codigoFuente,
        String observacionFuente,
        Integer paginaFuente,
        String seccionFuente,
        Instant creadoEn,
        Instant actualizadoEn,
        String creadoPor,
        String actualizadoPor,
        int versionRegistro) {
}
