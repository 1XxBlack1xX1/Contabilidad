package pe.contabilidad;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Verifica la integridad del catálogo oficial cargado por Flyway y las protecciones de la base de datos. */
class CatalogoMigracionIT extends IntegracionBase {

    @Autowired
    JdbcTemplate jdbc;

    private long contar(String sql, Object... args) {
        return jdbc.queryForObject(sql, Long.class, args);
    }

    @Test
    void cargaLosTotalesExactosDeCadaVersionOficial() {
        assertThat(contar("SELECT count(*) FROM cuenta_contable c JOIN version_pcge v ON v.id = c.version_id WHERE v.codigo = 'PCGE_2019' AND c.origen = 'OFICIAL'")).isEqualTo(1772);
        assertThat(contar("SELECT count(*) FROM cuenta_contable c JOIN version_pcge v ON v.id = c.version_id WHERE v.codigo = 'PCGE_2026' AND c.origen = 'OFICIAL'")).isEqualTo(1628);
        assertThat(contar("SELECT count(*) FROM elemento_contable e JOIN version_pcge v ON v.id = e.version_id WHERE v.codigo = 'PCGE_2019'")).isEqualTo(10);
        assertThat(contar("SELECT count(*) FROM elemento_contable e JOIN version_pcge v ON v.id = e.version_id WHERE v.codigo = 'PCGE_2026'")).isEqualTo(9);
    }

    @Test
    void laJerarquiaEsConsistente() {
        // Toda cuenta de 3+ dígitos tiene como padre la cuenta cuyo código es su prefijo inmediato.
        assertThat(contar("""
                SELECT count(*) FROM cuenta_contable c LEFT JOIN cuenta_contable p ON p.id = c.padre_id
                WHERE c.nivel > 2 AND (p.id IS NULL OR p.codigo <> left(c.codigo, length(c.codigo) - 1) OR p.version_id <> c.version_id)
                """)).isZero();
        assertThat(contar("SELECT count(*) FROM cuenta_contable WHERE nivel = 2 AND padre_id IS NOT NULL")).isZero();
        assertThat(contar("SELECT count(*) FROM (SELECT version_id, codigo FROM cuenta_contable GROUP BY 1, 2 HAVING count(*) > 1) d")).isZero();
    }

    @Test
    void lasErratasDeLaFuenteQuedanDocumentadas() {
        assertThat(contar("SELECT count(*) FROM cuenta_contable c JOIN version_pcge v ON v.id = c.version_id WHERE v.codigo = 'PCGE_2019' AND c.codigo_fuente IS NOT NULL")).isEqualTo(12);
        Map<String, Object> errata = jdbc.queryForMap("""
                SELECT c.codigo_fuente, c.observacion_fuente FROM cuenta_contable c JOIN version_pcge v ON v.id = c.version_id
                WHERE v.codigo = 'PCGE_2026' AND c.codigo = '70902'""");
        assertThat(errata.get("codigo_fuente")).isEqualTo("70992");
        assertThat((String) errata.get("observacion_fuente")).contains("Errata tipográfica");
    }

    @Test
    void cuentasConocidasDelDocumentoOficial() {
        assertThat(jdbc.queryForObject("SELECT c.denominacion FROM cuenta_contable c JOIN version_pcge v ON v.id = c.version_id WHERE v.codigo = 'PCGE_2019' AND c.codigo = '40111'", String.class))
                .isEqualTo("IGV – Cuenta propia");
        assertThat(jdbc.queryForObject("SELECT c.denominacion FROM cuenta_contable c JOIN version_pcge v ON v.id = c.version_id WHERE v.codigo = 'PCGE_2026' AND c.codigo = '10'", String.class))
                .isEqualTo("EFECTIVO Y EQUIVALENTES AL EFECTIVO");
    }

    @Test
    void soloHayUnaVersionPredeterminadaYEsLaVigente() {
        assertThat(jdbc.queryForObject("SELECT codigo FROM version_pcge WHERE predeterminada", String.class)).isEqualTo("PCGE_2019");
    }

    @Test
    void laBaseDeDatosImpideModificarOEliminarCuentasOficiales() {
        assertThatThrownBy(() -> jdbc.update("UPDATE cuenta_contable SET denominacion = 'Alterada' WHERE codigo = '101'"))
                .rootCause().hasMessageContaining("protegida");
        assertThatThrownBy(() -> jdbc.update("DELETE FROM cuenta_contable WHERE codigo = '101'"))
                .rootCause().hasMessageContaining("no pueden eliminarse");
    }

    @Test
    void elHistorialEsInalterable() {
        assertThatThrownBy(() -> jdbc.update("UPDATE historial_cambios SET resumen = 'x'")).rootCause().hasMessageContaining("no puede modificarse");
        assertThatThrownBy(() -> jdbc.update("DELETE FROM historial_cambios")).rootCause().hasMessageContaining("no puede modificarse");
    }

    @Test
    void laBusquedaSinTildesUsaLaFuncionDeNormalizacion() {
        assertThat(contar("SELECT count(*) FROM cuenta_contable WHERE f_normalizar(denominacion) LIKE '%depreciacion%'")).isPositive();
    }
}
