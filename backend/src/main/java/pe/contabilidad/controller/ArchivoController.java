package pe.contabilidad.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import pe.contabilidad.dto.FiltroCuentas;
import pe.contabilidad.dto.ImportacionConfirmarRequest;
import pe.contabilidad.dto.ImportacionVistaPreviaDto;
import pe.contabilidad.dto.VersionPcgeDto;
import pe.contabilidad.entity.OrigenCuenta;
import pe.contabilidad.service.ArchivoGenerado;
import pe.contabilidad.service.ExportacionService;
import pe.contabilidad.service.ImportacionService;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;

@RestController
@Tag(name = "Importación y exportación", description = "Carga de catálogos desde archivos y descarga en Excel, PDF o CSV")
public class ArchivoController {

    private final ExportacionService exportacion;
    private final ImportacionService importacion;

    public ArchivoController(ExportacionService exportacion, ImportacionService importacion) {
        this.exportacion = exportacion;
        this.importacion = importacion;
    }

    @GetMapping("/api/exportaciones/cuentas")
    @PreAuthorize("hasAuthority('CATALOGO_EXPORTAR')")
    @Operation(summary = "Exporta el catálogo con los filtros aplicados (formato: XLSX, PDF o CSV)")
    public ResponseEntity<byte[]> exportar(@RequestParam(defaultValue = "XLSX") ExportacionService.Formato formato,
                                           @RequestParam(required = false) String version,
                                           @RequestParam(required = false) String termino,
                                           @RequestParam(required = false) Short elemento,
                                           @RequestParam(required = false) Integer nivel,
                                           @RequestParam(defaultValue = "TODAS") FiltroCuentas.EstadoFiltro estado,
                                           @RequestParam(required = false) OrigenCuenta origen,
                                           @RequestParam(required = false) Boolean conObservacion) {
        ArchivoGenerado archivo = exportacion.exportar(new FiltroCuentas(version, termino, elemento, nivel, estado, origen, conObservacion), formato);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(archivo.nombre(), StandardCharsets.UTF_8).build().toString())
                .contentType(MediaType.parseMediaType(archivo.tipoContenido()))
                .body(archivo.contenido());
    }

    @PostMapping(path = "/api/importaciones/vista-previa", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('CATALOGO_IMPORTAR')")
    @Operation(summary = "Valida un archivo de catálogo y muestra una vista previa. No modifica datos")
    public ImportacionVistaPreviaDto vistaPrevia(@RequestPart("archivo") MultipartFile archivo) {
        return importacion.vistaPrevia(archivo.getOriginalFilename(), bytes(archivo));
    }

    @PostMapping(path = "/api/importaciones", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('CATALOGO_IMPORTAR')")
    @Operation(summary = "Confirma la importación y crea una versión nueva (no oficial) del catálogo")
    public VersionPcgeDto confirmar(@RequestPart("archivo") MultipartFile archivo,
                                    @Valid @RequestPart("datos") ImportacionConfirmarRequest datos) {
        return importacion.confirmar(archivo.getOriginalFilename(), bytes(archivo), datos);
    }

    private static byte[] bytes(MultipartFile archivo) {
        try {
            return archivo.getBytes();
        } catch (IOException e) {
            throw new UncheckedIOException("No se pudo leer el archivo recibido", e);
        }
    }
}
