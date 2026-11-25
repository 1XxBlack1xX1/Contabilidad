package pe.contabilidad.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import pe.contabilidad.entity.EstadoAsiento;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/** DTO del módulo contable: asientos, libros y reportes. Importes en soles (PEN). */
public final class ContabilidadDtos {

    private ContabilidadDtos() {
    }

    // ------------------------------------------------------------------ asientos

    public record LineaRequest(
            @NotNull(message = "Seleccione la cuenta") Long cuentaId,
            @Size(max = 300) String glosa,
            @NotNull @DecimalMin(value = "0.00", message = "El importe no puede ser negativo")
            @Digits(integer = 16, fraction = 2, message = "Use como máximo 2 decimales") BigDecimal debe,
            @NotNull @DecimalMin(value = "0.00", message = "El importe no puede ser negativo")
            @Digits(integer = 16, fraction = 2, message = "Use como máximo 2 decimales") BigDecimal haber) {
    }

    public record AsientoCrearRequest(
            @NotBlank(message = "Indique la versión del plan contable") String version,
            @NotNull(message = "Indique la fecha del asiento") LocalDate fecha,
            @NotBlank(message = "Indique la glosa del asiento") @Size(max = 300) String glosa,
            @Size(max = 60, message = "Máximo 60 caracteres") String documentoReferencia,
            @NotNull @Size(min = 2, max = 200, message = "El asiento debe tener entre 2 y 200 líneas") List<@Valid LineaRequest> lineas) {
    }

    public record AnulacionRequest(
            @NotBlank(message = "Indique el motivo de la anulación")
            @Size(min = 5, max = 500, message = "El motivo debe tener entre 5 y 500 caracteres") String motivo) {
    }

    public record LineaDto(int linea, Long cuentaId, String cuentaCodigo, String cuentaDenominacion, String glosa,
                           BigDecimal debe, BigDecimal haber) {
    }

    public record AsientoResumenDto(Long id, String numero, LocalDate fecha, String glosa, String documentoReferencia,
                                    BigDecimal total, EstadoAsiento estado, String creadoPor, Instant creadoEn) {
    }

    public record AsientoDto(Long id, String numero, LocalDate fecha, String glosa, String documentoReferencia,
                             String moneda, EstadoAsiento estado, BigDecimal totalDebe, BigDecimal totalHaber,
                             String versionCodigo, String versionNombre, List<LineaDto> lineas, String motivoAnulacion,
                             String anuladoPor, Instant anuladoEn, String creadoPor, Instant creadoEn) {
    }

    // ------------------------------------------------------------------ libros

    public record LibroDiarioDto(String versionNombre, LocalDate desde, LocalDate hasta, List<AsientoDto> asientos,
                                 BigDecimal totalDebe, BigDecimal totalHaber) {
    }

    public record MovimientoMayorDto(LocalDate fecha, Long asientoId, String asientoNumero, String glosa,
                                     String cuentaCodigo, String cuentaDenominacion, BigDecimal debe, BigDecimal haber,
                                     BigDecimal saldo) {
    }

    /** Saldos expresados como debe − haber: positivo = saldo deudor, negativo = saldo acreedor. */
    public record LibroMayorDto(CuentaReferenciaDto cuenta, String versionNombre, LocalDate desde, LocalDate hasta,
                                BigDecimal saldoInicial, List<MovimientoMayorDto> movimientos, BigDecimal totalDebe,
                                BigDecimal totalHaber, BigDecimal saldoFinal) {
    }

    public record FilaBalanceDto(String codigo, String denominacion, BigDecimal debe, BigDecimal haber,
                                 BigDecimal saldoDeudor, BigDecimal saldoAcreedor) {
    }

    public record BalanceComprobacionDto(String versionNombre, LocalDate desde, LocalDate hasta, String nivel,
                                         List<FilaBalanceDto> filas, BigDecimal totalDebe, BigDecimal totalHaber,
                                         BigDecimal totalDeudor, BigDecimal totalAcreedor, boolean cuadra) {
    }

    // ------------------------------------------------------------------ reportes

    public record LineaReporteDto(String codigo, String denominacion, BigDecimal importe) {
    }

    public record SeccionReporteDto(String titulo, List<LineaReporteDto> lineas, BigDecimal total) {
    }

    public record EstadoSituacionDto(String versionNombre, LocalDate hasta, SeccionReporteDto activo,
                                     SeccionReporteDto pasivo, SeccionReporteDto patrimonio, BigDecimal resultadoEjercicio,
                                     BigDecimal totalPasivoPatrimonio, boolean cuadra) {
    }

    public record EstadoResultadosDto(String versionNombre, LocalDate desde, LocalDate hasta, SeccionReporteDto ingresos,
                                      SeccionReporteDto gastos, BigDecimal resultado) {
    }
}
