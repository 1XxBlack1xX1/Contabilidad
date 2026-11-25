package pe.contabilidad.service;

import org.junit.jupiter.api.Test;
import pe.contabilidad.dto.ImportacionVistaPreviaDto;
import pe.contabilidad.exception.ReglaNegocioException;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Valida la vista previa de importación (no requiere base de datos). */
class ImportacionServiceTest {

    private final ImportacionService servicio = new ImportacionService(new LectorArchivoCatalogo(),
            null, null, null, null, null, null, null, null);

    private ImportacionVistaPreviaDto validar(String csv) {
        return servicio.vistaPrevia("catalogo.csv", csv.getBytes(StandardCharsets.UTF_8));
    }

    @Test
    void aceptaUnCatalogoBienFormado() {
        ImportacionVistaPreviaDto vp = validar("""
                codigo,denominacion
                1,ACTIVO DISPONIBLE Y EXIGIBLE
                10,EFECTIVO Y EQUIVALENTES DE EFECTIVO
                101,Caja
                1011,Caja chica
                """);
        assertThat(vp.valido()).isTrue();
        assertThat(vp.totalElementos()).isEqualTo(1);
        assertThat(vp.totalCuentas()).isEqualTo(3);
        assertThat(vp.cuentasPorNivel()).containsEntry("Cuenta", 1L).containsEntry("Subcuenta", 1L).containsEntry("Divisionaria", 1L);
        assertThat(vp.sha256()).hasSize(64);
    }

    @Test
    void aceptaPuntoYComaYEncabezadosConTildes() {
        ImportacionVistaPreviaDto vp = validar("﻿Código;Denominación;Otra\n1;ACTIVO\n10;EFECTIVO\n");
        assertThat(vp.valido()).isTrue();
        assertThat(vp.advertencias()).anyMatch(i -> i.mensaje().contains("Otra"));
    }

    @Test
    void detectaDuplicadosCuentaSuperiorFaltanteYCodigosInvalidos() {
        ImportacionVistaPreviaDto vp = validar("""
                codigo,denominacion
                1,ACTIVO
                10,EFECTIVO
                10,EFECTIVO REPETIDO
                1031,Sin cuenta superior
                2A,Código inválido
                20,Sin elemento 2
                11,
                """);
        assertThat(vp.valido()).isFalse();
        assertThat(vp.errores()).extracting(ImportacionVistaPreviaDto.Incidencia::mensaje)
                .anyMatch(m -> m.startsWith("Código duplicado"))
                .anyMatch(m -> m.contains("cuenta superior 103"))
                .anyMatch(m -> m.contains("solo dígitos"))
                .anyMatch(m -> m.contains("elemento 2"))
                .anyMatch(m -> m.contains("Falta la denominación"));
    }

    @Test
    void exigeDefinirElementos() {
        assertThat(validar("codigo,denominacion\n10,EFECTIVO\n").errores())
                .anyMatch(i -> i.mensaje().contains("no define elementos"));
    }

    @Test
    void rechazaArchivosSinEncabezadosOFormatoNoAdmitido() {
        assertThatThrownBy(() -> validar("a,b\n1,x\n")).isInstanceOf(ReglaNegocioException.class)
                .hasMessageContaining("encabezados");
        assertThatThrownBy(() -> servicio.vistaPrevia("catalogo.pdf", new byte[]{1}))
                .isInstanceOf(ReglaNegocioException.class).hasMessageContaining("Formato no admitido");
    }
}
