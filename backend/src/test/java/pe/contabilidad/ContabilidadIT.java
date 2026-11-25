package pe.contabilidad;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.is;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Escenario contable completo sobre el PCGE Modificado 2019 (año 2026):
 * aporte de capital, venta con IGV, compra de mercaderías, cobranza y un asiento anulado.
 */
@AutoConfigureMockMvc
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class ContabilidadIT extends IntegracionBase {

    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;

    private long idAnulable;

    private static RequestPostProcessor contador() {
        return SecurityMockMvcRequestPostProcessors.user("contador").authorities(
                () -> "CONTABILIDAD_CONSULTAR", () -> "ASIENTOS_REGISTRAR", () -> "ASIENTOS_ANULAR");
    }

    private static RequestPostProcessor auxiliar() {
        return SecurityMockMvcRequestPostProcessors.user("auxiliar").authorities(
                () -> "CONTABILIDAD_CONSULTAR", () -> "ASIENTOS_REGISTRAR");
    }

    private long cuenta(String codigo) {
        return jdbc.queryForObject("SELECT c.id FROM cuenta_contable c JOIN version_pcge v ON v.id = c.version_id WHERE v.codigo = 'PCGE_2019' AND c.codigo = ?",
                Long.class, codigo);
    }

    private String linea(String codigo, String debe, String haber) {
        return "{\"cuentaId\":" + cuenta(codigo) + ",\"debe\":" + debe + ",\"haber\":" + haber + "}";
    }

    private String asiento(String fecha, String glosa, String... lineas) {
        return "{\"version\":\"PCGE_2019\",\"fecha\":\"" + fecha + "\",\"glosa\":\"" + glosa + "\",\"lineas\":[" + String.join(",", lineas) + "]}";
    }

    private JsonNode registrar(RequestPostProcessor quien, String cuerpo) throws Exception {
        String r = mvc.perform(post("/api/asientos").with(quien).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(cuerpo))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        return json.readTree(r);
    }

    @BeforeAll
    void registrarEscenario() throws Exception {
        JsonNode a1 = registrar(contador(), asiento("2026-01-02", "Aporte de capital en efectivo",
                linea("1041", "10000.00", "0"), linea("5011", "0", "10000.00")));
        registrar(contador(), asiento("2026-02-10", "Venta de mercaderías F001-125",
                linea("1212", "1180.00", "0"), linea("40111", "0", "180.00"), linea("70121", "0", "1000.00")));
        registrar(auxiliar(), asiento("2026-02-15", "Compra de mercaderías F002-88",
                linea("6011", "500.00", "0"), linea("40111", "90.00", "0"), linea("4212", "0", "590.00")));
        JsonNode a4 = registrar(contador(), asiento("2026-03-01", "Cobranza de la factura F001-125",
                linea("1041", "1180.00", "0"), linea("1212", "0", "1180.00")));
        idAnulable = registrar(contador(), asiento("2026-03-05", "Registro equivocado",
                linea("101", "50.00", "0"), linea("1041", "0", "50.00"))).get("id").asLong();
        assertThat(a1.get("numero").asText()).startsWith("2026-");
        assertThat(a4.get("numero").asText()).isNotEqualTo(a1.get("numero").asText());
    }

    @Test
    @Order(1)
    void laAnulacionExigePermisoYMotivo() throws Exception {
        mvc.perform(post("/api/asientos/" + idAnulable + "/anulacion").with(auxiliar()).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"motivo\":\"No corresponde\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/asientos/" + idAnulable + "/anulacion").with(contador()).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"motivo\":\"\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/asientos/" + idAnulable + "/anulacion").with(contador()).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"motivo\":\"Se registró con la cuenta equivocada\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado", is("ANULADO")))
                .andExpect(jsonPath("$.anuladoPor", is("contador")));
        mvc.perform(post("/api/asientos/" + idAnulable + "/anulacion").with(contador()).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"motivo\":\"Segundo intento\"}"))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    @Order(2)
    void libroDiarioExcluyeLosAnulados() throws Exception {
        mvc.perform(get("/api/libros/diario").param("version", "PCGE_2019").param("desde", "2026-01-01").param("hasta", "2026-12-31").with(contador()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.asientos.length()", is(4)))
                .andExpect(jsonPath("$.totalDebe", is(12950.00)))
                .andExpect(jsonPath("$.totalHaber", is(12950.00)))
                .andExpect(jsonPath("$.asientos[1].lineas.length()", is(3)));
    }

    @Test
    @Order(3)
    void libroMayorConSaldoInicialYSubcuentas() throws Exception {
        mvc.perform(get("/api/libros/mayor").param("version", "PCGE_2019").param("cuenta", "1041")
                        .param("desde", "2026-02-01").param("hasta", "2026-12-31").with(contador()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.saldoInicial", is(10000.00)))
                .andExpect(jsonPath("$.movimientos.length()", is(1)))
                .andExpect(jsonPath("$.saldoFinal", is(11180.00)));
        // La cuenta 10 acumula los movimientos de sus subcuentas (1041).
        mvc.perform(get("/api/libros/mayor").param("version", "PCGE_2019").param("cuenta", "10")
                        .param("desde", "2026-01-01").param("hasta", "2026-12-31").with(contador()))
                .andExpect(jsonPath("$.movimientos.length()", is(2)))
                .andExpect(jsonPath("$.saldoFinal", is(11180.00)));
    }

    @Test
    @Order(4)
    void balanceDeComprobacionCuadra() throws Exception {
        mvc.perform(get("/api/libros/balance-comprobacion").param("version", "PCGE_2019")
                        .param("desde", "2026-01-01").param("hasta", "2026-12-31").param("nivel", "2").with(contador()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cuadra", is(true)))
                .andExpect(jsonPath("$.totalDebe", is(12950.00)))
                .andExpect(jsonPath("$.filas[?(@.codigo == '10')].saldoDeudor").value(org.hamcrest.Matchers.contains(11180.00)))
                .andExpect(jsonPath("$.filas[?(@.codigo == '40')].saldoAcreedor").value(org.hamcrest.Matchers.contains(90.00)));
    }

    @Test
    @Order(5)
    void estadosFinancierosCuadran() throws Exception {
        mvc.perform(get("/api/reportes/situacion-financiera").param("version", "PCGE_2019").param("hasta", "2026-12-31").with(contador()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activo.total", is(11180.00)))
                .andExpect(jsonPath("$.pasivo.total", is(680.00)))
                .andExpect(jsonPath("$.patrimonio.total", is(10000.00)))
                .andExpect(jsonPath("$.resultadoEjercicio", is(500.00)))
                .andExpect(jsonPath("$.cuadra", is(true)));
        mvc.perform(get("/api/reportes/resultados").param("version", "PCGE_2019").param("desde", "2026-01-01").param("hasta", "2026-12-31").with(contador()))
                .andExpect(jsonPath("$.ingresos.total", is(1000.00)))
                .andExpect(jsonPath("$.gastos.total", is(500.00)))
                .andExpect(jsonPath("$.resultado", is(500.00)));
    }

    @Test
    @Order(6)
    void rechazaAsientosInvalidos() throws Exception {
        // No cuadra
        mvc.perform(post("/api/asientos").with(contador()).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(asiento("2026-04-01", "Descuadrado", linea("101", "100.00", "0"), linea("1041", "0", "90.00"))))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.mensaje", containsString("no cuadra")));
        // Cuenta con subcuentas
        mvc.perform(post("/api/asientos").with(contador()).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(asiento("2026-04-01", "Cuenta no de movimiento", linea("4011", "100.00", "0"), linea("1041", "0", "100.00"))))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.mensaje", containsString("último nivel")));
        // Debe y haber en la misma línea
        mvc.perform(post("/api/asientos").with(contador()).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(asiento("2026-04-01", "Doble importe", linea("101", "10.00", "10.00"), linea("1041", "0", "0"))))
                .andExpect(status().isUnprocessableEntity());
        // Fecha futura
        mvc.perform(post("/api/asientos").with(contador()).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(asiento("2099-01-01", "Futuro", linea("101", "10.00", "0"), linea("1041", "0", "10.00"))))
                .andExpect(status().isUnprocessableEntity());
        // Una sola línea
        mvc.perform(post("/api/asientos").with(contador()).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(asiento("2026-04-01", "Incompleto", linea("101", "10.00", "0"))))
                .andExpect(status().isBadRequest());
        // Cuenta de otra versión del catálogo
        long cuenta2026 = jdbc.queryForObject("SELECT c.id FROM cuenta_contable c JOIN version_pcge v ON v.id = c.version_id WHERE v.codigo = 'PCGE_2026' AND c.codigo = '101'", Long.class);
        mvc.perform(post("/api/asientos").with(contador()).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(asiento("2026-04-01", "Otra versión", "{\"cuentaId\":" + cuenta2026 + ",\"debe\":10,\"haber\":0}", linea("1041", "0", "10.00"))))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.mensaje", containsString("no pertenece")));
    }

    @Test
    @Order(7)
    void laBaseDeDatosImpideAlterarAsientos() {
        assertThatThrownBy(() -> jdbc.update("UPDATE asiento_detalle SET debe = debe + 1"))
                .rootCause().hasMessageContaining("no pueden modificarse");
        assertThatThrownBy(() -> jdbc.update("UPDATE asiento_contable SET glosa = 'alterada'"))
                .rootCause().hasMessageContaining("no pueden modificarse");
        assertThatThrownBy(() -> jdbc.update("DELETE FROM asiento_contable"))
                .rootCause().hasMessageContaining("no pueden modificarse");
    }

    @Test
    @Order(8)
    void listadoYExportaciones() throws Exception {
        mvc.perform(get("/api/asientos").param("version", "PCGE_2019").param("termino", "mercaderias").with(auxiliar()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElementos", is(2)));
        for (String ruta : new String[]{"/api/libros/diario/exportar", "/api/libros/balance-comprobacion/exportar"}) {
            mvc.perform(get(ruta).param("version", "PCGE_2019").param("desde", "2026-01-01").param("hasta", "2026-12-31")
                            .param("formato", "PDF").with(auxiliar()))
                    .andExpect(status().isOk())
                    .andExpect(header().string("Content-Type", "application/pdf"));
        }
        mvc.perform(get("/api/reportes/situacion-financiera/exportar").param("version", "PCGE_2019").param("hasta", "2026-12-31").with(auxiliar()))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", containsString(".xlsx")));
        mvc.perform(get("/api/libros/mayor/exportar").param("version", "PCGE_2019").param("cuenta", "1041")
                        .param("desde", "2026-01-01").param("hasta", "2026-12-31").with(auxiliar()))
                .andExpect(status().isOk());
    }

    @Test
    @Order(9)
    void laBusquedaParaAsientosSoloOfreceCuentasDeMovimiento() throws Exception {
        mvc.perform(get("/api/cuentas/buscar").param("version", "PCGE_2019").param("termino", "401").param("soloMovimiento", "true").param("limite", "50")
                        .with(SecurityMockMvcRequestPostProcessors.user("x").authorities(() -> "CATALOGO_CONSULTAR")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].codigo", org.hamcrest.Matchers.everyItem(org.hamcrest.Matchers.startsWith("401"))))
                .andExpect(jsonPath("$[*].codigo", org.hamcrest.Matchers.hasItem("40111")))
                .andExpect(jsonPath("$[*].codigo", org.hamcrest.Matchers.not(org.hamcrest.Matchers.hasItem("4011"))));
    }
}
