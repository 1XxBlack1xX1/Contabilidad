package pe.contabilidad.entity;

/** Denominación del nivel jerárquico según la cantidad de dígitos del código. */
public enum TipoNivel {
    ELEMENTO("Elemento"),
    CUENTA("Cuenta"),
    SUBCUENTA("Subcuenta"),
    DIVISIONARIA("Divisionaria"),
    SUBDIVISIONARIA("Subdivisionaria");

    private final String etiqueta;

    TipoNivel(String etiqueta) {
        this.etiqueta = etiqueta;
    }

    public String etiqueta() {
        return etiqueta;
    }

    public static TipoNivel desdeDigitos(int digitos) {
        return switch (digitos) {
            case 1 -> ELEMENTO;
            case 2 -> CUENTA;
            case 3 -> SUBCUENTA;
            case 4 -> DIVISIONARIA;
            default -> SUBDIVISIONARIA;
        };
    }
}
