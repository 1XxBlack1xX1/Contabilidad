package pe.contabilidad.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pe.contabilidad.dto.DashboardDto;
import pe.contabilidad.dto.ElementoDto;
import pe.contabilidad.dto.HistorialDto;
import pe.contabilidad.dto.PaginaDto;
import pe.contabilidad.dto.VersionPcgeDto;
import pe.contabilidad.service.CuentaService;
import pe.contabilidad.service.DashboardService;
import pe.contabilidad.service.HistorialService;
import pe.contabilidad.service.VersionPcgeService;

import java.util.List;

@RestController
@Tag(name = "Catálogo", description = "Elementos, versiones del PCGE, fuentes normativas, dashboard e historial")
@PreAuthorize("hasAuthority('CATALOGO_CONSULTAR')")
public class CatalogoController {

    private final CuentaService cuentas;
    private final VersionPcgeService versiones;
    private final DashboardService dashboard;
    private final HistorialService historial;

    public CatalogoController(CuentaService cuentas, VersionPcgeService versiones, DashboardService dashboard,
                              HistorialService historial) {
        this.cuentas = cuentas;
        this.versiones = versiones;
        this.dashboard = dashboard;
        this.historial = historial;
    }

    @GetMapping("/api/elementos")
    @Operation(summary = "Elementos contables de la versión, con su cantidad de cuentas")
    public List<ElementoDto> elementos(@RequestParam(required = false) String version) {
        return cuentas.elementos(version);
    }

    @GetMapping("/api/versiones-pcge")
    @Operation(summary = "Versiones del PCGE disponibles, con su estado de vigencia y fuentes normativas")
    public List<VersionPcgeDto> versiones() {
        return versiones.listar();
    }

    @GetMapping("/api/versiones-pcge/{codigo}")
    @Operation(summary = "Detalle de una versión del PCGE y su fuente normativa")
    public VersionPcgeDto version(@PathVariable String codigo) {
        return versiones.obtener(codigo);
    }

    @PutMapping("/api/versiones-pcge/{codigo}/predeterminada")
    @PreAuthorize("hasAuthority('CONFIGURACION_GESTIONAR')")
    @Operation(summary = "Define la versión que se muestra por defecto")
    public VersionPcgeDto predeterminada(@PathVariable String codigo) {
        return versiones.establecerPredeterminada(codigo);
    }

    @GetMapping("/api/dashboard")
    @Operation(summary = "Indicadores del catálogo para el panel principal")
    public DashboardDto dashboard(@RequestParam(required = false) String version) {
        return dashboard.resumen(version);
    }

    @GetMapping("/api/historial")
    @Operation(summary = "Últimas modificaciones del catálogo")
    public PaginaDto<HistorialDto> historial(@RequestParam(required = false) String version,
                                             @RequestParam(defaultValue = "0") int pagina,
                                             @RequestParam(defaultValue = "20") int tamano) {
        Long versionId = version == null || version.isBlank() ? null : versiones.resolver(version).getId();
        return historial.recientes(versionId, pagina, tamano);
    }
}
