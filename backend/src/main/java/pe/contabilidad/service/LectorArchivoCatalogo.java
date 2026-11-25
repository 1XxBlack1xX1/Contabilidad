package pe.contabilidad.service;

import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.springframework.stereotype.Component;
import pe.contabilidad.exception.ReglaNegocioException;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Lee archivos de catálogo en formato CSV (separado por coma o punto y coma, UTF-8)
 * o Excel (.xlsx, primera hoja). La primera fila debe contener los encabezados
 * {@code codigo} y {@code denominacion}; {@code descripcion} es opcional.
 */
@Component
public class LectorArchivoCatalogo {

    static final int FILAS_MAXIMAS = 20_000;

    /** Fila leída del archivo, con su número de fila original (1 = encabezado). */
    public record Fila(int numero, String codigo, String denominacion, String descripcion, boolean codigoNumericoEnExcel) {
    }

    public record Lectura(List<Fila> filas, List<String> columnasIgnoradas) {
    }

    public Lectura leer(String nombreArchivo, byte[] contenido) {
        String nombre = nombreArchivo == null ? "" : nombreArchivo.toLowerCase(Locale.ROOT);
        if (nombre.endsWith(".xlsx")) {
            return leerExcel(contenido);
        }
        if (nombre.endsWith(".csv") || nombre.endsWith(".txt")) {
            return leerCsv(contenido);
        }
        throw new ReglaNegocioException("archivo", "Formato no admitido. Use un archivo Excel (.xlsx) o CSV (.csv).");
    }

    private Lectura leerCsv(byte[] contenido) {
        String texto = new String(contenido, StandardCharsets.UTF_8);
        if (texto.startsWith("﻿")) {
            texto = texto.substring(1);
        }
        String primeraLinea = texto.lines().findFirst().orElse("");
        char separador = primeraLinea.chars().filter(c -> c == ';').count() > primeraLinea.chars().filter(c -> c == ',').count() ? ';' : ',';
        try (Reader r = new InputStreamReader(new ByteArrayInputStream(texto.getBytes(StandardCharsets.UTF_8)), StandardCharsets.UTF_8);
             CSVParser parser = CSVFormat.DEFAULT.builder().setDelimiter(separador).setIgnoreEmptyLines(true).setTrim(true).get().parse(r)) {
            List<CSVRecord> registros = parser.getRecords();
            if (registros.isEmpty()) {
                throw new ReglaNegocioException("archivo", "El archivo está vacío.");
            }
            List<String> encabezados = new ArrayList<>();
            registros.getFirst().forEach(encabezados::add);
            Map<String, Integer> indices = indices(encabezados);
            List<String> ignoradas = ignoradas(encabezados, indices);
            List<Fila> filas = new ArrayList<>();
            for (int i = 1; i < registros.size(); i++) {
                CSVRecord reg = registros.get(i);
                filas.add(new Fila((int) reg.getRecordNumber(), valor(reg, indices.get("codigo")),
                        valor(reg, indices.get("denominacion")), valor(reg, indices.get("descripcion")), false));
                verificarLimite(filas.size());
            }
            return new Lectura(filas, ignoradas);
        } catch (IOException | IllegalArgumentException e) {
            throw new ReglaNegocioException("archivo", "No se pudo leer el archivo CSV. Verifique que esté codificado en UTF-8.");
        }
    }

    private Lectura leerExcel(byte[] contenido) {
        DataFormatter formato = new DataFormatter(Locale.ROOT);
        try (Workbook libro = WorkbookFactory.create(new ByteArrayInputStream(contenido))) {
            Sheet hoja = libro.getSheetAt(0);
            Row cabecera = hoja.getRow(hoja.getFirstRowNum());
            if (cabecera == null) {
                throw new ReglaNegocioException("archivo", "La hoja de cálculo está vacía.");
            }
            List<String> encabezados = new ArrayList<>();
            for (int c = 0; c < cabecera.getLastCellNum(); c++) {
                encabezados.add(formato.formatCellValue(cabecera.getCell(c)).trim());
            }
            Map<String, Integer> indices = indices(encabezados);
            List<String> ignoradas = ignoradas(encabezados, indices);
            List<Fila> filas = new ArrayList<>();
            for (int r = hoja.getFirstRowNum() + 1; r <= hoja.getLastRowNum(); r++) {
                Row fila = hoja.getRow(r);
                if (fila == null) {
                    continue;
                }
                Cell celdaCodigo = fila.getCell(indices.get("codigo"));
                String codigo = formato.formatCellValue(celdaCodigo).trim();
                String denominacion = celda(formato, fila, indices.get("denominacion"));
                if (codigo.isEmpty() && denominacion.isEmpty()) {
                    continue;
                }
                boolean numerico = celdaCodigo != null && celdaCodigo.getCellType() == CellType.NUMERIC;
                filas.add(new Fila(r + 1, codigo, denominacion, celda(formato, fila, indices.get("descripcion")), numerico));
                verificarLimite(filas.size());
            }
            return new Lectura(filas, ignoradas);
        } catch (IOException | RuntimeException e) {
            if (e instanceof ReglaNegocioException rn) {
                throw rn;
            }
            throw new ReglaNegocioException("archivo", "No se pudo leer el archivo Excel. Verifique que sea un .xlsx válido.");
        }
    }

    private static Map<String, Integer> indices(List<String> encabezados) {
        Map<String, Integer> indices = new HashMap<>();
        for (int i = 0; i < encabezados.size(); i++) {
            String clave = TextoUtil.normalizar(encabezados.get(i)).replace(' ', '_');
            if (List.of("codigo", "denominacion", "descripcion").contains(clave)) {
                indices.putIfAbsent(clave, i);
            }
        }
        if (!indices.containsKey("codigo") || !indices.containsKey("denominacion")) {
            throw new ReglaNegocioException("archivo",
                    "La primera fila debe contener los encabezados 'codigo' y 'denominacion' (opcional: 'descripcion').");
        }
        return indices;
    }

    private static List<String> ignoradas(List<String> encabezados, Map<String, Integer> indices) {
        List<String> ignoradas = new ArrayList<>();
        for (int i = 0; i < encabezados.size(); i++) {
            if (!indices.containsValue(i) && !encabezados.get(i).isBlank()) {
                ignoradas.add(encabezados.get(i));
            }
        }
        return ignoradas;
    }

    private static String valor(CSVRecord reg, Integer indice) {
        return indice == null || indice >= reg.size() ? "" : reg.get(indice).trim();
    }

    private static String celda(DataFormatter formato, Row fila, Integer indice) {
        return indice == null ? "" : formato.formatCellValue(fila.getCell(indice)).trim();
    }

    private static void verificarLimite(int filas) {
        if (filas > FILAS_MAXIMAS) {
            throw new ReglaNegocioException("archivo", "El archivo supera el máximo de " + FILAS_MAXIMAS + " filas.");
        }
    }
}
