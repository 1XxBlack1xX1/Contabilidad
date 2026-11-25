package pe.contabilidad.dto;

import pe.contabilidad.entity.OrigenCuenta;

/**
 * Filtros del catálogo. Todos son opcionales.
 *
 * @param version  código de la versión (p. ej. PCGE_2019); si se omite se usa la predeterminada
 * @param termino  código (prefijo) o parte de la denominación, sin distinguir tildes ni mayúsculas
 * @param elemento número de elemento (0-9)
 * @param nivel    cantidad de dígitos (2-10)
 * @param estado   ACTIVAS, INACTIVAS o TODAS
 * @param origen   OFICIAL, IMPORTADA o PERSONALIZADA
 * @param conObservacion solo cuentas con observación sobre la fuente (erratas documentadas)
 */
public record FiltroCuentas(String version, String termino, Short elemento, Integer nivel, EstadoFiltro estado,
                            OrigenCuenta origen, Boolean conObservacion) {

    public enum EstadoFiltro { ACTIVAS, INACTIVAS, TODAS }

    public FiltroCuentas conVersion(String codigoVersion) {
        return new FiltroCuentas(codigoVersion, termino, elemento, nivel, estado, origen, conObservacion);
    }
}
