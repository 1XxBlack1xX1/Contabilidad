package pe.contabilidad.entity;

public enum EstadoAsiento {
    /** Asiento válido: forma parte de los libros y reportes. */
    REGISTRADO,
    /** Asiento anulado con motivo: se conserva para la trazabilidad, pero no afecta saldos. */
    ANULADO
}
