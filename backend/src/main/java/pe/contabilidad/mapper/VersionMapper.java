package pe.contabilidad.mapper;

import org.springframework.stereotype.Component;
import pe.contabilidad.dto.FuenteNormativaDto;
import pe.contabilidad.dto.VersionPcgeDto;
import pe.contabilidad.dto.VersionResumenDto;
import pe.contabilidad.entity.EstadoVigencia;
import pe.contabilidad.entity.FuenteNormativa;
import pe.contabilidad.entity.VersionPcge;

import java.time.Clock;
import java.time.LocalDate;

@Component
public class VersionMapper {

    private final Clock reloj;

    public VersionMapper(Clock reloj) {
        this.reloj = reloj;
    }

    public VersionResumenDto aResumen(VersionPcge v) {
        EstadoVigencia estado = v.estadoVigencia(LocalDate.now(reloj));
        return new VersionResumenDto(v.getId(), v.getCodigo(), v.getNombre(), v.isOficial(), estado, estado.etiqueta(),
                v.isPredeterminada());
    }

    public VersionPcgeDto aDto(VersionPcge v, long totalCuentas) {
        EstadoVigencia estado = v.estadoVigencia(LocalDate.now(reloj));
        return new VersionPcgeDto(v.getId(), v.getCodigo(), v.getNombre(), v.getDescripcion(), v.isOficial(), estado,
                estado.etiqueta(), v.getFechaAprobacion(), v.getFechaAplicacionObligatoria(), v.getFechaFinVigencia(),
                v.getPermiteAplicacionAnticipada(), v.isPredeterminada(), v.getNotas(), totalCuentas,
                v.getFuentes().stream().map(this::aDto).toList());
    }

    public FuenteNormativaDto aDto(FuenteNormativa f) {
        return new FuenteNormativaDto(f.getId(), f.getTipo(), f.getTitulo(), f.getNumero(), f.getEntidadEmisora(),
                f.getFechaEmision(), f.getUrl(), f.getNombreArchivo(), f.getSha256(), f.getFechaConsulta(),
                f.isVerificada(), f.getNotas());
    }
}
