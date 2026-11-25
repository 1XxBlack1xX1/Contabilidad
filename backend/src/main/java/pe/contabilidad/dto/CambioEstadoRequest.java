package pe.contabilidad.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Activación o desactivación de una cuenta. Al desactivar, también se desactivan sus subcuentas. */
public record CambioEstadoRequest(
        @NotNull(message = "Indique el nuevo estado")
        Boolean activa,

        @NotBlank(message = "Indique el motivo del cambio")
        @Size(min = 5, max = 500, message = "El motivo debe tener entre 5 y 500 caracteres")
        String motivo) {
}
