package pe.contabilidad.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.contabilidad.dto.DashboardDto;
import pe.contabilidad.entity.OrigenCuenta;
import pe.contabilidad.entity.TipoNivel;
import pe.contabilidad.entity.VersionPcge;
import pe.contabilidad.repository.CuentaContableRepository;
import pe.contabilidad.repository.ElementoContableRepository;

import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class DashboardService {

    private final VersionPcgeService versiones;
    private final CuentaContableRepository cuentas;
    private final ElementoContableRepository elementos;
    private final HistorialService historial;

    public DashboardService(VersionPcgeService versiones, CuentaContableRepository cuentas,
                            ElementoContableRepository elementos, HistorialService historial) {
        this.versiones = versiones;
        this.cuentas = cuentas;
        this.elementos = elementos;
        this.historial = historial;
    }

    @Transactional(readOnly = true)
    public DashboardDto resumen(String codigoVersion) {
        VersionPcge v = versiones.resolver(codigoVersion);
        Long id = v.getId();
        long activas = cuentas.countByVersionIdAndActiva(id, true);
        long inactivas = cuentas.countByVersionIdAndActiva(id, false);

        Map<String, Long> porNivel = new LinkedHashMap<>();
        for (Object[] fila : cuentas.contarPorNivel(id)) {
            String etiqueta = TipoNivel.desdeDigitos((Short) fila[0]).etiqueta();
            if ((Short) fila[0] > 5) {
                etiqueta += " (" + fila[0] + " dígitos)";
            }
            porNivel.merge(etiqueta, (Long) fila[1], Long::sum);
        }
        long conObservacion = cuentas.count((r, q, cb) -> cb.and(cb.equal(r.get("version").get("id"), id),
                cb.isNotNull(r.get("observacionFuente"))));

        return new DashboardDto(versiones.obtener(v.getCodigo()), activas + inactivas,
                elementos.findByVersionIdOrderByNumeroAsc(id).size(), activas, inactivas,
                cuentas.countByVersionIdAndOrigen(id, OrigenCuenta.PERSONALIZADA), conObservacion, porNivel,
                cuentas.ultimaActualizacion(id).orElse(null),
                historial.recientes(id, 0, 8).contenido());
    }
}
