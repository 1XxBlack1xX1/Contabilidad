package pe.contabilidad.security;

import pe.contabilidad.entity.Rol;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;

/**
 * Permisos de la aplicación y su asignación a roles.
 * Los controladores verifican permisos (qué se puede hacer), no roles.
 */
public final class Permisos {

    public static final String CATALOGO_CONSULTAR = "CATALOGO_CONSULTAR";
    public static final String CATALOGO_EXPORTAR = "CATALOGO_EXPORTAR";
    public static final String CUENTAS_GESTIONAR = "CUENTAS_GESTIONAR";
    public static final String CATALOGO_IMPORTAR = "CATALOGO_IMPORTAR";
    public static final String USUARIOS_GESTIONAR = "USUARIOS_GESTIONAR";
    public static final String CONFIGURACION_GESTIONAR = "CONFIGURACION_GESTIONAR";
    public static final String CONTABILIDAD_CONSULTAR = "CONTABILIDAD_CONSULTAR";
    public static final String ASIENTOS_REGISTRAR = "ASIENTOS_REGISTRAR";
    public static final String ASIENTOS_ANULAR = "ASIENTOS_ANULAR";

    private static final Map<String, List<String>> POR_ROL = Map.of(
            Rol.ADMINISTRADOR, List.of(CATALOGO_CONSULTAR, CATALOGO_EXPORTAR, CUENTAS_GESTIONAR, CATALOGO_IMPORTAR,
                    USUARIOS_GESTIONAR, CONFIGURACION_GESTIONAR, CONTABILIDAD_CONSULTAR, ASIENTOS_REGISTRAR, ASIENTOS_ANULAR),
            Rol.CONTADOR, List.of(CATALOGO_CONSULTAR, CATALOGO_EXPORTAR, CUENTAS_GESTIONAR, CONTABILIDAD_CONSULTAR,
                    ASIENTOS_REGISTRAR, ASIENTOS_ANULAR),
            Rol.AUXILIAR, List.of(CATALOGO_CONSULTAR, CATALOGO_EXPORTAR, CONTABILIDAD_CONSULTAR, ASIENTOS_REGISTRAR));

    private Permisos() {
    }

    public static Set<String> deRoles(Collection<String> roles) {
        Set<String> permisos = new TreeSet<>();
        roles.forEach(r -> permisos.addAll(POR_ROL.getOrDefault(r, List.of())));
        return permisos;
    }
}
