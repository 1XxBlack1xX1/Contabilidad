package pe.contabilidad.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.contabilidad.dto.ContabilidadDtos.EstadoResultadosDto;
import pe.contabilidad.dto.ContabilidadDtos.EstadoSituacionDto;
import pe.contabilidad.dto.ContabilidadDtos.LineaReporteDto;
import pe.contabilidad.dto.ContabilidadDtos.SeccionReporteDto;
import pe.contabilidad.entity.VersionPcge;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Predicate;

/**
 * Reportes de gestión calculados a partir de los saldos por elemento del PCGE.
 * <ul>
 *   <li>Activo: elementos 1, 2 y 3 (saldo deudor; las cuentas de valuación restan).</li>
 *   <li>Pasivo: elemento 4 · Patrimonio: elemento 5 (saldo acreedor).</li>
 *   <li>Resultado del ejercicio no trasladado al patrimonio: elementos 6, 7, 8 y 9 (haber − debe). Las cargas
 *       imputables (79) y el elemento 9 se compensan entre sí, por lo que el resultado no se duplica.</li>
 *   <li>El elemento 0 (cuentas de orden) no forma parte de los estados.</li>
 * </ul>
 * No reemplazan a los estados financieros elaborados conforme a las NIIF (clasificación corriente/no corriente,
 * revelaciones, etc.); son una herramienta de control y análisis.
 */
@Service
public class ReporteFinancieroService {

    private final LibroService libros;
    private final VersionPcgeService versiones;

    public ReporteFinancieroService(LibroService libros, VersionPcgeService versiones) {
        this.libros = libros;
        this.versiones = versiones;
    }

    @Transactional(readOnly = true)
    public EstadoSituacionDto situacionFinanciera(String codigoVersion, LocalDate hasta) {
        VersionPcge v = versiones.resolver(codigoVersion);
        Map<String, BigDecimal[]> sumas = libros.sumasAgrupadas(v, null, hasta, 2);
        Map<String, String> nombres = libros.nombresPorCodigo(v);

        SeccionReporteDto activo = seccion("Activo", sumas, nombres, c -> "123".indexOf(c.charAt(0)) >= 0, true);
        SeccionReporteDto pasivo = seccion("Pasivo", sumas, nombres, c -> c.charAt(0) == '4', false);
        SeccionReporteDto patrimonio = seccion("Patrimonio", sumas, nombres, c -> c.charAt(0) == '5', false);
        BigDecimal resultado = total(sumas, c -> "6789".indexOf(c.charAt(0)) >= 0, false);
        BigDecimal pasivoPatrimonio = pasivo.total().add(patrimonio.total()).add(resultado);
        return new EstadoSituacionDto(v.getNombre(), hasta, activo, pasivo, patrimonio, resultado, pasivoPatrimonio,
                activo.total().compareTo(pasivoPatrimonio) == 0);
    }

    /** Estado de resultados por naturaleza: ingresos (elemento 7, sin la cuenta 79) menos gastos (elemento 6). */
    @Transactional(readOnly = true)
    public EstadoResultadosDto resultados(String codigoVersion, LocalDate desde, LocalDate hasta) {
        LibroService.validarRango(desde, hasta);
        VersionPcge v = versiones.resolver(codigoVersion);
        Map<String, BigDecimal[]> sumas = libros.sumasAgrupadas(v, desde, hasta, 2);
        Map<String, String> nombres = libros.nombresPorCodigo(v);
        SeccionReporteDto ingresos = seccion("Ingresos", sumas, nombres, c -> c.charAt(0) == '7' && !c.equals("79"), false);
        SeccionReporteDto gastos = seccion("Gastos", sumas, nombres, c -> c.charAt(0) == '6', true);
        return new EstadoResultadosDto(v.getNombre(), desde, hasta, ingresos, gastos, ingresos.total().subtract(gastos.total()));
    }

    private static SeccionReporteDto seccion(String titulo, Map<String, BigDecimal[]> sumas, Map<String, String> nombres,
                                             Predicate<String> incluye, boolean deudora) {
        List<LineaReporteDto> lineas = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;
        for (var e : sumas.entrySet()) {
            if (!incluye.test(e.getKey())) continue;
            BigDecimal importe = saldo(e.getValue(), deudora);
            if (importe.signum() == 0) continue;
            lineas.add(new LineaReporteDto(e.getKey(), nombres.getOrDefault(e.getKey(), "—"), importe));
            total = total.add(importe);
        }
        return new SeccionReporteDto(titulo, lineas, total);
    }

    private static BigDecimal total(Map<String, BigDecimal[]> sumas, Predicate<String> incluye, boolean deudora) {
        return sumas.entrySet().stream().filter(e -> incluye.test(e.getKey()))
                .map(e -> saldo(e.getValue(), deudora)).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private static BigDecimal saldo(BigDecimal[] s, boolean deudora) {
        return deudora ? s[0].subtract(s[1]) : s[1].subtract(s[0]);
    }
}
