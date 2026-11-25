package pe.contabilidad;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.containsStringIgnoringCase;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Pruebas de la API REST con seguridad, validaciones y base de datos reales. */
@AutoConfigureMockMvc
class ApiCuentasIT extends IntegracionBase {

    @Autowired
    MockMvc mvc;

    @Autowired
    JdbcTemplate jdbc;

    private static RequestPostProcessor auxiliar() {
        return SecurityMockMvcRequestPostProcessors.user("auxiliar").authorities(
                () -> "CATALOGO_CONSULTAR", () -> "CATALOGO_EXPORTAR");
    }

    private static RequestPostProcessor contador() {
        return SecurityMockMvcRequestPostProcessors.user("contador").authorities(
                () -> "CATALOGO_CONSULTAR", () -> "CATALOGO_EXPORTAR", () -> "CUENTAS_GESTIONAR");
    }

    private long idDe(String version, String codigo) {
        return jdbc.queryForObject("SELECT c.id FROM cuenta_contable c JOIN version_pcge v ON v.id = c.version_id WHERE v.codigo = ? AND c.codigo = ?",
                Long.class, version, codigo);
    }

    @Test
    void exigeSesionIniciada() throws Exception {
        mvc.perform(get("/api/cuentas")).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.mensaje", containsString("sesión")));
    }

    @Test
    void listaPaginadaConFiltros() throws Exception {
        mvc.perform(get("/api/cuentas").param("elemento", "4").param("nivel", "3").param("tamano", "5").with(auxiliar()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tamano", is(5)))
                .andExpect(jsonPath("$.contenido[*].codigo", everyItem(startsWith("4"))))
                .andExpect(jsonPath("$.contenido[*].nivel", everyItem(is(3))));
    }

    @Test
    void filtraCuentasConObservacionDeLaFuente() throws Exception {
        mvc.perform(get("/api/cuentas").param("version", "PCGE_2019").param("conObservacion", "true").with(auxiliar()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElementos", is(12)));
    }

    @Test
    void buscaSinDistinguirTildesNiMayusculas() throws Exception {
        mvc.perform(get("/api/cuentas/buscar").param("termino", "DEPRECIACION").with(auxiliar()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].denominacion", containsStringIgnoringCase("depreciación")));
        mvc.perform(get("/api/cuentas/buscar").param("termino", "4011").with(auxiliar()))
                .andExpect(jsonPath("$[0].codigo", is("4011")));
    }

    @Test
    void consultaPorCodigoConRutaJerarquica() throws Exception {
        mvc.perform(get("/api/cuentas/codigo/1041").param("version", "PCGE_2019").with(auxiliar()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.denominacion", is("Cuentas corrientes operativas")))
                .andExpect(jsonPath("$.ruta[*].codigo", hasItem("104")))
                .andExpect(jsonPath("$.editable", is(false)));
        mvc.perform(get("/api/cuentas/codigo/9999").with(auxiliar())).andExpect(status().isNotFound());
    }

    @Test
    void arbolYElementosPorVersion() throws Exception {
        mvc.perform(get("/api/cuentas/arbol").param("version", "PCGE_2026").with(auxiliar()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()", is(9)))
                .andExpect(jsonPath("$[0].numero", is(1)));
        mvc.perform(get("/api/versiones-pcge").with(auxiliar()))
                .andExpect(jsonPath("$[?(@.codigo == 'PCGE_2026')].estado", hasItem("POR_ENTRAR_EN_VIGENCIA")));
    }

    @Test
    void elAuxiliarNoPuedeModificar() throws Exception {
        mvc.perform(post("/api/cuentas").with(auxiliar()).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"version\":\"PCGE_2019\",\"codigo\":\"10412\",\"denominacion\":\"X\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void lasModificacionesExigenTokenCsrf() throws Exception {
        mvc.perform(post("/api/cuentas").with(contador()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"version\":\"PCGE_2019\",\"codigo\":\"10413\",\"denominacion\":\"X\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void validaLosDatosDeEntrada() throws Exception {
        mvc.perform(post("/api/cuentas").with(contador()).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"version\":\"PCGE_2019\",\"codigo\":\"10A\",\"denominacion\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.codigo").exists())
                .andExpect(jsonPath("$.campos.denominacion").exists());
    }

    @Test
    void cicloDeVidaDeUnaCuentaPersonalizada() throws Exception {
        // Registro
        mvc.perform(post("/api/cuentas").with(contador()).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"version\":\"PCGE_2019\",\"codigo\":\"10421\",\"denominacion\":\"Banco - cuenta para detracciones\",\"naturaleza\":\"DEUDORA\"}"))
                .andExpect(status().isCreated())
                .andExpect(header().exists("Location"))
                .andExpect(jsonPath("$.origen", is("PERSONALIZADA")))
                .andExpect(jsonPath("$.padre.codigo", is("1042")));
        long id = idDe("PCGE_2019", "10421");

        // Edición
        mvc.perform(put("/api/cuentas/" + id).with(contador()).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"denominacion\":\"Banco de la Nación - detracciones\",\"versionRegistro\":0}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.denominacion", is("Banco de la Nación - detracciones")));

        // Edición con versión desactualizada
        mvc.perform(put("/api/cuentas/" + id).with(contador()).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"denominacion\":\"Otra\",\"versionRegistro\":0}"))
                .andExpect(status().isConflict());

        // Historial
        mvc.perform(get("/api/cuentas/" + id + "/historial").with(contador()))
                .andExpect(jsonPath("$.totalElementos", is(2)))
                .andExpect(jsonPath("$.contenido[0].accion", is("MODIFICACION")))
                .andExpect(jsonPath("$.contenido[0].usuario", is("contador")));

        // Código duplicado
        mvc.perform(post("/api/cuentas").with(contador()).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"version\":\"PCGE_2019\",\"codigo\":\"10421\",\"denominacion\":\"Duplicada\"}"))
                .andExpect(status().isConflict());
    }

    @Test
    void lasCuentasOficialesEstanProtegidas() throws Exception {
        long id = idDe("PCGE_2019", "101");
        mvc.perform(put("/api/cuentas/" + id).with(contador()).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"denominacion\":\"Alterada\",\"versionRegistro\":0}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.mensaje", containsString("protegida")));
    }

    @Test
    void desactivarExigeMotivoYAlcanzaLasSubcuentas() throws Exception {
        long id = idDe("PCGE_2026", "103");
        mvc.perform(patch("/api/cuentas/" + id + "/estado").with(contador()).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"activa\":false,\"motivo\":\"\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(patch("/api/cuentas/" + id + "/estado").with(contador()).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"activa\":false,\"motivo\":\"La empresa no maneja efectivo en tránsito\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.codigosAfectados.length()", is(3)));
        // Una subcuenta no puede activarse mientras su cuenta superior esté inactiva.
        mvc.perform(patch("/api/cuentas/" + idDe("PCGE_2026", "1031") + "/estado").with(contador()).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"activa\":true,\"motivo\":\"Se vuelve a utilizar\"}"))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void exportaEnLosTresFormatos() throws Exception {
        mvc.perform(get("/api/exportaciones/cuentas").param("formato", "XLSX").param("elemento", "1").with(auxiliar()))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", containsString(".xlsx")));
        mvc.perform(get("/api/exportaciones/cuentas").param("formato", "PDF").param("elemento", "5").with(auxiliar()))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "application/pdf"));
        mvc.perform(get("/api/exportaciones/cuentas").param("formato", "CSV").param("termino", "caja").with(auxiliar()))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", containsString("text/csv")));
        mvc.perform(get("/api/exportaciones/cuentas").param("termino", "zzzzzz").with(auxiliar()))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void laImportacionExigePermisoDeAdministrador() throws Exception {
        mvc.perform(multipart("/api/importaciones/vista-previa")
                        .file(new MockMultipartFile("archivo", "c.csv", "text/csv", "codigo,denominacion\n1,ACTIVO\n".getBytes()))
                        .with(contador()).with(csrf()))
                .andExpect(status().isForbidden());
    }
}
