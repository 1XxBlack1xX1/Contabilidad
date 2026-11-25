package pe.contabilidad.service;

import java.text.Normalizer;
import java.util.Locale;
import java.util.regex.Pattern;

/** Utilidades de texto compartidas por las búsquedas y validaciones. */
public final class TextoUtil {

    private static final Pattern DIACRITICOS = Pattern.compile("\\p{M}+");
    private static final Pattern ESPACIOS = Pattern.compile("\\s+");
    private static final Pattern SOLO_DIGITOS = Pattern.compile("^[0-9]+$");

    private TextoUtil() {
    }

    /** Minúsculas y sin tildes; equivale a la función f_normalizar de la base de datos. */
    public static String normalizar(String texto) {
        if (texto == null) {
            return "";
        }
        String sinTildes = DIACRITICOS.matcher(Normalizer.normalize(texto, Normalizer.Form.NFD)).replaceAll("");
        return ESPACIOS.matcher(sinTildes.toLowerCase(Locale.ROOT)).replaceAll(" ").trim();
    }

    /** Recorta y colapsa espacios internos; devuelve {@code null} si queda vacío. */
    public static String limpiar(String texto) {
        if (texto == null) {
            return null;
        }
        String limpio = ESPACIOS.matcher(texto).replaceAll(" ").trim();
        return limpio.isEmpty() ? null : limpio;
    }

    public static boolean esCodigo(String texto) {
        return texto != null && SOLO_DIGITOS.matcher(texto).matches();
    }

    /** Escapa los comodines de LIKE para que el término se busque literalmente. */
    public static String escaparLike(String texto) {
        return texto.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}
