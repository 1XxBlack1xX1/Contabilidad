package pe.contabilidad.service;

import org.springframework.stereotype.Service;
import pe.contabilidad.dto.ContabilidadDtos.AsientoDto;
import pe.contabilidad.dto.ContabilidadDtos.BalanceComprobacionDto;
import pe.contabilidad.dto.ContabilidadDtos.EstadoResultadosDto;
import pe.contabilidad.dto.ContabilidadDtos.EstadoSituacionDto;
import pe.contabilidad.dto.ContabilidadDtos.LibroDiarioDto;
import pe.contabilidad.dto.ContabilidadDtos.LibroMayorDto;
import pe.contabilidad.dto.ContabilidadDtos.LineaDto;
import pe.contabilidad.dto.ContabilidadDtos.SeccionReporteDto;
import pe.contabilidad.security.UsuarioActual;
import pe.contabilidad.service.ReporteTabular.Columna;
import pe.contabilidad.service.ReporteTabular.Fila;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

/** Exportación de libros y reportes contables a Excel o PDF. */
@Service
public class ExportacionContableService {

    public enum Formato { XLSX, PDF }

    private static final DateTimeFormatter F = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter FH = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    private final ExportadorReportes exportador;
    private final UsuarioActual usuarioActual;
    private final Clock reloj;

    public ExportacionContableService(ExportadorReportes exportador, UsuarioActual usuarioActual, Clock reloj) {
        this.exportador = exportador;
        this.usuarioActual = usuarioActual;
        this.reloj = reloj;
    }

    public ArchivoGenerado diario(LibroDiarioDto d, Formato formato) {
        List<Fila> filas = new ArrayList<>();
        for (AsientoDto a : d.asientos()) {
            filas.add(Fila.grupo(a.numero(), a.fecha().format(F) + " · " + a.glosa()
                    + (a.documentoReferencia() == null ? "" : " · Doc.: " + a.documentoReferencia()), null, null));
            for (LineaDto l : a.lineas()) {
                filas.add(new Fila(List.of(l.cuentaCodigo(), l.cuentaDenominacion() + (l.glosa() == null ? "" : " — " + l.glosa()),
                        l.debe(), l.haber()), ReporteTabular.Estilo.NORMAL, l.haber().signum() > 0 ? 1 : 0));
            }
        }
        filas.add(Fila.total("", "Totales del período", d.totalDebe(), d.totalHaber()));
        return generar(new ReporteTabular("Libro diario", meta(d.versionNombre(), "Del " + d.desde().format(F) + " al " + d.hasta().format(F)
                + " · " + d.asientos().size() + " asientos"), List.of(
                new Columna("Cuenta / Asiento", false, 14), new Columna("Denominación y glosa", false, 70),
                new Columna("Debe (S/)", true, 16), new Columna("Haber (S/)", true, 16)), filas,
                "Solo incluye asientos registrados; los anulados se excluyen."), formato, "libro-diario");
    }

    public ArchivoGenerado mayor(LibroMayorDto m, Formato formato) {
        List<Fila> filas = new ArrayList<>();
        filas.add(Fila.grupo("", "", "Saldo inicial", null, null, m.saldoInicial()));
        m.movimientos().forEach(x -> filas.add(Fila.normal(x.fecha().format(F), x.asientoNumero(),
                x.cuentaCodigo() + " · " + x.glosa(), x.debe(), x.haber(), x.saldo())));
        filas.add(Fila.total("", "", "Totales y saldo final", m.totalDebe(), m.totalHaber(), m.saldoFinal()));
        return generar(new ReporteTabular("Libro mayor — " + m.cuenta().codigo() + " " + m.cuenta().denominacion(),
                meta(m.versionNombre(), "Del " + m.desde().format(F) + " al " + m.hasta().format(F)), List.of(
                new Columna("Fecha", false, 11), new Columna("Asiento", false, 13), new Columna("Cuenta y glosa", false, 56),
                new Columna("Debe (S/)", true, 14), new Columna("Haber (S/)", true, 14), new Columna("Saldo (S/)", true, 15)), filas,
                "Saldo = debe − haber acumulado: positivo indica saldo deudor y negativo, saldo acreedor."), formato, "libro-mayor");
    }

    public ArchivoGenerado balance(BalanceComprobacionDto b, Formato formato) {
        List<Fila> filas = new ArrayList<>();
        b.filas().forEach(f -> filas.add(Fila.normal(f.codigo(), f.denominacion(), f.debe(), f.haber(), f.saldoDeudor(), f.saldoAcreedor())));
        filas.add(Fila.total("", "Totales", b.totalDebe(), b.totalHaber(), b.totalDeudor(), b.totalAcreedor()));
        String nivel = "ULTIMO".equals(b.nivel()) ? "cuentas de último nivel" : "cuentas de " + b.nivel() + " dígitos";
        return generar(new ReporteTabular("Balance de comprobación", meta(b.versionNombre(),
                "Del " + b.desde().format(F) + " al " + b.hasta().format(F) + " · " + nivel), List.of(
                new Columna("Cuenta", false, 10), new Columna("Denominación", false, 50),
                new Columna("Sumas debe", true, 15), new Columna("Sumas haber", true, 15),
                new Columna("Saldo deudor", true, 15), new Columna("Saldo acreedor", true, 15)), filas,
                b.cuadra() ? "El balance cuadra: sumas y saldos del debe y del haber son iguales." : "ATENCIÓN: el balance no cuadra."),
                formato, "balance-comprobacion");
    }

    public ArchivoGenerado situacion(EstadoSituacionDto e, Formato formato) {
        List<Fila> filas = new ArrayList<>();
        seccion(filas, e.activo());
        seccion(filas, e.pasivo());
        seccion(filas, e.patrimonio());
        filas.add(Fila.normal("", "Resultado del ejercicio (no trasladado al patrimonio)", e.resultadoEjercicio()));
        filas.add(Fila.total("", "Total pasivo y patrimonio", e.totalPasivoPatrimonio()));
        return generar(new ReporteTabular("Estado de situación financiera", meta(e.versionNombre(), "Al " + e.hasta().format(F)), List.of(
                new Columna("Cuenta", false, 10), new Columna("Concepto", false, 70), new Columna("Importe (S/)", true, 18)), filas,
                "Reporte de gestión calculado con los saldos de los elementos 1 a 5 del PCGE. No reemplaza a los estados financieros conforme a las NIIF."),
                formato, "situacion-financiera");
    }

    public ArchivoGenerado resultados(EstadoResultadosDto e, Formato formato) {
        List<Fila> filas = new ArrayList<>();
        seccion(filas, e.ingresos());
        seccion(filas, e.gastos());
        filas.add(Fila.total("", e.resultado().signum() >= 0 ? "Utilidad del período" : "Pérdida del período", e.resultado()));
        return generar(new ReporteTabular("Estado de resultados por naturaleza", meta(e.versionNombre(),
                "Del " + e.desde().format(F) + " al " + e.hasta().format(F)), List.of(
                new Columna("Cuenta", false, 10), new Columna("Concepto", false, 70), new Columna("Importe (S/)", true, 18)), filas,
                "Ingresos: elemento 7 sin la cuenta 79 (cargas imputables). Gastos: elemento 6. No reemplaza a los estados financieros conforme a las NIIF."),
                formato, "estado-resultados");
    }

    private static void seccion(List<Fila> filas, SeccionReporteDto s) {
        filas.add(Fila.grupo("", s.titulo().toUpperCase(), null));
        s.lineas().forEach(l -> filas.add(new Fila(List.of(l.codigo(), l.denominacion(), l.importe()), ReporteTabular.Estilo.NORMAL, 1)));
        filas.add(Fila.total("", "Total " + s.titulo().toLowerCase(), s.total()));
    }

    private List<String> meta(String version, String periodo) {
        return List.of(version + " · " + periodo + " · Importes en soles (PEN)",
                "Generado el " + LocalDateTime.now(reloj).format(FH) + " por " + usuarioActual.nombreUsuario());
    }

    private ArchivoGenerado generar(ReporteTabular r, Formato formato, String base) {
        String nombre = base + "-" + LocalDate.now(reloj).format(DateTimeFormatter.BASIC_ISO_DATE);
        return formato == Formato.PDF
                ? new ArchivoGenerado(nombre + ".pdf", "application/pdf", exportador.pdf(r))
                : new ArchivoGenerado(nombre + ".xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", exportador.excel(r));
    }
}
