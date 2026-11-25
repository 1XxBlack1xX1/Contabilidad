package pe.contabilidad.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.Set;

/** Datos editables de un usuario. {@code nuevaPassword} es opcional. */
public record UsuarioActualizarRequest(
        @NotBlank(message = "Indique el nombre completo") @Size(max = 150)
        String nombreCompleto,

        @NotBlank(message = "Indique el correo electrónico") @Email(message = "Correo electrónico no válido") @Size(max = 150)
        String email,

        @NotEmpty(message = "Asigne al menos un rol")
        Set<String> roles,

        @NotNull
        Boolean activo,

        @Size(min = 12, max = 128, message = "La contraseña debe tener entre 12 y 128 caracteres")
        String nuevaPassword) {

    @Override
    public String toString() {
        return "UsuarioActualizarRequest[roles=" + roles + ", activo=" + activo + "]";
    }
}
