package pe.contabilidad.entity;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

class VersionPcgeTest {

    private static VersionPcge version(LocalDate desde, LocalDate hasta, boolean oficial) {
        VersionPcge v = new VersionPcge();
        v.setOficial(oficial);
        v.setFechaAplicacionObligatoria(desde);
        v.setFechaFinVigencia(hasta);
        return v;
    }

    @Test
    void pcge2019VigenteHastaFin2027YDerogadoDespues() {
        VersionPcge v2019 = version(LocalDate.of(2020, 1, 1), LocalDate.of(2027, 12, 31), true);
        assertThat(v2019.estadoVigencia(LocalDate.of(2026, 11, 24))).isEqualTo(EstadoVigencia.VIGENTE);
        assertThat(v2019.estadoVigencia(LocalDate.of(2027, 12, 31))).isEqualTo(EstadoVigencia.VIGENTE);
        assertThat(v2019.estadoVigencia(LocalDate.of(2028, 1, 1))).isEqualTo(EstadoVigencia.DEROGADA);
    }

    @Test
    void pcge2026PorEntrarEnVigenciaHasta2028() {
        VersionPcge v2026 = version(LocalDate.of(2028, 1, 1), null, true);
        assertThat(v2026.estadoVigencia(LocalDate.of(2027, 12, 31))).isEqualTo(EstadoVigencia.POR_ENTRAR_EN_VIGENCIA);
        assertThat(v2026.estadoVigencia(LocalDate.of(2028, 1, 1))).isEqualTo(EstadoVigencia.VIGENTE);
    }

    @Test
    void catalogoImportadoNuncaSePresentaComoOficial() {
        assertThat(version(LocalDate.of(2020, 1, 1), null, false).estadoVigencia(LocalDate.now()))
                .isEqualTo(EstadoVigencia.NO_OFICIAL);
        assertThat(version(null, null, true).estadoVigencia(LocalDate.now())).isEqualTo(EstadoVigencia.SIN_FECHA);
    }
}
