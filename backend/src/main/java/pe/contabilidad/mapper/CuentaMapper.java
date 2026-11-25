package pe.contabilidad.mapper;

import org.springframework.stereotype.Component;
import pe.contabilidad.dto.CuentaDetalleDto;
import pe.contabilidad.dto.CuentaNodoDto;
import pe.contabilidad.dto.CuentaReferenciaDto;
import pe.contabilidad.dto.CuentaResumenDto;
import pe.contabilidad.dto.ElementoDto;
import pe.contabilidad.entity.CuentaContable;
import pe.contabilidad.entity.ElementoContable;
import pe.contabilidad.entity.OrigenCuenta;

import java.util.List;

@Component
public class CuentaMapper {

    private final VersionMapper versionMapper;

    public CuentaMapper(VersionMapper versionMapper) {
        this.versionMapper = versionMapper;
    }

    public CuentaResumenDto aResumen(CuentaContable c) {
        ElementoContable e = c.getElemento();
        return new CuentaResumenDto(c.getId(), c.getCodigo(), c.getDenominacion(), c.getNivel(), c.getTipoNivel(),
                e.getNumero(), e.getDenominacion(), codigoPadre(c), c.getNaturaleza(), c.getOrigen(), c.isActiva(),
                c.getObservacionFuente() != null);
    }

    public CuentaReferenciaDto aReferencia(CuentaContable c) {
        return new CuentaReferenciaDto(c.getId(), c.getCodigo(), c.getDenominacion(), c.getTipoNivel(), c.isActiva());
    }

    public CuentaNodoDto aNodo(CuentaContable c, List<CuentaNodoDto> hijos) {
        return new CuentaNodoDto(c.getId(), c.getCodigo(), c.getDenominacion(), c.getNivel(), c.isActiva(), c.getOrigen(),
                c.getObservacionFuente() != null, hijos);
    }

    public ElementoDto aDto(ElementoContable e, Long totalCuentas) {
        return new ElementoDto(e.getId(), e.getNumero(), e.getDenominacion(), e.getDescripcion(), e.getPaginaFuente(),
                e.getSeccionFuente(), totalCuentas);
    }

    public CuentaDetalleDto aDetalle(CuentaContable c, List<CuentaContable> ruta, List<CuentaContable> subcuentas) {
        CuentaContable padre = c.getPadre();
        return new CuentaDetalleDto(c.getId(), c.getCodigo(), c.getDenominacion(), c.getDescripcion(), c.getNivel(),
                c.getTipoNivel(), aDto(c.getElemento(), null), versionMapper.aResumen(c.getVersion()),
                padre == null ? null : aReferencia(padre),
                ruta.stream().map(this::aReferencia).toList(),
                subcuentas.stream().map(this::aReferencia).toList(),
                c.getNaturaleza(), c.getOrigen(), c.isActiva(), c.getOrigen() == OrigenCuenta.PERSONALIZADA,
                c.getCodigoFuente(), c.getObservacionFuente(), c.getPaginaFuente(), c.getSeccionFuente(),
                c.getCreadoEn(), c.getActualizadoEn(), c.getCreadoPor(), c.getActualizadoPor(), c.getVersionRegistro());
    }

    private static String codigoPadre(CuentaContable c) {
        return c.getNivel() > 2 ? c.getCodigo().substring(0, c.getCodigo().length() - 1) : null;
    }
}
