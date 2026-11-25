package pe.contabilidad.dto;

import java.util.List;

public record UsuarioSesionDto(Long id, String usuario, String nombreCompleto, String email, List<String> roles,
                               List<String> permisos) {
}
