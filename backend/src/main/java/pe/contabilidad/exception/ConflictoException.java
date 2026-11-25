package pe.contabilidad.exception;

/** El recurso ya existe o fue modificado por otra persona (HTTP 409). */
public class ConflictoException extends RuntimeException {

    public ConflictoException(String mensaje) {
        super(mensaje);
    }
}
