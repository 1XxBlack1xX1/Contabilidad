package pe.contabilidad.service;

import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFColor;
import org.apache.poi.xssf.usermodel.XSSFFont;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
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
import org.springframework.stereotype.Component;
import pe.contabilidad.service.ReporteTabular.Columna;
import pe.contabilidad.service.ReporteTabular.Estilo;
import pe.contabilidad.service.ReporteTabular.Fila;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.util.Locale;

/** Convierte un {@link ReporteTabular} en un archivo Excel o PDF con la identidad visual del sistema. */
@Component
public class ExportadorReportes {

    private static final Color AZUL_MARINO = new Color(0x10, 0x24, 0x3A);
    private static final Color GRIS_FILA = new Color(0xF5, 0xF7, 0xFA);
    private static final Color GRIS_TEXTO = new Color(0x64, 0x74, 0x8B);
    private static final Color FONDO_GRUPO = new Color(0xEF, 0xF4, 0xFF);

    public byte[] excel(ReporteTabular r) {
        try (XSSFWorkbook libro = new XSSFWorkbook(); ByteArrayOutputStream salida = new ByteArrayOutputStream()) {
            Sheet hoja = libro.createSheet(r.titulo().length() > 31 ? r.titulo().substring(0, 31) : r.titulo());
            XSSFFont titulo = libro.createFont();
            titulo.setBold(true);
            titulo.setFontHeightInPoints((short) 14);
            titulo.setColor(new XSSFColor(AZUL_MARINO, null));
            XSSFFont gris = libro.createFont();
            gris.setColor(new XSSFColor(GRIS_TEXTO, null));
            gris.setFontHeightInPoints((short) 9);
            XSSFFont blanca = libro.createFont();
            blanca.setBold(true);
            blanca.setColor(IndexedColors.WHITE.getIndex());
            XSSFFont negrita = libro.createFont();
            negrita.setBold(true);

            CellStyle estTitulo = libro.createCellStyle();
            estTitulo.setFont(titulo);
            CellStyle estMeta = libro.createCellStyle();
            estMeta.setFont(gris);
            XSSFCellStyle estCab = libro.createCellStyle();
            estCab.setFont(blanca);
            estCab.setFillForegroundColor(new XSSFColor(AZUL_MARINO, null));
            estCab.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            short formatoMoneda = libro.createDataFormat().getFormat("#,##0.00;-#,##0.00;\"\"");

            CellStyle[][] estilos = new CellStyle[3][2]; // [estilo][importe]
            for (Estilo e : Estilo.values()) {
                for (int imp = 0; imp < 2; imp++) {
                    XSSFCellStyle s = libro.createCellStyle();
                    if (imp == 1) {
                        s.setDataFormat(formatoMoneda);
                        s.setAlignment(HorizontalAlignment.RIGHT);
                    }
                    if (e != Estilo.NORMAL) s.setFont(negrita);
                    if (e == Estilo.GRUPO) {
                        s.setFillForegroundColor(new XSSFColor(FONDO_GRUPO, null));
                        s.setFillPattern(FillPatternType.SOLID_FOREGROUND);
                    }
                    if (e == Estilo.TOTAL) {
                        s.setBorderTop(BorderStyle.THIN);
                        s.setBorderBottom(BorderStyle.DOUBLE);
                    }
                    estilos[e.ordinal()][imp] = s;
                }
            }

            int f = 0;
            celda(hoja.createRow(f++), 0, r.titulo(), estTitulo);
            for (String linea : r.encabezado()) celda(hoja.createRow(f++), 0, linea, estMeta);
            f++;
            Row cab = hoja.createRow(f++);
            for (int i = 0; i < r.columnas().size(); i++) celda(cab, i, r.columnas().get(i).titulo(), estCab);
            hoja.createFreezePane(0, f);
            for (Fila fila : r.filas()) {
                Row row = hoja.createRow(f++);
                for (int i = 0; i < fila.celdas().size(); i++) {
                    Object valor = fila.celdas().get(i);
                    boolean imp = r.columnas().get(i).importe();
                    CellStyle est = estilos[fila.estilo().ordinal()][imp ? 1 : 0];
                    Cell c = row.createCell(i);
                    if (valor instanceof BigDecimal bd) c.setCellValue(bd.doubleValue());
                    else if (valor != null) c.setCellValue((i == 1 && fila.sangria() > 0 ? "   ".repeat(fila.sangria()) : "") + valor);
                    c.setCellStyle(est);
                }
            }
            if (r.nota() != null) {
                f++;
                celda(hoja.createRow(f), 0, r.nota(), estMeta);
            }
            for (int i = 0; i < r.columnas().size(); i++) hoja.setColumnWidth(i, (int) (r.columnas().get(i).ancho() * 256));
            libro.write(salida);
            return salida.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException("No se pudo generar el Excel", e);
        }
    }

    public byte[] pdf(ReporteTabular r) {
        ByteArrayOutputStream salida = new ByteArrayOutputStream();
        Document doc = new Document(PageSize.A4.rotate(), 32, 32, 36, 40);
        try {
            PdfWriter escritor = PdfWriter.getInstance(doc, salida);
            Font fPie = fuente(7.5f, Font.NORMAL, GRIS_TEXTO);
            escritor.setPageEvent(new PdfPageEventHelper() {
                @Override
                public void onEndPage(PdfWriter w, Document d) {
                    ColumnText.showTextAligned(w.getDirectContent(), Element.ALIGN_LEFT, new Phrase("CONTABILIDAD · " + r.titulo(), fPie),
                            d.left(), d.bottom() - 18, 0);
                    ColumnText.showTextAligned(w.getDirectContent(), Element.ALIGN_RIGHT, new Phrase("Página " + w.getPageNumber(), fPie),
                            d.right(), d.bottom() - 18, 0);
                }
            });
            doc.addTitle(r.titulo());
            doc.open();
            doc.add(new Paragraph(r.titulo(), fuente(14, Font.BOLD, AZUL_MARINO)));
            Paragraph meta = new Paragraph();
            meta.setLeading(11.5f);
            meta.setSpacingAfter(8);
            r.encabezado().forEach(l -> meta.add(new Phrase(l + "\n", fuente(8.5f, Font.NORMAL, GRIS_TEXTO))));
            doc.add(meta);

            float[] anchos = new float[r.columnas().size()];
            for (int i = 0; i < anchos.length; i++) anchos[i] = r.columnas().get(i).ancho();
            PdfPTable tabla = new PdfPTable(anchos);
            tabla.setWidthPercentage(100);
            tabla.setHeaderRows(1);
            for (Columna c : r.columnas()) {
                PdfPCell cel = new PdfPCell(new Phrase(c.titulo(), fuente(8, Font.BOLD, Color.WHITE)));
                cel.setBackgroundColor(AZUL_MARINO);
                cel.setBorder(Rectangle.NO_BORDER);
                cel.setPadding(4.5f);
                if (c.importe()) cel.setHorizontalAlignment(Element.ALIGN_RIGHT);
                tabla.addCell(cel);
            }
            boolean alterna = false;
            for (Fila fila : r.filas()) {
                Font fuente = fuente(8, fila.estilo() == Estilo.NORMAL ? Font.NORMAL : Font.BOLD,
                        fila.estilo() == Estilo.GRUPO ? AZUL_MARINO : Color.BLACK);
                Color fondo = fila.estilo() == Estilo.GRUPO ? FONDO_GRUPO : alterna ? GRIS_FILA : Color.WHITE;
                if (fila.estilo() == Estilo.NORMAL) alterna = !alterna;
                for (int i = 0; i < fila.celdas().size(); i++) {
                    Object v = fila.celdas().get(i);
                    boolean imp = r.columnas().get(i).importe();
                    PdfPCell cel = new PdfPCell(new Phrase(v instanceof BigDecimal bd ? moneda(bd) : v == null ? "" : v.toString(), fuente));
                    cel.setBackgroundColor(fondo);
                    cel.setBorder(fila.estilo() == Estilo.TOTAL ? Rectangle.TOP : Rectangle.NO_BORDER);
                    cel.setPaddingTop(2.5f);
                    cel.setPaddingBottom(3);
                    cel.setPaddingLeft(4 + (i == 1 ? fila.sangria() * 9f : 0));
                    if (imp) cel.setHorizontalAlignment(Element.ALIGN_RIGHT);
                    tabla.addCell(cel);
                }
            }
            doc.add(tabla);
            if (r.nota() != null) {
                Paragraph nota = new Paragraph(r.nota(), fuente(8, Font.NORMAL, GRIS_TEXTO));
                nota.setSpacingBefore(8);
                doc.add(nota);
            }
            doc.close();
            return salida.toByteArray();
        } catch (DocumentException e) {
            throw new IllegalStateException("No se pudo generar el PDF", e);
        }
    }

    /** Formato peruano: 1,234.56; los ceros se muestran vacíos para facilitar la lectura. */
    static String moneda(BigDecimal valor) {
        if (valor.signum() == 0) return "";
        DecimalFormat f = new DecimalFormat("#,##0.00;-#,##0.00", DecimalFormatSymbols.getInstance(Locale.US));
        return f.format(valor);
    }

    private static void celda(Row fila, int col, String valor, CellStyle estilo) {
        Cell c = fila.createCell(col);
        c.setCellValue(valor);
        c.setCellStyle(estilo);
    }

    private static Font fuente(float tamano, int estilo, Color color) {
        return FontFactory.getFont(FontFactory.HELVETICA, BaseFont.CP1252, BaseFont.NOT_EMBEDDED, tamano, estilo, color);
    }
}
