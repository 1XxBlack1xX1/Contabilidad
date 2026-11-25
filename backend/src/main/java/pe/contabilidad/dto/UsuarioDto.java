package pe.contabilidad.dto;

import java.time.Instant;
import java.util.List;

public record UsuarioDto(Long id, String usuario, String nombreCompleto, String email, boolean activo,
                         List<String> roles, Instant ultimoAcceso, Instant creadoEn) {
}
