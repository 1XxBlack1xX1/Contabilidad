package pe.contabilidad.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import pe.contabilidad.dto.CambioEstadoRequest;
import pe.contabilidad.dto.CuentaActualizarRequest;
import pe.contabilidad.dto.CuentaCrearRequest;
import pe.contabilidad.entity.AccionHistorial;
import pe.contabilidad.entity.CuentaContable;
import pe.contabilidad.entity.ElementoContable;
import pe.contabilidad.entity.OrigenCuenta;
import pe.contabilidad.entity.VersionPcge;
import pe.contabilidad.exception.ConflictoException;
import pe.contabilidad.exception.CuentaProtegidaException;
import pe.contabilidad.exception.ReglaNegocioException;
import pe.contabilidad.mapper.CuentaMapper;
import pe.contabilidad.repository.CuentaContableRepository;
import pe.contabilidad.repository.ElementoContableRepository;
import pe.contabilidad.security.UsuarioActual;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class CuentaServiceTest {

    @Mock CuentaContableRepository cuentas;
    @Mock ElementoContableRepository elementos;
    @Mock VersionPcgeService versiones;
    @Mock HistorialService historial;
    @Mock CuentaMapper mapper;
    @Mock UsuarioActual usuarioActual;
    @InjectMocks CuentaService servicio;

    private VersionPcge version;
    private ElementoContable elemento1;

    @BeforeEach
    void preparar() {
        version = new VersionPcge();
        version.setId(1L);
        version.setCodigo("PCGE_2019");
        version.setNombre("PCGE Modificado 2019");
        elemento1 = new ElementoContable();
        elemento1.setId(10L);
        elemento1.setNumero((short) 1);
        when(versiones.resolver(any())).thenReturn(version);
        when(usuarioActual.nombreUsuario()).thenReturn("contador");
        when(elementos.findByVersionIdAndNumero(1L, (short) 1)).thenReturn(Optional.of(elemento1));
    }

    private CuentaContable cuenta(long id, String codigo, OrigenCuenta origen, boolean activa, CuentaContable padre) {
        CuentaContable c = new CuentaContable();
        c.setId(id);
        c.setCodigo(codigo);
        c.setNivel((short) codigo.length());
        c.setDenominacion("Cuenta " + codigo);
        c.setOrigen(origen);
        c.setActiva(activa);
        c.setVersion(version);
        c.setElemento(elemento1);
        c.setPadre(padre);
        return c;
    }

    @Test
    void registraCuentaPersonalizadaBajoUnaCuentaActiva() {
        CuentaContable padre = cuenta(5, "1041", OrigenCuenta.OFICIAL, true, null);
        when(cuentas.findByVersionIdAndCodigo(1L, "1041")).thenReturn(Optional.of(padre));

        servicio.crear(new CuentaCrearRequest("PCGE_2019", "10411", "  Banco   en soles ", null, null));

        verify(cuentas).saveAndFlush(any(CuentaContable.class));
        verify(historial).registrarCuenta(any(), eq(AccionHistorial.CREACION), anyString(), any(), any());
    }

    @Test
    void rechazaCodigoExistente() {
        when(cuentas.existsByVersionIdAndCodigo(1L, "1041")).thenReturn(true);
        assertThatThrownBy(() -> servicio.crear(new CuentaCrearRequest("PCGE_2019", "1041", "X", null, null)))
                .isInstanceOf(ConflictoException.class);
    }

    @Test
    void rechazaCuentaSinCuentaSuperior() {
        when(cuentas.findByVersionIdAndCodigo(1L, "1099")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> servicio.crear(new CuentaCrearRequest("PCGE_2019", "10991", "X", null, null)))
                .isInstanceOf(ReglaNegocioException.class)
                .hasMessageContaining("No existe la cuenta superior 1099");
    }

    @Test
    void rechazaCuentaBajoUnaCuentaInactiva() {
        when(cuentas.findByVersionIdAndCodigo(1L, "1041")).thenReturn(Optional.of(cuenta(5, "1041", OrigenCuenta.OFICIAL, false, null)));
        assertThatThrownBy(() -> servicio.crear(new CuentaCrearRequest("PCGE_2019", "10411", "X", null, null)))
                .isInstanceOf(ReglaNegocioException.class)
                .hasMessageContaining("inactiva");
    }

    @Test
    void rechazaCuentasDeDosDigitosEnElementosConCatalogoOficial() {
        when(cuentas.findAll(any(org.springframework.data.jpa.domain.Specification.class)))
                .thenReturn(List.of(cuenta(1, "10", OrigenCuenta.OFICIAL, true, null)));
        assertThatThrownBy(() -> servicio.crear(new CuentaCrearRequest("PCGE_2019", "15", "X", null, null)))
                .isInstanceOf(ReglaNegocioException.class)
                .hasMessageContaining("reservadas por el PCGE");
    }

    @Test
    void noPermiteEditarCuentasOficiales() {
        when(cuentas.findById(5L)).thenReturn(Optional.of(cuenta(5, "1041", OrigenCuenta.OFICIAL, true, null)));
        assertThatThrownBy(() -> servicio.actualizar(5L, new CuentaActualizarRequest("Otra", null, null, 0)))
                .isInstanceOf(CuentaProtegidaException.class);
        verify(cuentas, never()).saveAndFlush(any());
    }

    @Test
    void detectaEdicionConcurrente() {
        CuentaContable c = cuenta(7, "10411", OrigenCuenta.PERSONALIZADA, true, null);
        c.setVersionRegistro(3);
        when(cuentas.findById(7L)).thenReturn(Optional.of(c));
        assertThatThrownBy(() -> servicio.actualizar(7L, new CuentaActualizarRequest("Nueva", null, null, 2)))
                .isInstanceOf(ConflictoException.class);
    }

    @Test
    void desactivarIncluyeLasSubcuentasActivas() {
        CuentaContable padre = cuenta(5, "104", OrigenCuenta.OFICIAL, true, null);
        CuentaContable hija = cuenta(6, "1041", OrigenCuenta.OFICIAL, true, padre);
        CuentaContable nieta = cuenta(7, "10411", OrigenCuenta.PERSONALIZADA, true, hija);
        CuentaContable yaInactiva = cuenta(8, "1042", OrigenCuenta.OFICIAL, false, padre);
        when(cuentas.findById(5L)).thenReturn(Optional.of(padre));
        when(cuentas.buscarDescendientes(1L, "104")).thenReturn(List.of(hija, nieta, yaInactiva));

        var resultado = servicio.cambiarEstado(5L, new CambioEstadoRequest(false, "Cuenta no utilizada por la empresa"));

        assertThat(resultado.codigosAfectados()).containsExactly("104", "1041", "10411");
        assertThat(List.of(padre, hija, nieta)).noneMatch(CuentaContable::isActiva);
        verify(historial, times(3)).registrarCuenta(any(), eq(AccionHistorial.DESACTIVACION), anyString(), any(), eq("Cuenta no utilizada por la empresa"));
    }

    @Test
    void noActivaSubcuentaSiLaSuperiorEstaInactiva() {
        CuentaContable padre = cuenta(5, "104", OrigenCuenta.OFICIAL, false, null);
        when(cuentas.findById(6L)).thenReturn(Optional.of(cuenta(6, "1041", OrigenCuenta.OFICIAL, false, padre)));
        assertThatThrownBy(() -> servicio.cambiarEstado(6L, new CambioEstadoRequest(true, "Se vuelve a usar")))
                .isInstanceOf(ReglaNegocioException.class)
                .hasMessageContaining("cuenta superior 104 está inactiva");
    }

    @Test
    void busquedaPriorizaCoincidenciaExactaDeCodigo() {
        CuentaContable c104 = cuenta(1, "104", OrigenCuenta.OFICIAL, true, null);
        CuentaContable c1041 = cuenta(2, "1041", OrigenCuenta.OFICIAL, true, c104);
        when(cuentas.findAll(any(org.springframework.data.jpa.domain.Specification.class), any(org.springframework.data.domain.Pageable.class)))
                .thenReturn(new org.springframework.data.domain.PageImpl<>(List.of(c1041, c104)));
        when(mapper.aResumen(any())).thenAnswer(inv -> {
            CuentaContable c = inv.getArgument(0);
            return new pe.contabilidad.dto.CuentaResumenDto(c.getId(), c.getCodigo(), c.getDenominacion(), c.getNivel(),
                    c.getTipoNivel(), (short) 1, "", null, null, c.getOrigen(), c.isActiva(), false);
        });

        assertThat(servicio.buscar(null, "104", 10)).extracting("codigo").containsExactly("104", "1041");
    }
}
