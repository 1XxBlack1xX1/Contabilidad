package pe.contabilidad.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequest(
        @NotBlank(message = "Ingrese su usuario o correo") @Size(max = 150) String usuario,
        @NotBlank(message = "Ingrese su contraseña") @Size(max = 128) String password) {

    /** Nunca incluir la contraseña en representaciones de texto (logs). */
    @Override
    public String toString() {
        return "LoginRequest[usuario=" + usuario + "]";
    }
}
