package pe.contabilidad.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.Set;

public record UsuarioCrearRequest(
        @NotBlank(message = "Indique el nombre de usuario")
        @Pattern(regexp = "^[a-z0-9._-]{3,60}$", message = "Use de 3 a 60 caracteres: minúsculas, números, punto, guion o guion bajo")
        String usuario,

        @NotBlank(message = "Indique el nombre completo") @Size(max = 150)
        String nombreCompleto,

        @NotBlank(message = "Indique el correo electrónico") @Email(message = "Correo electrónico no válido") @Size(max = 150)
        String email,

        @NotBlank(message = "Indique una contraseña")
        @Size(min = 12, max = 128, message = "La contraseña debe tener entre 12 y 128 caracteres")
        String password,

        @NotEmpty(message = "Asigne al menos un rol")
        Set<String> roles) {

    @Override
    public String toString() {
        return "UsuarioCrearRequest[usuario=" + usuario + ", roles=" + roles + "]";
    }
}
