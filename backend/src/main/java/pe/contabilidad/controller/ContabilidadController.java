package pe.contabilidad.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pe.contabilidad.dto.ContabilidadDtos.AnulacionRequest;
import pe.contabilidad.dto.ContabilidadDtos.AsientoCrearRequest;
import pe.contabilidad.dto.ContabilidadDtos.AsientoDto;
import pe.contabilidad.dto.ContabilidadDtos.AsientoResumenDto;
import pe.contabilidad.dto.ContabilidadDtos.BalanceComprobacionDto;
import pe.contabilidad.dto.ContabilidadDtos.EstadoResultadosDto;
import pe.contabilidad.dto.ContabilidadDtos.EstadoSituacionDto;
import pe.contabilidad.dto.ContabilidadDtos.LibroDiarioDto;
import pe.contabilidad.dto.ContabilidadDtos.LibroMayorDto;
import pe.contabilidad.dto.PaginaDto;
import pe.contabilidad.entity.EstadoAsiento;
import pe.contabilidad.service.ArchivoGenerado;
import pe.contabilidad.service.AsientoService;
import pe.contabilidad.service.ExportacionContableService;
import pe.contabilidad.service.ExportacionContableService.Formato;
import pe.contabilidad.service.LibroService;
import pe.contabilidad.service.ReporteFinancieroService;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;

@RestController
@RequestMapping("/api")
@Tag(name = "Contabilidad", description = "Asientos contables, libro diario, libro mayor, balance de comprobación y reportes")
@PreAuthorize("hasAuthority('CONTABILIDAD_CONSULTAR')")
public class ContabilidadController {

    private final AsientoService asientos;
    private final LibroService libros;
    private final ReporteFinancieroService reportes;
    private final ExportacionContableService exportacion;

    public ContabilidadController(AsientoService asientos, LibroService libros, ReporteFinancieroService reportes,
                                  ExportacionContableService exportacion) {
        this.asientos = asientos;
        this.libros = libros;
        this.reportes = reportes;
        this.exportacion = exportacion;
    }

    // ------------------------------------------------------------------ asientos

    @GetMapping("/asientos")
    @Operation(summary = "Lista paginada de asientos (más recientes primero)")
    public PaginaDto<AsientoResumenDto> listar(@RequestParam(required = false) String version,
                                               @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
                                               @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
                                               @RequestParam(required = false) EstadoAsiento estado,
                                               @RequestParam(required = false) String termino,
                                               @RequestParam(defaultValue = "0") int pagina,
                                               @RequestParam(defaultValue = "25") int tamano) {
        return asientos.listar(version, desde, hasta, estado, termino, pagina, tamano);
    }

    @GetMapping("/asientos/{id}")
    @Operation(summary = "Detalle de un asiento con sus líneas")
    public AsientoDto obtener(@PathVariable Long id) {
        return asientos.obtener(id);
    }

    @PostMapping("/asientos")
    @PreAuthorize("hasAuthority('ASIENTOS_REGISTRAR')")
    @Operation(summary = "Registra un asiento por partida doble")
    public ResponseEntity<AsientoDto> crear(@Valid @RequestBody AsientoCrearRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(asientos.crear(req));
    }

    @PostMapping("/asientos/{id}/anulacion")
    @PreAuthorize("hasAuthority('ASIENTOS_ANULAR')")
    @Operation(summary = "Anula un asiento (con motivo). El asiento se conserva y deja de afectar los saldos")
    public AsientoDto anular(@PathVariable Long id, @Valid @RequestBody AnulacionRequest req) {
        return asientos.anular(id, req.motivo());
    }

    // ------------------------------------------------------------------ libros

    @GetMapping("/libros/diario")
    @Operation(summary = "Libro diario del período")
    public LibroDiarioDto diario(@RequestParam(required = false) String version,
                                 @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
                                 @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) {
        return libros.diario(version, desde, hasta);
    }

    @GetMapping("/libros/mayor")
    @Operation(summary = "Libro mayor de una cuenta (incluye sus subcuentas)")
    public LibroMayorDto mayor(@RequestParam(required = false) String version, @RequestParam String cuenta,
                               @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
                               @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) {
        return libros.mayor(version, cuenta, desde, hasta);
    }

    @GetMapping("/libros/balance-comprobacion")
    @Operation(summary = "Balance de comprobación de sumas y saldos. nivel: 2, 3, 4… o vacío para el último nivel")
    public BalanceComprobacionDto balance(@RequestParam(required = false) String version,
                                          @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
                                          @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
                                          @RequestParam(required = false) Integer nivel) {
        return libros.balance(version, desde, hasta, nivel);
    }

    // ------------------------------------------------------------------ reportes

    @GetMapping("/reportes/situacion-financiera")
    @Operation(summary = "Estado de situación financiera (reporte de gestión) a una fecha")
    public EstadoSituacionDto situacion(@RequestParam(required = false) String version,
                                        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) {
        return reportes.situacionFinanciera(version, hasta);
    }

    @GetMapping("/reportes/resultados")
    @Operation(summary = "Estado de resultados por naturaleza del período")
    public EstadoResultadosDto resultados(@RequestParam(required = false) String version,
                                          @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
                                          @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) {
        return reportes.resultados(version, desde, hasta);
    }

    // ------------------------------------------------------------------ exportaciones

    @GetMapping("/libros/diario/exportar")
    public ResponseEntity<byte[]> exportarDiario(@RequestParam(required = false) String version,
                                                 @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
                                                 @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
                                                 @RequestParam(defaultValue = "XLSX") Formato formato) {
        return descarga(exportacion.diario(libros.diario(version, desde, hasta), formato));
    }

    @GetMapping("/libros/mayor/exportar")
    public ResponseEntity<byte[]> exportarMayor(@RequestParam(required = false) String version, @RequestParam String cuenta,
                                                @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
                                                @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
                                                @RequestParam(defaultValue = "XLSX") Formato formato) {
        return descarga(exportacion.mayor(libros.mayor(version, cuenta, desde, hasta), formato));
    }

    @GetMapping("/libros/balance-comprobacion/exportar")
    public ResponseEntity<byte[]> exportarBalance(@RequestParam(required = false) String version,
                                                  @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
                                                  @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
                                                  @RequestParam(required = false) Integer nivel,
                                                  @RequestParam(defaultValue = "XLSX") Formato formato) {
        return descarga(exportacion.balance(libros.balance(version, desde, hasta, nivel), formato));
    }

    @GetMapping("/reportes/situacion-financiera/exportar")
    public ResponseEntity<byte[]> exportarSituacion(@RequestParam(required = false) String version,
                                                    @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
                                                    @RequestParam(defaultValue = "XLSX") Formato formato) {
        return descarga(exportacion.situacion(reportes.situacionFinanciera(version, hasta), formato));
    }

    @GetMapping("/reportes/resultados/exportar")
    public ResponseEntity<byte[]> exportarResultados(@RequestParam(required = false) String version,
                                                     @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
                                                     @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
                                                     @RequestParam(defaultValue = "XLSX") Formato formato) {
        return descarga(exportacion.resultados(reportes.resultados(version, desde, hasta), formato));
    }

    private static ResponseEntity<byte[]> descarga(ArchivoGenerado a) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(a.nombre(), StandardCharsets.UTF_8).build().toString())
                .contentType(MediaType.parseMediaType(a.tipoContenido()))
                .body(a.contenido());
    }
}
