package pe.contabilidad.entity;

/** Procedencia de una cuenta dentro de una versión del catálogo. */
public enum OrigenCuenta {
    /** Transcrita del documento oficial del PCGE. Protegida contra modificaciones. */
    OFICIAL,
    /** Cargada desde un archivo importado por un administrador. Protegida contra modificaciones. */
    IMPORTADA,
    /** Creada por la entidad usuaria. Puede editarse. */
    PERSONALIZADA;

    public boolean esProtegida() {
        return this != PERSONALIZADA;
    }
}
