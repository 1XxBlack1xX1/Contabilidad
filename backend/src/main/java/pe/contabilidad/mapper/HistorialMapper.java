package pe.contabilidad.mapper;

import org.springframework.stereotype.Component;
import pe.contabilidad.dto.HistorialDto;
import pe.contabilidad.entity.HistorialCambio;

@Component
public class HistorialMapper {

    public HistorialDto aDto(HistorialCambio h) {
        return new HistorialDto(h.getId(), h.getAccion(), h.getResumen(), h.getDetalle(), h.getMotivo(),
                h.getCuenta() == null ? null : h.getCuenta().getId(),
                h.getCuenta() == null ? null : h.getCuenta().getCodigo(),
                h.getVersion() == null ? null : h.getVersion().getCodigo(),
                h.getNombreUsuario(), h.getFecha());
    }
}
