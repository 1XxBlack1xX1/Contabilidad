package pe.contabilidad.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.contabilidad.dto.VersionPcgeDto;
import pe.contabilidad.entity.AccionHistorial;
import pe.contabilidad.entity.VersionPcge;
import pe.contabilidad.exception.RecursoNoEncontradoException;
import pe.contabilidad.mapper.VersionMapper;
import pe.contabilidad.repository.CuentaContableRepository;
import pe.contabilidad.repository.VersionPcgeRepository;

import java.util.List;
import java.util.Map;

@Service
public class VersionPcgeService {

    private final VersionPcgeRepository versiones;
    private final CuentaContableRepository cuentas;
    private final VersionMapper mapper;
    private final HistorialService historial;

    public VersionPcgeService(VersionPcgeRepository versiones, CuentaContableRepository cuentas, VersionMapper mapper,
                              HistorialService historial) {
        this.versiones = versiones;
        this.cuentas = cuentas;
        this.mapper = mapper;
        this.historial = historial;
    }

    /** Devuelve la versión indicada por su código o, si no se indica, la versión predeterminada. */
    @Transactional(readOnly = true)
    public VersionPcge resolver(String codigo) {
        if (codigo == null || codigo.isBlank()) {
            return versiones.findByPredeterminadaTrue()
                    .orElseThrow(() -> new RecursoNoEncontradoException("No hay una versión del PCGE configurada como predeterminada."));
        }
        return versiones.findByCodigo(codigo.trim().toUpperCase())
                .orElseThrow(() -> new RecursoNoEncontradoException("No existe la versión del PCGE '" + codigo + "'."));
    }

    @Transactional(readOnly = true)
    public List<VersionPcgeDto> listar() {
        return versiones.listarConFuentes().stream()
                .map(v -> mapper.aDto(v, cuentas.countByVersionId(v.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public VersionPcgeDto obtener(String codigo) {
        VersionPcge v = resolver(codigo);
        return mapper.aDto(v, cuentas.countByVersionId(v.getId()));
    }

    /** Define la versión que se muestra por defecto en todo el sistema. */
    @Transactional
    public VersionPcgeDto establecerPredeterminada(String codigo) {
        VersionPcge v = resolver(codigo);
        if (!v.isPredeterminada()) {
            String anterior = versiones.findByPredeterminadaTrue().map(VersionPcge::getCodigo).orElse(null);
            versiones.quitarPredeterminada();
            versiones.flush();
            v.setPredeterminada(true);
            historial.registrar("VERSION_PCGE", v.getId(), null, v, AccionHistorial.CONFIGURACION,
                    "Versión predeterminada cambiada a " + v.getNombre(),
                    Map.of("anterior", anterior == null ? "" : anterior, "nueva", v.getCodigo()), null);
        }
        return mapper.aDto(v, cuentas.countByVersionId(v.getId()));
    }
}
