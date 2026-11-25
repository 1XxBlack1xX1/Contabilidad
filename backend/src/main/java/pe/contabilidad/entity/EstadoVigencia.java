package pe.contabilidad.entity;

/** Estado de vigencia de una versión, calculado a partir de sus fechas. */
public enum EstadoVigencia {
    VIGENTE("Vigente"),
    POR_ENTRAR_EN_VIGENCIA("Aprobada, aún no obligatoria"),
    DEROGADA("Derogada"),
    NO_OFICIAL("Catálogo importado (no oficial)"),
    SIN_FECHA("Vigencia no documentada");

    private final String etiqueta;

    EstadoVigencia(String etiqueta) {
        this.etiqueta = etiqueta;
    }

    public String etiqueta() {
        return etiqueta;
    }
}
