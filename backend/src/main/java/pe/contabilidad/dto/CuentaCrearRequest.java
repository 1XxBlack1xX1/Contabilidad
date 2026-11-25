package pe.contabilidad.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import pe.contabilidad.entity.Naturaleza;

/** Datos para registrar una cuenta personalizada. */
public record CuentaCrearRequest(
        @NotBlank(message = "Indique la versión del plan contable")
        String version,

        @NotBlank(message = "Indique el código de la cuenta")
        @Pattern(regexp = "^[0-9]{2,10}$", message = "El código debe tener entre 2 y 10 dígitos numéricos")
        String codigo,

        @NotBlank(message = "Indique la denominación de la cuenta")
        @Size(max = 300, message = "La denominación no puede superar los 300 caracteres")
        String denominacion,

        @Size(max = 2000, message = "La descripción no puede superar los 2000 caracteres")
        String descripcion,

        Naturaleza naturaleza) {
}
