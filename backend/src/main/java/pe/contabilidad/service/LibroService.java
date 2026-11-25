package pe.contabilidad.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.contabilidad.dto.ContabilidadDtos.BalanceComprobacionDto;
import pe.contabilidad.dto.ContabilidadDtos.FilaBalanceDto;
import pe.contabilidad.dto.ContabilidadDtos.LibroDiarioDto;
import pe.contabilidad.dto.ContabilidadDtos.LibroMayorDto;
import pe.contabilidad.dto.ContabilidadDtos.MovimientoMayorDto;
import pe.contabilidad.dto.CuentaReferenciaDto;
import pe.contabilidad.entity.AsientoContable;
import pe.contabilidad.entity.AsientoDetalle;
import pe.contabilidad.entity.CuentaContable;
import pe.contabilidad.entity.VersionPcge;
import pe.contabilidad.exception.RecursoNoEncontradoException;
import pe.contabilidad.exception.ReglaNegocioException;
import pe.contabilidad.repository.AsientoContableRepository;
import pe.contabilidad.repository.CuentaContableRepository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;

/** Libros contables generados a partir de los asientos registrados (los anulados no se consideran). */
@Service
public class LibroService {

    private final AsientoContableRepository asientos;
    private final CuentaContableRepository cuentas;
    private final VersionPcgeService versiones;

    public LibroService(AsientoContableRepository asientos, CuentaContableRepository cuentas, VersionPcgeService versiones) {
        this.asientos = asientos;
        this.cuentas = cuentas;
        this.versiones = versiones;
    }

    @Transactional(readOnly = true)
    public LibroDiarioDto diario(String codigoVersion, LocalDate desde, LocalDate hasta) {
        validarRango(desde, hasta);
        VersionPcge v = versiones.resolver(codigoVersion);
        List<AsientoContable> lista = asientos.libroDiario(v.getId(), desde, hasta);
        BigDecimal debe = lista.stream().map(AsientoContable::getTotalDebe).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal haber = lista.stream().map(AsientoContable::getTotalHaber).reduce(BigDecimal.ZERO, BigDecimal::add);
        return new LibroDiarioDto(v.getNombre(), desde, hasta, lista.stream().map(AsientoService::aDto).toList(), debe, haber);
    }

    /** Libro mayor de una cuenta. Si la cuenta tiene subcuentas, incluye los movimientos de todas ellas. */
    @Transactional(readOnly = true)
    public LibroMayorDto mayor(String codigoVersion, String codigoCuenta, LocalDate desde, LocalDate hasta) {
        validarRango(desde, hasta);
        VersionPcge v = versiones.resolver(codigoVersion);
        CuentaContable cuenta = cuentas.findByVersionIdAndCodigo(v.getId(), codigoCuenta.trim())
                .orElseThrow(() -> new RecursoNoEncontradoException("La cuenta " + codigoCuenta + " no existe en el " + v.getNombre() + "."));
        BigDecimal saldo = asientos.saldoAnterior(v.getId(), cuenta.getCodigo(), desde);
        BigDecimal saldoInicial = saldo;
        BigDecimal totalDebe = BigDecimal.ZERO;
        BigDecimal totalHaber = BigDecimal.ZERO;
        List<MovimientoMayorDto> movimientos = new ArrayList<>();
        for (AsientoDetalle d : asientos.movimientosMayor(v.getId(), cuenta.getCodigo(), desde, hasta)) {
            saldo = saldo.add(d.getDebe()).subtract(d.getHaber());
            totalDebe = totalDebe.add(d.getDebe());
            totalHaber = totalHaber.add(d.getHaber());
            AsientoContable a = d.getAsiento();
            movimientos.add(new MovimientoMayorDto(a.getFecha(), a.getId(), a.getNumeroCompleto(),
                    d.getGlosa() != null ? d.getGlosa() : a.getGlosa(), d.getCuenta().getCodigo(), d.getCuenta().getDenominacion(),
                    d.getDebe(), d.getHaber(), saldo));
        }
        return new LibroMayorDto(new CuentaReferenciaDto(cuenta.getId(), cuenta.getCodigo(), cuenta.getDenominacion(),
                cuenta.getTipoNivel(), cuenta.isActiva()), v.getNombre(), desde, hasta, saldoInicial, movimientos,
                totalDebe, totalHaber, saldo);
    }

    /**
     * Balance de comprobación de sumas y saldos del período.
     *
     * @param nivel cantidad de dígitos a la que se agrupan las cuentas (2, 3, 4…) o {@code null} para el último nivel
     */
    @Transactional(readOnly = true)
    public BalanceComprobacionDto balance(String codigoVersion, LocalDate desde, LocalDate hasta, Integer nivel) {
        validarRango(desde, hasta);
        if (nivel != null && (nivel < 2 || nivel > 10)) {
            throw new ReglaNegocioException("nivel", "El nivel debe estar entre 2 y 10 dígitos.");
        }
        VersionPcge v = versiones.resolver(codigoVersion);
        Map<String, String> nombres = nombresPorCodigo(v);
        Map<String, BigDecimal[]> agrupado = sumasAgrupadas(v, desde, hasta, nivel);

        List<FilaBalanceDto> filas = new ArrayList<>();
        BigDecimal[] totales = {BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO};
        agrupado.forEach((codigo, s) -> {
            BigDecimal diferencia = s[0].subtract(s[1]);
            BigDecimal deudor = diferencia.signum() > 0 ? diferencia : BigDecimal.ZERO;
            BigDecimal acreedor = diferencia.signum() < 0 ? diferencia.negate() : BigDecimal.ZERO;
            filas.add(new FilaBalanceDto(codigo, nombres.getOrDefault(codigo, "—"), s[0], s[1], deudor, acreedor));
            totales[0] = totales[0].add(s[0]);
            totales[1] = totales[1].add(s[1]);
            totales[2] = totales[2].add(deudor);
            totales[3] = totales[3].add(acreedor);
        });
        boolean cuadra = totales[0].compareTo(totales[1]) == 0 && totales[2].compareTo(totales[3]) == 0;
        return new BalanceComprobacionDto(v.getNombre(), desde, hasta, nivel == null ? "ULTIMO" : String.valueOf(nivel),
                filas, totales[0], totales[1], totales[2], totales[3], cuadra);
    }

    /** Sumas {debe, haber} agrupadas por el prefijo de código del nivel indicado. {@code desde} puede ser nulo. */
    Map<String, BigDecimal[]> sumasAgrupadas(VersionPcge v, LocalDate desde, LocalDate hasta, Integer nivel) {
        Map<String, BigDecimal[]> agrupado = new TreeMap<>();
        for (Object[] f : asientos.sumasPorCuenta(v.getId(), desde, hasta)) {
            String codigo = (String) f[0];
            String clave = nivel == null || nivel >= codigo.length() ? codigo : codigo.substring(0, nivel);
            BigDecimal[] s = agrupado.computeIfAbsent(clave, k -> new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO});
            s[0] = s[0].add((BigDecimal) f[1]);
            s[1] = s[1].add((BigDecimal) f[2]);
        }
        return agrupado;
    }

    Map<String, String> nombresPorCodigo(VersionPcge v) {
        return cuentas.listarPorVersion(v.getId()).stream()
                .collect(Collectors.toMap(CuentaContable::getCodigo, CuentaContable::getDenominacion, (a, b) -> a));
    }

    static void validarRango(LocalDate desde, LocalDate hasta) {
        if (desde == null || hasta == null) {
            throw new ReglaNegocioException("Indique las fechas de inicio y fin del período.");
        }
        if (desde.isAfter(hasta)) {
            throw new ReglaNegocioException("La fecha inicial no puede ser posterior a la fecha final.");
        }
    }
}
