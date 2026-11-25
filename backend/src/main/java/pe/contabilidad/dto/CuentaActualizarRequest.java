package pe.contabilidad.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import pe.contabilidad.entity.Naturaleza;

/** Datos editables de una cuenta personalizada. El código no se modifica una vez creado. */
public record CuentaActualizarRequest(
        @NotBlank(message = "Indique la denominación de la cuenta")
        @Size(max = 300, message = "La denominación no puede superar los 300 caracteres")
        String denominacion,

        @Size(max = 2000, message = "La descripción no puede superar los 2000 caracteres")
        String descripcion,

        Naturaleza naturaleza,

        @NotNull(message = "Falta la versión del registro (control de concurrencia)")
        Integer versionRegistro) {
}
