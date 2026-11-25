package pe.contabilidad.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class TextoUtilTest {

    @Test
    void normalizaTildesMayusculasYEspacios() {
        assertThat(TextoUtil.normalizar("  DEPRECIACIÓN   Acumulada ")).isEqualTo("depreciacion acumulada");
        assertThat(TextoUtil.normalizar("Compañías aseguradoras")).isEqualTo("companias aseguradoras");
        assertThat(TextoUtil.normalizar(null)).isEmpty();
    }

    @Test
    void reconoceCodigosNumericos() {
        assertThat(TextoUtil.esCodigo("4011")).isTrue();
        assertThat(TextoUtil.esCodigo("40a")).isFalse();
        assertThat(TextoUtil.esCodigo("")).isFalse();
        assertThat(TextoUtil.esCodigo(null)).isFalse();
    }

    @Test
    void escapaComodinesDeLike() {
        assertThat(TextoUtil.escaparLike("100%_a\\b")).isEqualTo("100\\%\\_a\\\\b");
    }

    @Test
    void limpiaTextoVacioANulo() {
        assertThat(TextoUtil.limpiar("   ")).isNull();
        assertThat(TextoUtil.limpiar(" Caja   chica ")).isEqualTo("Caja chica");
    }
}
