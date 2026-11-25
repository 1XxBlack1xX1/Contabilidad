package pe.contabilidad.exception;

/** Intento de modificar una cuenta del catálogo oficial o importado (HTTP 403). */
public class CuentaProtegidaException extends RuntimeException {

    public CuentaProtegidaException(String codigo) {
        super("La cuenta " + codigo + " pertenece al catálogo oficial y está protegida. "
                + "Solo puede activarse o desactivarse; para adaptarla, registre una subcuenta personalizada.");
    }
}
