package pe.contabilidad.service;

import org.openpdf.text.Chunk;
import org.openpdf.text.Document;
import org.openpdf.text.DocumentException;
import org.openpdf.text.Element;
import org.openpdf.text.Font;
import org.openpdf.text.FontFactory;
import org.openpdf.text.PageSize;
import org.openpdf.text.Paragraph;
import org.openpdf.text.Phrase;
import org.openpdf.text.Rectangle;
import org.openpdf.text.pdf.BaseFont;
import org.openpdf.text.pdf.ColumnText;
import org.openpdf.text.pdf.PdfPCell;
import org.openpdf.text.pdf.PdfPTable;
import org.openpdf.text.pdf.PdfPageEventHelper;
import org.openpdf.text.pdf.PdfWriter;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVPrinter;
import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.streaming.SXSSFSheet;
import org.apache.poi.xssf.streaming.SXSSFWorkbook;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFColor;
import org.apache.poi.xssf.usermodel.XSSFFont;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.contabilidad.dto.FiltroCuentas;
import pe.contabilidad.entity.CuentaContable;
import pe.contabilidad.entity.ElementoContable;
import pe.contabilidad.entity.FuenteNormativa;
import pe.contabilidad.entity.OrigenCuenta;
import pe.contabilidad.entity.TipoFuente;
import pe.contabilidad.entity.VersionPcge;
import pe.contabilidad.exception.ReglaNegocioException;
import pe.contabilidad.repository.ElementoContableRepository;
import pe.contabilidad.security.UsuarioActual;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Exportación del catálogo a Excel (con agrupación jerárquica plegable), PDF y CSV.
 * Toda exportación incluye la versión, su fuente normativa y los filtros aplicados, de modo que el
 * documento resultante sea trazable.
 */
@Service
public class ExportacionService {

    public enum Formato { XLSX, PDF, CSV }

    private static final DateTimeFormatter FECHA_HORA = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final DateTimeFormatter FECHA = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter SELLO = DateTimeFormatter.ofPattern("yyyyMMdd-HHmm");
    private static final Color AZUL_MARINO = new Color(0x10, 0x24, 0x3A);
    private static final Color GRIS_FILA = new Color(0xF5, 0xF7, 0xFA);
    private static final Color GRIS_TEXTO = new Color(0x64, 0x74, 0x8B);

    private final CuentaService cuentaService;
    private final VersionPcgeService versiones;
    private final ElementoContableRepository elementos;
    private final UsuarioActual usuarioActual;
    private final Clock reloj;

    public ExportacionService(CuentaService cuentaService, VersionPcgeService versiones, ElementoContableRepository elementos,
                              UsuarioActual usuarioActual, Clock reloj) {
        this.cuentaService = cuentaService;
        this.versiones = versiones;
        this.elementos = elementos;
        this.usuarioActual = usuarioActual;
        this.reloj = reloj;
    }

    @Transactional(readOnly = true)
    public ArchivoGenerado exportar(FiltroCuentas filtro, Formato formato) {
        VersionPcge version = versiones.resolver(filtro.version());
        List<CuentaContable> cuentas = cuentaService.listarTodas(version, filtro);
        if (cuentas.isEmpty()) {
            throw new ReglaNegocioException("No hay cuentas que cumplan los filtros seleccionados.");
        }
        Map<Short, ElementoContable> elems = elementos.findByVersionIdOrderByNumeroAsc(version.getId()).stream()
                .collect(Collectors.toMap(ElementoContable::getNumero, Function.identity()));
        Contexto ctx = new Contexto(version, cuentas, elems, describirFiltros(filtro), usuarioActual.nombreUsuario(),
                LocalDateTime.now(reloj));
        String base = "plan-contable-" + version.getCodigo().toLowerCase().replace('_', '-') + "-" + ctx.generado().format(SELLO);
        return switch (formato) {
            case XLSX -> new ArchivoGenerado(base + ".xlsx",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", excel(ctx));
            case PDF -> new ArchivoGenerado(base + ".pdf", "application/pdf", pdf(ctx));
            case CSV -> new ArchivoGenerado(base + ".csv", "text/csv; charset=UTF-8", csv(ctx));
        };
    }

    private record Contexto(VersionPcge version, List<CuentaContable> cuentas, Map<Short, ElementoContable> elementos,
                            String filtros, String usuario, LocalDateTime generado) {

        String fuente() {
            return version.getFuentes().stream().filter(f -> f.getTipo() == TipoFuente.DOCUMENTO_OFICIAL
                            || f.getTipo() == TipoFuente.ARCHIVO_IMPORTADO).findFirst()
                    .map(f -> f.getTitulo() + (f.getUrl() == null ? "" : " — " + f.getUrl())).orElse("No registrada");
        }

        String norma() {
            return version.getFuentes().stream().filter(f -> f.getTipo() == TipoFuente.RESOLUCION)
                    .map(FuenteNormativa::getNumero).map(n -> "Resolución CNC N.° " + n).collect(Collectors.joining("; "));
        }

        String vigencia(LocalDate hoy) {
            return version.estadoVigencia(hoy).etiqueta()
                    + (version.getFechaAplicacionObligatoria() == null ? ""
                    : " · aplicación obligatoria desde " + version.getFechaAplicacionObligatoria().format(FECHA));
        }
    }

    // ------------------------------------------------------------------ Excel

    private byte[] excel(Contexto ctx) {
        try (SXSSFWorkbook libro = new SXSSFWorkbook(500); ByteArrayOutputStream salida = new ByteArrayOutputStream()) {
            SXSSFSheet hoja = libro.createSheet("Plan contable");
            hoja.setRandomAccessWindowSize(-1); // necesario para agrupar filas al final

            XSSFFont negrita = (XSSFFont) libro.createFont();
            negrita.setBold(true);
            XSSFFont titulo = (XSSFFont) libro.createFont();
            titulo.setBold(true);
            titulo.setFontHeightInPoints((short) 14);
            titulo.setColor(new XSSFColor(AZUL_MARINO, null));
            XSSFFont blanca = (XSSFFont) libro.createFont();
            blanca.setBold(true);
            blanca.setColor(IndexedColors.WHITE.getIndex());
            XSSFFont gris = (XSSFFont) libro.createFont();
            gris.setColor(new XSSFColor(GRIS_TEXTO, null));
            gris.setFontHeightInPoints((short) 9);

            CellStyle estiloTitulo = libro.createCellStyle();
            estiloTitulo.setFont(titulo);
            CellStyle estiloMeta = libro.createCellStyle();
            estiloMeta.setFont(gris);
            XSSFCellStyle estiloCabecera = (XSSFCellStyle) libro.createCellStyle();
            estiloCabecera.setFont(blanca);
            estiloCabecera.setFillForegroundColor(new XSSFColor(AZUL_MARINO, null));
            estiloCabecera.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            estiloCabecera.setBorderBottom(BorderStyle.THIN);
            CellStyle estiloElemento = libro.createCellStyle();
            estiloElemento.setFont(negrita);
            CellStyle estiloTexto = libro.createCellStyle();
            CellStyle[] sangria = new CellStyle[11];
            for (int i = 0; i < sangria.length; i++) {
                sangria[i] = libro.createCellStyle();
                sangria[i].setIndention((short) Math.max(0, i - 2));
                if (i == 2) {
                    sangria[i].setFont(negrita);
                }
            }

            int f = 0;
            celda(hoja.createRow(f++), 0, "Plan Contable General Empresarial — " + ctx.version().getNombre(), estiloTitulo);
            celda(hoja.createRow(f++), 0, "Fuente: " + ctx.fuente(), estiloMeta);
            if (!ctx.norma().isEmpty()) {
                celda(hoja.createRow(f++), 0, "Norma de aprobación: " + ctx.norma(), estiloMeta);
            }
            celda(hoja.createRow(f++), 0, "Estado: " + ctx.vigencia(ctx.generado().toLocalDate()), estiloMeta);
            celda(hoja.createRow(f++), 0, "Filtros: " + ctx.filtros(), estiloMeta);
            celda(hoja.createRow(f++), 0, "Generado el " + ctx.generado().format(FECHA_HORA) + " por " + ctx.usuario()
                    + " · " + ctx.cuentas().size() + " cuentas", estiloMeta);
            f++;

            String[] columnas = {"Código", "Denominación", "Nivel", "Elemento", "Origen", "Estado", "Observación de la fuente"};
            Row cab = hoja.createRow(f);
            for (int i = 0; i < columnas.length; i++) {
                celda(cab, i, columnas[i], estiloCabecera);
            }
            int filaCabecera = f++;
            hoja.createFreezePane(0, filaCabecera + 1);

            short elementoActual = -1;
            List<int[]> filasCuentas = new ArrayList<>();
            for (CuentaContable c : ctx.cuentas()) {
                if (c.getElemento().getNumero() != elementoActual) {
                    elementoActual = c.getElemento().getNumero();
                    Row r = hoja.createRow(f++);
                    celda(r, 0, String.valueOf(elementoActual), estiloElemento);
                    celda(r, 1, "ELEMENTO " + elementoActual + ": " + c.getElemento().getDenominacion(), estiloElemento);
                    celda(r, 2, "Elemento", estiloElemento);
                }
                Row r = hoja.createRow(f);
                celda(r, 0, c.getCodigo(), estiloTexto);
                celda(r, 1, c.getDenominacion(), sangria[Math.min(c.getNivel(), 10)]);
                celda(r, 2, c.getTipoNivel().etiqueta(), estiloTexto);
                celda(r, 3, String.valueOf(c.getElemento().getNumero()), estiloTexto);
                celda(r, 4, etiquetaOrigen(c.getOrigen()), estiloTexto);
                celda(r, 5, c.isActiva() ? "Activa" : "Inactiva", estiloTexto);
                celda(r, 6, c.getObservacionFuente() == null ? "" : c.getObservacionFuente(), estiloTexto);
                filasCuentas.add(new int[]{f, c.getNivel()});
                f++;
            }
            hoja.setAutoFilter(new CellRangeAddress(filaCabecera, f - 1, 0, columnas.length - 1));
            agruparJerarquia(hoja, ctx.cuentas(), filasCuentas);
            hoja.setRowSumsBelow(false);

            int[] anchos = {12, 80, 16, 10, 14, 10, 60};
            for (int i = 0; i < anchos.length; i++) {
                hoja.setColumnWidth(i, anchos[i] * 256);
            }
            libro.write(salida);
            libro.close();
            return salida.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException("No se pudo generar el archivo Excel", e);
        }
    }

    /** Agrupa (pliega) en Excel las subcuentas bajo su cuenta superior. */
    private static void agruparJerarquia(SXSSFSheet hoja, List<CuentaContable> cuentas, List<int[]> filas) {
        for (int i = 0; i < cuentas.size(); i++) {
            String codigo = cuentas.get(i).getCodigo();
            int j = i + 1;
            while (j < cuentas.size() && cuentas.get(j).getCodigo().startsWith(codigo)) {
                j++;
            }
            if (j - 1 > i) {
                hoja.groupRow(filas.get(i + 1)[0], filas.get(j - 1)[0]);
            }
        }
    }

    private static void celda(Row fila, int col, String valor, CellStyle estilo) {
        Cell c = fila.createCell(col);
        c.setCellValue(valor);
        c.setCellStyle(estilo);
    }

    // ------------------------------------------------------------------ PDF

    private byte[] pdf(Contexto ctx) {
        ByteArrayOutputStream salida = new ByteArrayOutputStream();
        Document doc = new Document(PageSize.A4.rotate(), 36, 36, 40, 44);
        try {
            PdfWriter escritor = PdfWriter.getInstance(doc, salida);
            escritor.setPageEvent(new PiePagina(ctx));
            doc.addTitle("Plan Contable — " + ctx.version().getNombre());
            doc.addCreator("CONTABILIDAD");
            doc.open();

            Font fTitulo = fuente(15, Font.BOLD, AZUL_MARINO);
            Font fMeta = fuente(8.5f, Font.NORMAL, GRIS_TEXTO);
            Font fCab = fuente(8.5f, Font.BOLD, Color.WHITE);
            Font fNormal = fuente(8.5f, Font.NORMAL, Color.BLACK);
            Font fNegrita = fuente(8.5f, Font.BOLD, Color.BLACK);
            Font fElemento = fuente(9.5f, Font.BOLD, AZUL_MARINO);
            Font fInactiva = fuente(8.5f, Font.NORMAL, GRIS_TEXTO);

            doc.add(new Paragraph("Plan Contable General Empresarial — " + ctx.version().getNombre(), fTitulo));
            Paragraph meta = new Paragraph();
            meta.setSpacingBefore(4);
            meta.setLeading(12);
            meta.add(new Chunk("Fuente: " + ctx.fuente() + "\n", fMeta));
            if (!ctx.norma().isEmpty()) {
                meta.add(new Chunk("Norma de aprobación: " + ctx.norma() + "\n", fMeta));
            }
            meta.add(new Chunk("Estado: " + ctx.vigencia(ctx.generado().toLocalDate()) + "\n", fMeta));
            meta.add(new Chunk("Filtros: " + ctx.filtros() + " · " + ctx.cuentas().size() + " cuentas", fMeta));
            meta.setSpacingAfter(10);
            doc.add(meta);

            PdfPTable tabla = new PdfPTable(new float[]{11, 62, 13, 8, 6});
            tabla.setWidthPercentage(100);
            tabla.setHeaderRows(1);
            for (String t : new String[]{"Código", "Denominación", "Nivel", "Origen", "Estado"}) {
                PdfPCell c = new PdfPCell(new Phrase(t, fCab));
                c.setBackgroundColor(AZUL_MARINO);
                c.setPadding(5);
                c.setBorder(Rectangle.NO_BORDER);
                tabla.addCell(c);
            }
            short elementoActual = -1;
            boolean alterna = false;
            for (CuentaContable cta : ctx.cuentas()) {
                if (cta.getElemento().getNumero() != elementoActual) {
                    elementoActual = cta.getElemento().getNumero();
                    PdfPCell c = new PdfPCell(new Phrase("ELEMENTO " + elementoActual + ": " + cta.getElemento().getDenominacion(), fElemento));
                    c.setColspan(5);
                    c.setPaddingTop(8);
                    c.setPaddingBottom(4);
                    c.setBorder(Rectangle.BOTTOM);
                    c.setBorderColor(AZUL_MARINO);
                    tabla.addCell(c);
                }
                Font f = !cta.isActiva() ? fInactiva : cta.getNivel() == 2 ? fNegrita : fNormal;
                Color fondo = alterna ? GRIS_FILA : Color.WHITE;
                alterna = !alterna;
                tabla.addCell(celdaPdf(cta.getCodigo(), f, fondo, 0));
                String denominacion = cta.getDenominacion() + (cta.getObservacionFuente() != null ? "  (*)" : "");
                tabla.addCell(celdaPdf(denominacion, f, fondo, (cta.getNivel() - 2) * 10f));
                tabla.addCell(celdaPdf(cta.getTipoNivel().etiqueta(), f, fondo, 0));
                tabla.addCell(celdaPdf(etiquetaOrigen(cta.getOrigen()), f, fondo, 0));
                tabla.addCell(celdaPdf(cta.isActiva() ? "Activa" : "Inactiva", f, fondo, 0));
            }
            doc.add(tabla);
            if (ctx.cuentas().stream().anyMatch(c -> c.getObservacionFuente() != null)) {
                Paragraph nota = new Paragraph("(*) Cuenta con observación sobre la fuente (errata tipográfica documentada). "
                        + "Consulte el detalle de la cuenta en el sistema.", fMeta);
                nota.setSpacingBefore(8);
                doc.add(nota);
            }
            doc.close();
            return salida.toByteArray();
        } catch (DocumentException e) {
            throw new IllegalStateException("No se pudo generar el PDF", e);
        }
    }

    private static PdfPCell celdaPdf(String texto, Font f, Color fondo, float sangria) {
        PdfPCell c = new PdfPCell(new Phrase(texto, f));
        c.setBackgroundColor(fondo);
        c.setBorder(Rectangle.NO_BORDER);
        c.setPaddingTop(3);
        c.setPaddingBottom(3);
        c.setPaddingLeft(4 + sangria);
        return c;
    }

    private static Font fuente(float tamano, int estilo, Color color) {
        return FontFactory.getFont(FontFactory.HELVETICA, BaseFont.CP1252, BaseFont.NOT_EMBEDDED, tamano, estilo, color);
    }

    private static final class PiePagina extends PdfPageEventHelper {
        private final Contexto ctx;
        private final Font f = fuente(7.5f, Font.NORMAL, GRIS_TEXTO);

        PiePagina(Contexto ctx) {
            this.ctx = ctx;
        }

        @Override
        public void onEndPage(PdfWriter writer, Document document) {
            String izquierda = "CONTABILIDAD · " + ctx.version().getNombre() + " · Generado el "
                    + ctx.generado().format(FECHA_HORA) + " por " + ctx.usuario();
            ColumnText.showTextAligned(writer.getDirectContent(), Element.ALIGN_LEFT, new Phrase(izquierda, f),
                    document.left(), document.bottom() - 20, 0);
            ColumnText.showTextAligned(writer.getDirectContent(), Element.ALIGN_RIGHT,
                    new Phrase("Página " + writer.getPageNumber(), f), document.right(), document.bottom() - 20, 0);
        }
    }

    // ------------------------------------------------------------------ CSV

    /** CSV en el mismo formato que acepta la importación (incluye filas de elementos con código de un dígito). */
    private byte[] csv(Contexto ctx) {
        ByteArrayOutputStream salida = new ByteArrayOutputStream();
        try (var escritor = new OutputStreamWriter(salida, StandardCharsets.UTF_8);
             CSVPrinter csv = new CSVPrinter(escritor, CSVFormat.DEFAULT.builder()
                     .setHeader("codigo", "denominacion", "descripcion", "nivel", "elemento", "codigo_padre", "origen",
                             "estado", "codigo_fuente", "observacion_fuente")
                     .get())) {
            escritor.write('﻿'); // BOM: Excel reconoce el archivo como UTF-8
            short elementoActual = -1;
            for (CuentaContable c : ctx.cuentas()) {
                if (c.getElemento().getNumero() != elementoActual) {
                    elementoActual = c.getElemento().getNumero();
                    csv.printRecord(elementoActual, c.getElemento().getDenominacion(), "", "Elemento", elementoActual, "", "", "", "", "");
                }
                csv.printRecord(c.getCodigo(), c.getDenominacion(), valor(c.getDescripcion()), c.getTipoNivel().etiqueta(),
                        c.getElemento().getNumero(), c.getNivel() > 2 ? c.getCodigo().substring(0, c.getNivel() - 1) : "",
                        c.getOrigen().name(), c.isActiva() ? "ACTIVA" : "INACTIVA", valor(c.getCodigoFuente()),
                        valor(c.getObservacionFuente()));
            }
        } catch (IOException e) {
            throw new UncheckedIOException("No se pudo generar el CSV", e);
        }
        return salida.toByteArray();
    }

    // ------------------------------------------------------------------ apoyo

    private static String valor(String s) {
        return s == null ? "" : s;
    }

    private static String etiquetaOrigen(OrigenCuenta o) {
        return switch (o) {
            case OFICIAL -> "Oficial";
            case IMPORTADA -> "Importada";
            case PERSONALIZADA -> "Personalizada";
        };
    }

    private static String describirFiltros(FiltroCuentas f) {
        List<String> partes = new ArrayList<>();
        if (TextoUtil.limpiar(f.termino()) != null) partes.add("búsqueda \"" + f.termino().trim() + "\"");
        if (f.elemento() != null) partes.add("elemento " + f.elemento());
        if (f.nivel() != null) partes.add("nivel " + f.nivel() + " dígitos");
        if (f.estado() != null && f.estado() != FiltroCuentas.EstadoFiltro.TODAS) partes.add(f.estado().name().toLowerCase());
        if (f.origen() != null) partes.add("origen " + f.origen().name().toLowerCase());
        if (Boolean.TRUE.equals(f.conObservacion())) partes.add("con observación de la fuente");
        return partes.isEmpty() ? "ninguno (catálogo completo)" : String.join(", ", partes);
    }
}
