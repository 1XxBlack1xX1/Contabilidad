package pe.contabilidad.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import pe.contabilidad.dto.CambioEstadoRequest;
import pe.contabilidad.dto.CambioEstadoResultadoDto;
import pe.contabilidad.dto.CuentaActualizarRequest;
import pe.contabilidad.dto.CuentaCrearRequest;
import pe.contabilidad.dto.CuentaDetalleDto;
import pe.contabilidad.dto.CuentaResumenDto;
import pe.contabilidad.dto.ElementoArbolDto;
import pe.contabilidad.dto.FiltroCuentas;
import pe.contabilidad.dto.HistorialDto;
import pe.contabilidad.dto.PaginaDto;
import pe.contabilidad.entity.OrigenCuenta;
import pe.contabilidad.service.CuentaService;
import pe.contabilidad.service.HistorialService;

import java.util.List;

@RestController
@RequestMapping("/api/cuentas")
@Tag(name = "Cuentas contables", description = "Consulta y gestión del catálogo de cuentas del PCGE")
@PreAuthorize("hasAuthority('CATALOGO_CONSULTAR')")
public class CuentaController {

    private final CuentaService servicio;
    private final HistorialService historial;

    public CuentaController(CuentaService servicio, HistorialService historial) {
        this.servicio = servicio;
        this.historial = historial;
    }

    @GetMapping
    @Operation(summary = "Lista paginada de cuentas con filtros")
    public PaginaDto<CuentaResumenDto> listar(
            @Parameter(description = "Código de versión, p. ej. PCGE_2019. Por defecto, la predeterminada") @RequestParam(required = false) String version,
            @Parameter(description = "Código (prefijo) o palabras de la denominación") @RequestParam(required = false) String termino,
            @RequestParam(required = false) Short elemento,
            @Parameter(description = "Cantidad de dígitos: 2 cuenta, 3 subcuenta, 4 divisionaria, 5 subdivisionaria") @RequestParam(required = false) Integer nivel,
            @RequestParam(defaultValue = "TODAS") FiltroCuentas.EstadoFiltro estado,
            @RequestParam(required = false) OrigenCuenta origen,
            @Parameter(description = "Solo cuentas con observación sobre la fuente") @RequestParam(required = false) Boolean conObservacion,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "50") int tamano,
            @RequestParam(defaultValue = "codigo") String orden,
            @RequestParam(defaultValue = "false") boolean descendente) {
        return servicio.listar(new FiltroCuentas(version, termino, elemento, nivel, estado, origen, conObservacion), pagina, tamano, orden, descendente);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Detalle de una cuenta, con su ruta jerárquica, subcuentas y procedencia")
    public CuentaDetalleDto obtener(@PathVariable Long id) {
        return servicio.obtener(id);
    }

    @GetMapping("/codigo/{codigo}")
    @Operation(summary = "Busca una cuenta por su código exacto")
    public CuentaDetalleDto porCodigo(@PathVariable String codigo, @RequestParam(required = false) String version) {
        return servicio.obtenerPorCodigo(version, codigo);
    }

    @GetMapping("/buscar")
    @Operation(summary = "Búsqueda rápida por código o denominación (sin distinguir tildes ni mayúsculas)")
    public List<CuentaResumenDto> buscar(@RequestParam String termino, @RequestParam(required = false) String version,
                                         @RequestParam(defaultValue = "15") int limite,
                                         @RequestParam(defaultValue = "false") boolean soloMovimiento) {
        return servicio.buscar(version, termino, limite, soloMovimiento);
    }

    @GetMapping("/arbol")
    @Operation(summary = "Árbol jerárquico completo de la versión")
    public List<ElementoArbolDto> arbol(@RequestParam(required = false) String version) {
        return servicio.arbol(version);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('CUENTAS_GESTIONAR')")
    @Operation(summary = "Registra una cuenta personalizada")
    public ResponseEntity<CuentaDetalleDto> crear(@Valid @RequestBody CuentaCrearRequest req) {
        CuentaDetalleDto creada = servicio.crear(req);
        return ResponseEntity.status(HttpStatus.CREATED)
                .location(ServletUriComponentsBuilder.fromCurrentRequest().path("/{id}").buildAndExpand(creada.id()).toUri())
                .body(creada);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('CUENTAS_GESTIONAR')")
    @Operation(summary = "Modifica una cuenta personalizada (las oficiales están protegidas)")
    public CuentaDetalleDto actualizar(@PathVariable Long id, @Valid @RequestBody CuentaActualizarRequest req) {
        return servicio.actualizar(id, req);
    }

    @PatchMapping("/{id}/estado")
    @PreAuthorize("hasAuthority('CUENTAS_GESTIONAR')")
    @Operation(summary = "Activa o desactiva una cuenta. Al desactivar se desactivan también sus subcuentas")
    public CambioEstadoResultadoDto cambiarEstado(@PathVariable Long id, @Valid @RequestBody CambioEstadoRequest req) {
        return servicio.cambiarEstado(id, req);
    }

    @GetMapping("/{id}/historial")
    @Operation(summary = "Historial de modificaciones de la cuenta")
    public PaginaDto<HistorialDto> historial(@PathVariable Long id, @RequestParam(defaultValue = "0") int pagina,
                                             @RequestParam(defaultValue = "20") int tamano) {
        servicio.obtener(id); // 404 si no existe
        return historial.deCuenta(id, pagina, tamano);
    }
}
